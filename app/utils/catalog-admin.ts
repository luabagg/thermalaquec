import type { CatalogAggregateInput, CatalogListStatus } from "~/models/catalog.server";
import type { CatalogFamilyInput } from "~/utils/catalog-resolver";

export const STALE_CATALOG_MESSAGE =
  "Este produto foi alterado em outra aba. Recarregue e tente novamente.";

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
      descriptionLinesOverride: variant.descriptionLinesOverride
        ? toStringArray(variant.descriptionLinesOverride)
        : null,
      unitPriceCents: variant.unitPriceCents,
      imageId: variant.imageId,
    })),
  };
}

export function parseCatalogAggregateJson(raw: string): CatalogAggregateInput | { error: string } {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return { error: "JSON inválido" };
    const body = parsed as Record<string, unknown>;
    const id = Number(body.id);
    const expectedUpdatedAt = String(body.expectedUpdatedAt ?? "");
    if (!Number.isFinite(id) || !expectedUpdatedAt) return { error: "Dados inválidos" };

    const familyRaw = body.family as Record<string, unknown> | undefined;
    if (!familyRaw || typeof familyRaw !== "object") return { error: "Família inválida" };

    const family = {
      slug: String(familyRaw.slug ?? "").trim(),
      name: String(familyRaw.name ?? "").trim(),
      nameTemplate: familyRaw.nameTemplate == null ? null : String(familyRaw.nameTemplate),
      descriptionLines: toStringArray(familyRaw.descriptionLines),
      defaultUnitPriceCents:
        familyRaw.defaultUnitPriceCents == null ? null : Number(familyRaw.defaultUnitPriceCents),
      imageId: familyRaw.imageId == null ? null : Number(familyRaw.imageId),
    };

    const options = Array.isArray(body.options)
      ? body.options.map((option, optionIndex) => {
          const row = option as Record<string, unknown>;
          const optionId = row.id == null ? undefined : Number(row.id);
          const values = Array.isArray(row.values)
            ? row.values.map((value, valueIndex) => {
                const valueRow = value as Record<string, unknown>;
                return {
                  id: valueRow.id == null ? undefined : Number(valueRow.id),
                  clientKey: String(valueRow.clientKey ?? `value-${optionIndex}-${valueIndex}`),
                  label: String(valueRow.label ?? "").trim(),
                  slug: String(valueRow.slug ?? "").trim(),
                  titleFragment: valueRow.titleFragment == null ? null : String(valueRow.titleFragment),
                  descriptionLines: toStringArray(valueRow.descriptionLines),
                  sortOrder: Number(valueRow.sortOrder ?? valueIndex),
                };
              })
            : [];
          return {
            id: Number.isFinite(optionId) ? optionId : undefined,
            clientKey: String(row.clientKey ?? `option-${optionIndex}`),
            name: String(row.name ?? "").trim(),
            slug: String(row.slug ?? "").trim(),
            placement: row.placement === "DESCRIPTION" ? ("DESCRIPTION" as const) : ("TITLE" as const),
            sortOrder: Number(row.sortOrder ?? optionIndex),
            values,
          };
        })
      : [];

    const variants = Array.isArray(body.variants)
      ? body.variants.map((variant, variantIndex) => {
          const row = variant as Record<string, unknown>;
          const variantId = row.id == null ? undefined : Number(row.id);
          return {
            id: Number.isFinite(variantId) ? variantId : undefined,
            clientKey: String(row.clientKey ?? `variant-${variantIndex}`),
            valueClientKeys: Array.isArray(row.valueClientKeys)
              ? row.valueClientKeys.map((key) => String(key))
              : [],
            sku: row.sku == null ? null : String(row.sku),
            active: row.active !== false,
            nameOverride: row.nameOverride == null ? null : String(row.nameOverride),
            descriptionLinesOverride:
              row.descriptionLinesOverride == null ? null : toStringArray(row.descriptionLinesOverride),
            unitPriceCents: row.unitPriceCents == null ? null : Number(row.unitPriceCents),
            imageId: row.imageId == null ? null : Number(row.imageId),
          };
        })
      : [];

    return { id, expectedUpdatedAt, family, options, variants };
  } catch {
    return { error: "JSON inválido" };
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
      { status: 409 },
    );
  }
  return Response.json({ error: "Dados inválidos", fields: result.fields ?? {} }, { status: 400 });
}

export function parseIntegerArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => Number(entry)).filter((entry) => Number.isFinite(entry));
}
