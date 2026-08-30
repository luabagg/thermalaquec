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

const catalogPickerSummarySelect = {
  id: true,
  slug: true,
  name: true,
  defaultUnitPriceCents: true,
  imageId: true,
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
    include: {
      Image: { select: { location: true, thumbnail: true } },
      values: { select: { optionValueId: true } },
    },
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

export async function listActiveCatalogPickerSummaries() {
  return prisma.quoteCatalogItem.findMany({
    where: { archivedAt: null },
    orderBy: { name: "asc" },
    select: catalogPickerSummarySelect,
  });
}

export async function getCatalogFamilyDetail(id: number) {
  return prisma.quoteCatalogItem.findUnique({ where: { id }, include: catalogDetailInclude });
}

export async function createCatalogFamily(family: CatalogAggregateInput["family"]) {
  const item = await prisma.quoteCatalogItem.create({ data: familyData(family) });
  return getCatalogFamilyDetail(item.id);
}

class InvalidAggregateError extends Error {
  constructor(readonly fields: Record<string, string>) { super("Invalid catalog aggregate"); }
}

type ValidatedAggregate = {
  optionIds: Set<number>;
  omittedValueIds: number[];
  submittedOptionIds: Set<number>;
  submittedValueIds: Set<number>;
  valueIdByClientKey: Map<string, number | undefined>;
};

async function validateAggregate(input: CatalogAggregateInput): Promise<ValidatedAggregate | CatalogMutationResult> {
  const existing = await prisma.quoteCatalogItem.findUnique({ where: { id: input.id }, include: catalogDetailInclude });
  if (!existing) return { ok: false, error: "not_found" };

  const optionIds = new Set(existing.options.map((option) => option.id));
  const valueById = new Map(existing.options.flatMap((option) => option.values.map((value) => [value.id, { optionId: option.id }] as const)));
  const variantIds = new Set(existing.variants.map((variant) => variant.id));
  const submittedOptionIds = new Set(input.options.flatMap((option) => option.id === undefined ? [] : [option.id]));
  const submittedValueIds = new Set(input.options.flatMap((option) => option.values.flatMap((value) => value.id === undefined ? [] : [value.id])));
  const valueIdByClientKey = new Map<string, number | undefined>();

  for (const option of input.options) {
    if (option.id !== undefined && !optionIds.has(option.id)) return invalid({ id: "Child does not belong to this catalog family" });
    for (const value of option.values) {
      if (valueIdByClientKey.has(value.clientKey)) return invalid({ options: "Duplicate value client key" });
      if (value.id !== undefined) {
        const existingValue = valueById.get(value.id);
        if (!existingValue || existingValue.optionId !== option.id) return invalid({ options: "Value does not belong to its submitted option" });
      }
      valueIdByClientKey.set(value.clientKey, value.id);
    }
  }
  if (input.variants.some((variant) => variant.id !== undefined && !variantIds.has(variant.id))) return invalid({ id: "Child does not belong to this catalog family" });
  for (const variant of input.variants) {
    if (variant.valueClientKeys.some((key) => !valueIdByClientKey.has(key)) || new Set(variant.valueClientKeys).size !== variant.valueClientKeys.length) {
      return invalid({ variants: "Variant references an unknown or duplicate value" });
    }
  }

  const omittedValueIds = [...valueById.keys()].filter((id) => !submittedValueIds.has(id));
  const retainedVariantIds = new Set(input.variants.flatMap((variant) => variant.id === undefined ? [] : [variant.id]));
  for (const variant of existing.variants) {
    if (!retainedVariantIds.has(variant.id)) continue;
    const submitted = input.variants.find((candidate) => candidate.id === variant.id)!;
    const referencedIds = submitted.valueClientKeys.map((key) => valueIdByClientKey.get(key));
    if (referencedIds.some((id) => id !== undefined && omittedValueIds.includes(id))) return invalid({ options: "Cannot remove values referenced by retained variants" });
  }
  return { optionIds, omittedValueIds, submittedOptionIds, submittedValueIds, valueIdByClientKey };
}

export async function updateCatalogFamilyAggregate(input: CatalogAggregateInput): Promise<CatalogMutationResult> {
  const expectedUpdatedAt = new Date(input.expectedUpdatedAt);
  if (Number.isNaN(expectedUpdatedAt.valueOf())) return { ok: false, error: "invalid", fields: { expectedUpdatedAt: "Invalid timestamp" } };
  const validated = await validateAggregate(input);
  if ("ok" in validated) return validated;

  try {
    return await prisma.$transaction<CatalogMutationResult>(async (tx) => {
      // This is intentionally the first mutation: it claims the parent version before child writes.
      const claimed = await tx.quoteCatalogItem.updateMany({
        where: { id: input.id, updatedAt: expectedUpdatedAt },
        data: familyData(input.family),
      });
      if (claimed.count === 0) return { ok: false, error: "stale" };

      const { omittedValueIds, submittedOptionIds, submittedValueIds, valueIdByClientKey } = validated;
      for (const option of input.options) {
      const data = { name: option.name.trim(), slug: option.slug.trim(), placement: option.placement, sortOrder: option.sortOrder };
      const saved = option.id === undefined
        ? await tx.quoteCatalogOption.create({ data: { ...data, catalogItemId: input.id } })
        : await tx.quoteCatalogOption.update({ where: { id: option.id }, data });
      submittedOptionIds.add(saved.id);
      for (const value of option.values) {
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
        throw new InvalidAggregateError({ variants: "Variant references an unknown or duplicate value" });
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
    // Omitted values include values under options that remain in the aggregate.
    if (omittedValueIds.length) await tx.quoteCatalogOptionValue.deleteMany({ where: { id: { in: omittedValueIds } } });
    await tx.quoteCatalogOption.deleteMany({ where: { catalogItemId: input.id, id: { notIn: [...submittedOptionIds] } } });
    return { ok: true, item: await tx.quoteCatalogItem.findUnique({ where: { id: input.id }, include: catalogDetailInclude }) };
    });
  } catch (error) {
    if (error instanceof InvalidAggregateError) return invalid(error.fields);
    throw error;
  }
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

export type CatalogDeletionEligibility = {
  eligible: boolean;
  quotationLines: number;
};

/**
 * Counts the references of a whole catalog page with one query.
 * The list holds hundreds of families, so per-family counts exhaust the connection pool.
 */
export async function getCatalogDeletionEligibilityByIds(ids: number[]): Promise<Map<number, CatalogDeletionEligibility>> {
  const eligibilityById = new Map<number, CatalogDeletionEligibility>(
    ids.map((id) => [id, { eligible: true, quotationLines: 0 }]),
  );
  if (!ids.length) return eligibilityById;

  const quotationLines = await prisma.quotationLine.groupBy({
    by: ["catalogItemId"],
    where: { catalogItemId: { in: ids } },
    _count: { _all: true },
  });
  for (const group of quotationLines) {
    const eligibility = group.catalogItemId === null ? undefined : eligibilityById.get(group.catalogItemId);
    if (!eligibility) continue;
    eligibility.quotationLines = group._count._all;
    eligibility.eligible = group._count._all === 0;
  }
  return eligibilityById;
}

export async function getCatalogDeletionEligibility(id: number): Promise<CatalogDeletionEligibility> {
  return (await getCatalogDeletionEligibilityByIds([id])).get(id)!;
}

export async function deleteCatalogFamily(id: number, expectedUpdatedAt: string): Promise<CatalogMutationResult> {
  const eligibility = await getCatalogDeletionEligibility(id);
  if (!eligibility.eligible) return { ok: false, error: "referenced" };
  const deleted = await prisma.quoteCatalogItem.deleteMany({ where: { id, updatedAt: new Date(expectedUpdatedAt) } });
  return deleted.count ? { ok: true, item: null } : { ok: false, error: "stale" };
}
