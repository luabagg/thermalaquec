import { createHash } from "node:crypto";

export const CATALOG_NORMALIZATION_SCHEMA_VERSION = 1 as const;

export type CatalogOptionPlacement = "TITLE" | "DESCRIPTION";
export type SourceDisposition = "PARENT_SOURCE" | "VARIANT" | "USE_PARENT_FALLBACK";
export type CatalogProposalError = { code: string; path: string; message: string };

export type CatalogNormalizationSourceItem = {
  id: number;
  slug: string;
  name: string;
  descriptionLines: string[];
  defaultUnitPriceCents: number | null;
  imageId: number | null;
};

export type CatalogNormalizationSourceSnapshot = {
  schemaVersion: number;
  exportedAt: string;
  items: CatalogNormalizationSourceItem[];
};

export type CatalogNormalizationOptionValue = {
  clientKey: string;
  label: string;
  slug: string;
  titleFragment: string | null;
  descriptionLines: string[];
};

export type CatalogNormalizationOption = {
  clientKey: string;
  name: string;
  slug: string;
  placement: CatalogOptionPlacement;
  values: CatalogNormalizationOptionValue[];
};

export type CatalogNormalizationVariant = {
  clientKey: string;
  valueClientKeys: string[];
  sku: string | null;
  active: boolean;
  nameOverride: string | null;
  descriptionLinesOverride: string[] | null;
  unitPriceCents: number | null;
  imageSourceId: number | null;
};

export type CatalogNormalizationSource = {
  sourceId: number;
  alias: string;
  selectedValueClientKeys: string[];
  priceDisposition: SourceDisposition;
  imageDisposition: SourceDisposition;
};

export type CatalogNormalizationFamily = {
  clientKey: string;
  slug: string;
  name: string;
  nameTemplate: string | null;
  descriptionLines: string[];
  parentPriceSourceId: number;
  parentImageSourceId: number;
  options: CatalogNormalizationOption[];
  variants: CatalogNormalizationVariant[];
  sources: CatalogNormalizationSource[];
};

export type CatalogNormalizationProposal = {
  schemaVersion: number;
  sourceSnapshotDigest: string;
  algorithmVersion: string;
  families: CatalogNormalizationFamily[];
};

export function normalizeCatalogAlias(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(litros?|lts?)\b/g, "l")
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function digestCatalogSource(source: CatalogNormalizationSourceSnapshot) {
  const stable = JSON.stringify({
    schemaVersion: source.schemaVersion,
    items: [...source.items].sort((a, b) => a.id - b.id),
  });
  return createHash("sha256").update(stable).digest("hex");
}

function hasDuplicate(values: string[]) {
  return new Set(values).size !== values.length;
}

function validNullablePrice(value: number | null) {
  return value === null || (Number.isInteger(value) && value >= 0);
}

function sameSelection(left: string[], right: string[]) {
  return left.length === right.length && [...left].sort().every((value, index) => value === [...right].sort()[index]);
}

export function validateCatalogProposal(
  source: CatalogNormalizationSourceSnapshot,
  proposal: CatalogNormalizationProposal,
): { ok: true } | { ok: false; errors: CatalogProposalError[] } {
  const errors: CatalogProposalError[] = [];
  const add = (code: string, path: string, message: string) => errors.push({ code, path, message });
  const sourceById = new Map(source.items.map((item) => [item.id, item]));
  const seenSourceIds = new Set<number>();
  const familyKeys = new Set<string>();
  const familySlugs = new Set<string>();
  const aliases = new Set<string>();
  const skus = new Set<string>();

  if (source.schemaVersion !== CATALOG_NORMALIZATION_SCHEMA_VERSION) {
    add("unsupported_source_schema", "source.schemaVersion", "Source snapshot schema version is unsupported.");
  }
  if (proposal.schemaVersion !== CATALOG_NORMALIZATION_SCHEMA_VERSION) {
    add("unsupported_proposal_schema", "proposal.schemaVersion", "Proposal schema version is unsupported.");
  }
  if (proposal.sourceSnapshotDigest !== digestCatalogSource(source)) {
    add("stale_source_digest", "proposal.sourceSnapshotDigest", "Proposal digest does not match the source snapshot.");
  }
  if (proposal.algorithmVersion.length === 0 || proposal.algorithmVersion.length > 100) {
    add("invalid_field_length", "proposal.algorithmVersion", "Algorithm version must be between 1 and 100 characters.");
  }

  const validateLength = (value: string | null, maximum: number, path: string) => {
    if (value !== null && (value.length === 0 || value.length > maximum)) {
      add("invalid_field_length", path, `Field must be between 1 and ${maximum} characters.`);
    }
  };

  for (const family of proposal.families) {
    const familyPath = `family:${family.clientKey}`;
    if (familyKeys.has(family.clientKey)) add("duplicate_family_key", familyPath, "Family client keys must be unique.");
    familyKeys.add(family.clientKey);
    if (familySlugs.has(family.slug)) add("duplicate_family_slug", familyPath, "Family slugs must be unique.");
    familySlugs.add(family.slug);
    validateLength(family.slug, 100, `${familyPath}/slug`);
    validateLength(family.name, 200, `${familyPath}/name`);
    validateLength(family.nameTemplate, 300, `${familyPath}/nameTemplate`);

    const optionKeys = new Set<string>();
    const optionSlugs = new Set<string>();
    const valuesByReference = new Set<string>();
    const optionByReference = new Map<string, string>();
    for (const option of family.options) {
      const optionPath = `${familyPath}/option:${option.clientKey}`;
      if (optionKeys.has(option.clientKey)) add("duplicate_option_key", optionPath, "Option client keys must be unique within a family.");
      optionKeys.add(option.clientKey);
      if (optionSlugs.has(option.slug)) add("duplicate_option_slug", optionPath, "Option slugs must be unique within a family.");
      optionSlugs.add(option.slug);
      validateLength(option.name, 100, `${optionPath}/name`);
      validateLength(option.slug, 80, `${optionPath}/slug`);
      const valueKeys = new Set<string>();
      const valueSlugs = new Set<string>();
      for (const value of option.values) {
        const valuePath = `${optionPath}/value:${value.clientKey}`;
        if (valueKeys.has(value.clientKey)) add("duplicate_value_key", valuePath, "Value client keys must be unique within an option.");
        valueKeys.add(value.clientKey);
        if (valueSlugs.has(value.slug)) add("duplicate_value_slug", valuePath, "Value slugs must be unique within an option.");
        valueSlugs.add(value.slug);
        validateLength(value.label, 100, `${valuePath}/label`);
        validateLength(value.slug, 80, `${valuePath}/slug`);
        validateLength(value.titleFragment, 150, `${valuePath}/titleFragment`);
        const reference = `${option.clientKey}:${value.clientKey}`;
        valuesByReference.add(reference);
        optionByReference.set(reference, option.clientKey);
      }
    }

    const placeholders = family.nameTemplate?.match(/\{([^{}]+)\}/g) ?? [];
    const invalidPlaceholder = placeholders.some((placeholder) => {
      const name = placeholder.slice(1, -1);
      return name !== "name" && !optionSlugs.has(name);
    });
    if (invalidPlaceholder || (family.nameTemplate !== null && /[{}]/.test(family.nameTemplate.replace(/\{[^{}]+\}/g, "")))) {
      add("invalid_template_placeholder", familyPath, "Templates may contain only {name} and option slug placeholders.");
    }

    const familySourceIds = new Set(family.sources.map(({ sourceId }) => sourceId));
    for (const parent of ["parentPriceSourceId", "parentImageSourceId"] as const) {
      if (!familySourceIds.has(family[parent])) {
        add("parent_source_not_member", `${familyPath}/${parent}`, "Parent source must be mapped by its family.");
      }
    }
    for (const variant of family.variants) {
      const variantPath = `${familyPath}/variant:${variant.clientKey}`;
      if (!validNullablePrice(variant.unitPriceCents)) add("invalid_price", variantPath, "Variant price must be a non-negative integer or null.");
      if (variant.sku !== null) {
        validateLength(variant.sku, 100, `${variantPath}/sku`);
        if (skus.has(variant.sku)) add("duplicate_sku", variantPath, "SKUs must be unique.");
        skus.add(variant.sku);
      }
      const selectedOptions = variant.valueClientKeys.map((reference) => optionByReference.get(reference));
      if (variant.valueClientKeys.some((reference) => !valuesByReference.has(reference))) {
        add("unknown_value_reference", variantPath, "Variant references a value outside its family.");
      }
      if (hasDuplicate(variant.valueClientKeys) || selectedOptions.length !== family.options.length || selectedOptions.some((option) => !option) || hasDuplicate(selectedOptions.filter((option): option is string => option !== undefined))) {
        add("invalid_variant_axis_selection", variantPath, "Variant must select exactly one value from every option axis.");
      }
      if (variant.imageSourceId !== null && !familySourceIds.has(variant.imageSourceId)) {
        add("variant_image_source_not_member", variantPath, "Variant image source must be mapped by its family.");
      }
    }

    for (const mappedSource of family.sources) {
      const sourcePath = `${familyPath}/source:${mappedSource.sourceId}`;
      const sourceItem = sourceById.get(mappedSource.sourceId);
      if (!sourceItem) add("unknown_source", `source:${mappedSource.sourceId}`, "Mapped source ID is absent from the source snapshot.");
      if (seenSourceIds.has(mappedSource.sourceId)) add("duplicate_source", `source:${mappedSource.sourceId}`, "Every source must be mapped exactly once.");
      seenSourceIds.add(mappedSource.sourceId);
      validateLength(mappedSource.alias, 300, `${sourcePath}/alias`);
      const normalizedAlias = normalizeCatalogAlias(mappedSource.alias);
      if (aliases.has(normalizedAlias)) add("duplicate_alias", sourcePath, "Normalized aliases must be unique.");
      aliases.add(normalizedAlias);

      const selectedOptions = mappedSource.selectedValueClientKeys.map((reference) => optionByReference.get(reference));
      if (mappedSource.selectedValueClientKeys.some((reference) => !valuesByReference.has(reference))) {
        add("unknown_value_reference", sourcePath, "Source mapping references a value outside its family.");
      }
      if (hasDuplicate(mappedSource.selectedValueClientKeys) || selectedOptions.length !== family.options.length || selectedOptions.some((option) => !option) || hasDuplicate(selectedOptions.filter((option): option is string => option !== undefined))) {
        add("invalid_source_axis_selection", sourcePath, "Source mapping must select exactly one value from every option axis.");
      }

      const matchingVariant = family.variants.find((variant) => sameSelection(variant.valueClientKeys, mappedSource.selectedValueClientKeys));
      if (sourceItem) {
        if (mappedSource.priceDisposition === "PARENT_SOURCE" && mappedSource.sourceId !== family.parentPriceSourceId) {
          add("price_disposition_mismatch", sourcePath, "Only the declared parent price source may use PARENT_SOURCE.");
        }
        if (mappedSource.priceDisposition === "VARIANT" && (!matchingVariant || matchingVariant.unitPriceCents !== sourceItem.defaultUnitPriceCents)) {
          add("price_disposition_mismatch", sourcePath, "VARIANT price disposition requires a matching variant price.");
        }
        if (mappedSource.imageDisposition === "PARENT_SOURCE" && mappedSource.sourceId !== family.parentImageSourceId) {
          add("image_disposition_mismatch", sourcePath, "Only the declared parent image source may use PARENT_SOURCE.");
        }
        if (mappedSource.imageDisposition === "VARIANT" && (!matchingVariant || matchingVariant.imageSourceId !== mappedSource.sourceId)) {
          add("image_disposition_mismatch", sourcePath, "VARIANT image disposition requires a matching variant image source.");
        }
      }
    }
  }

  for (const sourceItem of source.items) {
    if (!seenSourceIds.has(sourceItem.id)) add("missing_source", `source:${sourceItem.id}`, "Every source snapshot item must be mapped exactly once.");
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}
