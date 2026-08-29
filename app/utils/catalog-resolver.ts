export type CatalogOptionPlacement = "TITLE" | "DESCRIPTION";

export type CatalogSelectionSnapshotEntry = {
  optionSlug: string;
  optionLabel: string;
  valueSlug: string;
  valueLabel: string;
};

export type CatalogOptionValueInput = {
  id: number;
  label: string;
  slug: string;
  titleFragment: string | null;
  descriptionLines: string[];
  sortOrder: number;
};

export type CatalogOptionInput = {
  id: number;
  name: string;
  slug: string;
  placement: CatalogOptionPlacement;
  sortOrder: number;
  values: CatalogOptionValueInput[];
};

export type CatalogVariantInput = {
  id: number;
  key: string;
  active: boolean;
  valueIds: number[];
  nameOverride: string | null;
  descriptionLinesOverride: string[] | null;
  unitPriceCents: number | null;
  imageId: number | null;
};

export type CatalogFamilyInput = {
  id: number;
  slug: string;
  name: string;
  nameTemplate: string | null;
  descriptionLines: string[];
  defaultUnitPriceCents: number | null;
  imageId: number | null;
  options: CatalogOptionInput[];
  variants: CatalogVariantInput[];
};

export type CatalogResolvedDraft = {
  name: string;
  descriptionLines: string[];
  unitPriceCents: number | null;
  imageId: number | null;
  variantId: number | null;
  selectionSnapshot: CatalogSelectionSnapshotEntry[];
};

export type CatalogResolutionError =
  | "missing_option"
  | "duplicate_option"
  | "unknown_value"
  | "unknown_combination"
  | "invalid_template";

export type CatalogResolutionResult =
  | { ok: true; value: CatalogResolvedDraft }
  | { ok: false; error: CatalogResolutionError };

export function catalogVariantKey(valueIds: number[]) {
  return [...valueIds].sort((a, b) => a - b).join("|");
}

type SelectedOptionValue = {
  option: CatalogOptionInput;
  value: CatalogOptionValueInput;
};

function displayTitleValue(value: CatalogOptionValueInput) {
  return value.titleFragment ?? value.label;
}

function normalizedBullet(line: string) {
  return line.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function deduplicateBullets(lines: string[]) {
  const seen = new Set<string>();
  return lines.filter((line) => {
    const normalized = normalizedBullet(line);
    if (seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
}

function composeName(
  family: CatalogFamilyInput,
  selectedValues: Map<number, SelectedOptionValue>,
): string | null {
  if (family.nameTemplate === null) {
    return [
      family.name,
      ...[...selectedValues.values()]
        .filter(({ option }) => option.placement === "TITLE")
        .map(({ value }) => displayTitleValue(value)),
    ]
      .filter(Boolean)
      .join(" ");
  }

  const replacementValues = new Map<string, string>([["name", family.name]]);
  for (const { option, value } of selectedValues.values()) {
    replacementValues.set(option.slug, displayTitleValue(value));
  }

  let invalid = false;
  const expanded = family.nameTemplate.replace(/\{([^{}]+)\}/g, (placeholder, slug: string) => {
    const value = replacementValues.get(slug);
    if (value === undefined) {
      invalid = true;
      return placeholder;
    }
    return value;
  });

  return invalid || /[{}]/.test(expanded) ? null : expanded;
}

export function resolveCatalogSelection(
  family: CatalogFamilyInput,
  selectedValueIds: number[],
): CatalogResolutionResult {
  const options = [...family.options].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  const valuesById = new Map<number, { option: CatalogOptionInput; value: CatalogOptionValueInput }>();
  for (const option of options) {
    for (const value of option.values) {
      valuesById.set(value.id, { option, value });
    }
  }

  const selectedValues = new Map<number, SelectedOptionValue>();
  for (const valueId of selectedValueIds) {
    const selected = valuesById.get(valueId);
    if (!selected) {
      return { ok: false, error: "unknown_value" };
    }
    if (selectedValues.has(selected.option.id)) {
      return { ok: false, error: "duplicate_option" };
    }
    selectedValues.set(selected.option.id, selected);
  }

  if (selectedValues.size !== options.length) {
    return { ok: false, error: "missing_option" };
  }

  const selectedInOrder = options.map((option) => selectedValues.get(option.id)!);
  const selectionKey = catalogVariantKey(selectedValueIds);
  const variant = family.variants.find(({ key }) => key === selectionKey);
  if (family.variants.length > 0 && (!variant || !variant.active)) {
    return { ok: false, error: "unknown_combination" };
  }

  const composedName = composeName(family, selectedValues);
  if (composedName === null) {
    return { ok: false, error: "invalid_template" };
  }

  const composedDescriptionLines = deduplicateBullets([
    ...family.descriptionLines,
    ...selectedInOrder.flatMap(({ option, value }) => {
      if (option.placement !== "DESCRIPTION") {
        return [];
      }
      return value.descriptionLines.length > 0 ? value.descriptionLines : [`${option.name}: ${value.label}`];
    }),
  ]);

  return {
    ok: true,
    value: {
      name: variant?.nameOverride ?? composedName,
      descriptionLines: deduplicateBullets(variant?.descriptionLinesOverride ?? composedDescriptionLines),
      unitPriceCents: variant?.unitPriceCents ?? family.defaultUnitPriceCents,
      imageId: variant?.imageId ?? family.imageId,
      variantId: variant?.id ?? null,
      selectionSnapshot: selectedInOrder.map(({ option, value }) => ({
        optionSlug: option.slug,
        optionLabel: option.name,
        valueSlug: value.slug,
        valueLabel: value.label,
      })),
    },
  };
}
