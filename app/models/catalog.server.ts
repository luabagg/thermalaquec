import { Prisma } from "@prisma/client";

import prisma from "~/libs/prisma/client.server";
import { catalogVariantKey } from "~/utils/catalog-resolver";

export type CatalogListStatus = "active" | "archived" | "all";

export type CatalogAggregateInput = {
  id: number;
  expectedUpdatedAt: string;
  family: {
    slug: string;
    name: string;
    nameTemplate: string | null;
    descriptionLines: string[];
    defaultUnitPriceCents: number | null;
    imageId: number | null;
  };
  options: Array<{
    id?: number;
    clientKey: string;
    name: string;
    slug: string;
    placement: "TITLE" | "DESCRIPTION";
    sortOrder: number;
    values: Array<{
      id?: number;
      clientKey: string;
      label: string;
      slug: string;
      titleFragment: string | null;
      descriptionLines: string[];
      sortOrder: number;
    }>;
  }>;
  variants: Array<{
    id?: number;
    clientKey: string;
    valueClientKeys: string[];
    sku: string | null;
    active: boolean;
    nameOverride: string | null;
    descriptionLinesOverride: string[] | null;
    unitPriceCents: number | null;
    imageId: number | null;
  }>;
};

const catalogSummarySelect = {
  id: true,
  slug: true,
  name: true,
  nameTemplate: true,
  defaultUnitPriceCents: true,
  imageId: true,
  archivedAt: true,
  updatedAt: true,
  Image: { select: { location: true, thumbnail: true } },
  _count: { select: { options: true, variants: true } },
} satisfies Prisma.QuoteCatalogItemSelect;

const catalogDetailInclude = {
  Image: { select: { location: true, thumbnail: true } },
  options: {
    orderBy: [{ sortOrder: "asc" as const }, { id: "asc" as const }],
    include: { values: { orderBy: [{ sortOrder: "asc" as const }, { id: "asc" as const }] } },
  },
  variants: {
    orderBy: { id: "asc" as const },
    include: { values: { select: { optionValueId: true } } },
  },
} satisfies Prisma.QuoteCatalogItemInclude;

export type CatalogMutationResult =
  | { ok: true; item: Awaited<ReturnType<typeof getCatalogFamilyDetail>> }
  | { ok: false; error: "not_found" | "stale" | "invalid" | "referenced"; fields?: Record<string, string> };

function invalid(fields: Record<string, string>): CatalogMutationResult {
  return { ok: false, error: "invalid", fields };
}

function familyData(family: CatalogAggregateInput["family"]) {
  return {
    slug: family.slug.trim(),
    name: family.name.trim(),
    nameTemplate: family.nameTemplate?.trim() || null,
    descriptionLines: family.descriptionLines,
    defaultUnitPriceCents: family.defaultUnitPriceCents,
    imageId: family.imageId,
  };
}

export async function listCatalogSummaries({ status = "active", search }: { status?: CatalogListStatus; search?: string } = {}) {
  return prisma.quoteCatalogItem.findMany({
    where: {
      ...(status === "active" ? { archivedAt: null } : status === "archived" ? { archivedAt: { not: null } } : {}),
      ...(search?.trim() ? { name: { contains: search.trim(), mode: "insensitive" } } : {}),
    },
    orderBy: { name: "asc" },
    select: catalogSummarySelect,
  });
}

export async function getCatalogFamilyDetail(id: number) {
  return prisma.quoteCatalogItem.findUnique({ where: { id }, include: catalogDetailInclude });
}

export async function createCatalogFamily(family: CatalogAggregateInput["family"]) {
  const item = await prisma.quoteCatalogItem.create({ data: familyData(family) });
  return getCatalogFamilyDetail(item.id);
}

export async function updateCatalogFamilyAggregate(input: CatalogAggregateInput): Promise<CatalogMutationResult> {
  const expectedUpdatedAt = new Date(input.expectedUpdatedAt);
  if (Number.isNaN(expectedUpdatedAt.valueOf())) return { ok: false, error: "invalid", fields: { expectedUpdatedAt: "Invalid timestamp" } };

  return prisma.$transaction<CatalogMutationResult>(async (tx) => {
    // This is intentionally the first mutation: it claims the parent version before child writes.
    const claimed = await tx.quoteCatalogItem.updateMany({
      where: { id: input.id, updatedAt: expectedUpdatedAt },
      data: familyData(input.family),
    });
    if (claimed.count === 0) return { ok: false, error: "stale" };

    const existing = await tx.quoteCatalogItem.findUnique({ where: { id: input.id }, include: catalogDetailInclude });
    if (!existing) return { ok: false, error: "not_found" };
    const optionIds = new Set(existing.options.map((option) => option.id));
    const valueIds = new Set(existing.options.flatMap((option) => option.values.map((value) => value.id)));
    const variantIds = new Set(existing.variants.map((variant) => variant.id));
    if (input.options.some((option) => option.id !== undefined && !optionIds.has(option.id)) ||
      input.options.some((option) => option.values.some((value) => value.id !== undefined && !valueIds.has(value.id))) ||
      input.variants.some((variant) => variant.id !== undefined && !variantIds.has(variant.id))) {
      return invalid({ id: "Child does not belong to this catalog family" });
    }

    const valueIdByClientKey = new Map<string, number>();
    const submittedOptionIds = new Set<number>();
    const submittedValueIds = new Set<number>();
    for (const option of input.options) {
      const data = { name: option.name.trim(), slug: option.slug.trim(), placement: option.placement, sortOrder: option.sortOrder };
      const saved = option.id === undefined
        ? await tx.quoteCatalogOption.create({ data: { ...data, catalogItemId: input.id } })
        : await tx.quoteCatalogOption.update({ where: { id: option.id }, data });
      submittedOptionIds.add(saved.id);
      for (const value of option.values) {
        if (valueIdByClientKey.has(value.clientKey)) return invalid({ options: "Duplicate value client key" });
        const valueData = { label: value.label.trim(), slug: value.slug.trim(), titleFragment: value.titleFragment?.trim() || null, descriptionLines: value.descriptionLines, sortOrder: value.sortOrder };
        const savedValue = value.id === undefined
          ? await tx.quoteCatalogOptionValue.create({ data: { ...valueData, optionId: saved.id } })
          : await tx.quoteCatalogOptionValue.update({ where: { id: value.id }, data: valueData });
        submittedValueIds.add(savedValue.id);
        valueIdByClientKey.set(value.clientKey, savedValue.id);
      }
    }

    const submittedVariantIds = new Set<number>();
    for (const variant of input.variants) {
      const valueIdsForVariant = variant.valueClientKeys.map((key) => valueIdByClientKey.get(key));
      if (valueIdsForVariant.some((id) => id === undefined) || new Set(valueIdsForVariant).size !== valueIdsForVariant.length) {
        return invalid({ variants: "Variant references an unknown or duplicate value" });
      }
      const data = { key: catalogVariantKey(valueIdsForVariant as number[]), sku: variant.sku?.trim() || null, active: variant.active, nameOverride: variant.nameOverride?.trim() || null, descriptionLinesOverride: variant.descriptionLinesOverride ?? Prisma.JsonNull, unitPriceCents: variant.unitPriceCents, imageId: variant.imageId };
      const saved = variant.id === undefined
        ? await tx.quoteCatalogVariant.create({ data: { ...data, catalogItemId: input.id } })
        : await tx.quoteCatalogVariant.update({ where: { id: variant.id }, data });
      submittedVariantIds.add(saved.id);
      await tx.quoteCatalogVariantValue.deleteMany({ where: { variantId: saved.id } });
      if (valueIdsForVariant.length) await tx.quoteCatalogVariantValue.createMany({ data: valueIdsForVariant.map((optionValueId) => ({ variantId: saved.id, optionValueId: optionValueId! })) });
    }

    // Remove variants before checking/deleting values, so explicitly removed variants release their values.
    await tx.quoteCatalogVariant.deleteMany({ where: { catalogItemId: input.id, id: { notIn: [...submittedVariantIds] } } });
    const retainedReferences = await tx.quoteCatalogVariantValue.count({ where: { optionValueId: { in: [...valueIds].filter((id) => !submittedValueIds.has(id)) } } });
    if (retainedReferences) return invalid({ options: "Cannot remove values referenced by retained variants" });
    await tx.quoteCatalogOptionValue.deleteMany({ where: { optionId: { in: [...optionIds].filter((id) => !submittedOptionIds.has(id)) } } });
    await tx.quoteCatalogOption.deleteMany({ where: { catalogItemId: input.id, id: { notIn: [...submittedOptionIds] } } });
    return { ok: true, item: await tx.quoteCatalogItem.findUnique({ where: { id: input.id }, include: catalogDetailInclude }) };
  });
}

export async function archiveCatalogFamily(id: number, expectedUpdatedAt: string): Promise<CatalogMutationResult> {
  return updateLifecycle(id, expectedUpdatedAt, { archivedAt: new Date() });
}
export async function restoreCatalogFamily(id: number, expectedUpdatedAt: string): Promise<CatalogMutationResult> {
  return updateLifecycle(id, expectedUpdatedAt, { archivedAt: null });
}
async function updateLifecycle(id: number, expected: string, data: { archivedAt: Date | null }): Promise<CatalogMutationResult> {
  const result = await prisma.quoteCatalogItem.updateMany({ where: { id, updatedAt: new Date(expected) }, data });
  if (!result.count) return { ok: false, error: "stale" };
  return { ok: true, item: await getCatalogFamilyDetail(id) };
}

export async function getCatalogDeletionEligibility(id: number) {
  const [quotationLines, sourceMaps, aliases, generatedFamilies] = await Promise.all([
    prisma.quotationLine.count({ where: { catalogItemId: id } }),
    prisma.catalogNormalizationSourceMap.count({ where: { OR: [{ sourceCatalogItemId: id }, { canonicalCatalogItemId: id }] } }),
    prisma.quoteCatalogAlias.count({ where: { catalogItemId: id, sourceMetadata: { not: Prisma.DbNull } } }),
    prisma.catalogNormalizationSourceMap.count({ where: { canonicalCatalogItemId: id } }),
  ]);
  return { eligible: quotationLines + sourceMaps + aliases + generatedFamilies === 0, quotationLines, sourceMaps, aliases, generatedFamilies };
}

export async function deleteCatalogFamily(id: number, expectedUpdatedAt: string): Promise<CatalogMutationResult> {
  const eligibility = await getCatalogDeletionEligibility(id);
  if (!eligibility.eligible) return { ok: false, error: "referenced" };
  const deleted = await prisma.quoteCatalogItem.deleteMany({ where: { id, updatedAt: new Date(expectedUpdatedAt) } });
  return deleted.count ? { ok: true, item: null } : { ok: false, error: "stale" };
}

// Compatibility exports for existing quotation call sites during the catalog migration.
export async function listCatalogItems() { return prisma.quoteCatalogItem.findMany({ orderBy: { name: "asc" }, include: { Image: true } }); }
export async function getCatalogItem(id: number) { return prisma.quoteCatalogItem.findUnique({ where: { id } }); }
export async function createCatalogItem(data: { slug: string; name: string; descriptionLines?: string[]; defaultUnitPriceCents?: number | null }) { return prisma.quoteCatalogItem.create({ data: { slug: data.slug, name: data.name.trim(), descriptionLines: data.descriptionLines ?? [], defaultUnitPriceCents: data.defaultUnitPriceCents ?? null } }); }
export async function updateCatalogItem(id: number, data: { name: string; descriptionLines?: string[]; defaultUnitPriceCents?: number | null }) { return prisma.quoteCatalogItem.update({ where: { id }, data: { name: data.name.trim(), descriptionLines: data.descriptionLines ?? [], defaultUnitPriceCents: data.defaultUnitPriceCents ?? null } }); }
export async function setCatalogItemImage(catalogItemId: number, imageId: number | null) { return prisma.quoteCatalogItem.update({ where: { id: catalogItemId }, data: { imageId }, include: { Image: true } }); }
