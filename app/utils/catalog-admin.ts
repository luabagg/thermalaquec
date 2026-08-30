import type { CatalogAggregateInput, CatalogListStatus } from "~/models/catalog.server";
import type { CatalogFamilyInput } from "~/utils/catalog-resolver";

export const STALE_CATALOG_MESSAGE = "Este produto foi alterado em outra aba. Recarregue e tente novamente.";

export function parseCatalogStatus(value: string | null): CatalogListStatus {
  if (value === "archived" || value === "all") return value;
  return "active";
}

export function toStringArray(value: unknown): string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string") ? value : [];
}

type CatalogDetailRecord = NonNullable<Awaited<ReturnType<typeof import("~/models/catalog.server").getCatalogFamilyDetail>>>;

export function toCatalogFamilyInput(item: CatalogDetailRecord): CatalogFamilyInput {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    nameTemplate: item.nameTemplate,
    descriptionLines: toStringArray(item.descriptionLines),
    defaultUnitPriceCents: item.defaultUnitPriceCents,
    imageId: item.imageId,
    options: item.options.map((option) => ({
      id: option.id,
      name: option.name,
      slug: option.slug,
      placement: option.placement,
      sortOrder: option.sortOrder,
      values: option.values.map((value) => ({
        id: value.id,
        label: value.label,
        slug: value.slug,
        titleFragment: value.titleFragment,
        descriptionLines: toStringArray(value.descriptionLines),
        sortOrder: value.sortOrder,
      })),
    })),
    variants: item.variants.map((variant) => ({
      id: variant.id,
      key: variant.key,
      active: variant.active,
      valueIds: variant.values.map((entry) => entry.optionValueId),
      nameOverride: variant.nameOverride,
      descriptionLinesOverride: variant.descriptionLinesOverride ? toStringArray(variant.descriptionLinesOverride) : null,
      unitPriceCents: variant.unitPriceCents,
      imageId: variant.imageId,
    })),
  };
}

export const MAX_CATALOG_AGGREGATE_BYTES = 256 * 1024;

function finiteNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function translatedCatalogFieldError(message: string): string {
  const translations: Record<string, string> = {
    "Child does not belong to this catalog family":
      "Uma opção, valor ou combinação não pertence a este produto. Recarregue a página e tente novamente.",
    "Duplicate value client key": "Há valores duplicados nas opções. Remova a duplicação e tente novamente.",
    "Value does not belong to its submitted option": "Um valor foi associado à opção errada. Recarregue a página e refaça a alteração.",
    "Variant references an unknown or duplicate value":
      "Uma combinação seleciona um valor inexistente ou repetido. Revise os valores da combinação.",
    "Cannot remove values referenced by retained variants": "Remova também as combinações que usam os valores excluídos.",
    "Invalid timestamp": "A versão do produto é inválida. Recarregue a página e tente novamente.",
  };
  return translations[message] ?? "Revise este campo e tente novamente.";
}

export function parseCatalogAggregateJson(raw: string): CatalogAggregateInput | { error: string } {
  if (new TextEncoder().encode(raw).byteLength > MAX_CATALOG_AGGREGATE_BYTES) {
    return { error: "As alterações excedem o limite permitido. Reduza os textos ou a quantidade de itens." };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return { error: "JSON inválido" };
    const body = parsed as Record<string, unknown>;
    const id = finiteNumber(body.id);
    const expectedUpdatedAt = String(body.expectedUpdatedAt ?? "");
    if (id === null || !expectedUpdatedAt) return { error: "Dados inválidos" };

    const familyRaw = body.family as Record<string, unknown> | undefined;
    if (!familyRaw || typeof familyRaw !== "object") return { error: "Família inválida" };

    const defaultUnitPriceCents = familyRaw.defaultUnitPriceCents == null ? null : finiteNumber(familyRaw.defaultUnitPriceCents);
    const imageId = familyRaw.imageId == null ? null : finiteNumber(familyRaw.imageId);
    if ((familyRaw.defaultUnitPriceCents != null && defaultUnitPriceCents === null) || (familyRaw.imageId != null && imageId === null)) {
      return { error: "Preço ou imagem do produto inválido." };
    }
    const family = {
      slug: String(familyRaw.slug ?? "").trim(),
      name: String(familyRaw.name ?? "").trim(),
      nameTemplate: familyRaw.nameTemplate == null ? null : String(familyRaw.nameTemplate),
      descriptionLines: toStringArray(familyRaw.descriptionLines),
      defaultUnitPriceCents,
      imageId,
    };

    const options = Array.isArray(body.options)
      ? body.options.map((option, optionIndex) => {
          const row = option as Record<string, unknown>;
          const optionId = row.id == null ? undefined : finiteNumber(row.id);
          const optionSortOrder = finiteNumber(row.sortOrder ?? optionIndex);
          if (optionId === null || optionSortOrder === null) throw new Error("invalid-number");
          const values = Array.isArray(row.values)
            ? row.values.map((value, valueIndex) => {
                const valueRow = value as Record<string, unknown>;
                const valueId = valueRow.id == null ? undefined : finiteNumber(valueRow.id);
                const sortOrder = finiteNumber(valueRow.sortOrder ?? valueIndex);
                if (valueId === null || sortOrder === null) throw new Error("invalid-number");
                return {
                  id: valueId,
                  clientKey: String(valueRow.clientKey ?? `value-${optionIndex}-${valueIndex}`),
                  label: String(valueRow.label ?? "").trim(),
                  slug: String(valueRow.slug ?? "").trim(),
                  titleFragment: valueRow.titleFragment == null ? null : String(valueRow.titleFragment),
                  descriptionLines: toStringArray(valueRow.descriptionLines),
                  sortOrder,
                };
              })
            : [];
          return {
            id: optionId,
            clientKey: String(row.clientKey ?? `option-${optionIndex}`),
            name: String(row.name ?? "").trim(),
            slug: String(row.slug ?? "").trim(),
            placement: row.placement === "DESCRIPTION" ? ("DESCRIPTION" as const) : ("TITLE" as const),
            sortOrder: optionSortOrder,
            values,
          };
        })
      : [];

    const variants = Array.isArray(body.variants)
      ? body.variants.map((variant, variantIndex) => {
          const row = variant as Record<string, unknown>;
          const variantId = row.id == null ? undefined : finiteNumber(row.id);
          const unitPriceCents = row.unitPriceCents == null ? null : finiteNumber(row.unitPriceCents);
          const variantImageId = row.imageId == null ? null : finiteNumber(row.imageId);
          if (
            variantId === null ||
            (unitPriceCents === null && row.unitPriceCents != null) ||
            (variantImageId === null && row.imageId != null)
          ) {
            throw new Error("invalid-number");
          }
          return {
            id: variantId,
            clientKey: String(row.clientKey ?? `variant-${variantIndex}`),
            valueClientKeys: Array.isArray(row.valueClientKeys) ? row.valueClientKeys.map((key) => String(key)) : [],
            sku: row.sku == null ? null : String(row.sku),
            active: row.active !== false,
            nameOverride: row.nameOverride == null ? null : String(row.nameOverride),
            descriptionLinesOverride: row.descriptionLinesOverride == null ? null : toStringArray(row.descriptionLinesOverride),
            unitPriceCents,
            imageId: variantImageId,
          };
        })
      : [];

    return { id, expectedUpdatedAt, family, options, variants };
  } catch (error) {
    return {
      error:
        error instanceof Error && error.message === "invalid-number"
          ? "Há campos numéricos inválidos. Revise preços, imagens e ordenação."
          : "JSON inválido",
    };
  }
}

export function catalogMutationErrorResponse(result: {
  ok: false;
  error: "not_found" | "stale" | "invalid" | "referenced";
  fields?: Record<string, string>;
}) {
  if (result.error === "stale") {
    return Response.json({ error: STALE_CATALOG_MESSAGE }, { status: 409 });
  }
  if (result.error === "not_found") {
    return Response.json({ error: "Produto não encontrado" }, { status: 404 });
  }
  if (result.error === "referenced") {
    return Response.json(
      { error: "Este produto não pode ser excluído porque está referenciado em orçamentos ou normalizações." },
      { status: 409 }
    );
  }
  return Response.json(
    {
      error: "Revise os campos destacados.",
      fields: Object.fromEntries(
        Object.entries(result.fields ?? {}).map(([field, message]) => [field, translatedCatalogFieldError(message)])
      ),
    },
    { status: 400 }
  );
}

export function parseIntegerArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is number => typeof entry === "number" && Number.isInteger(entry) && entry > 0,
  );
}
