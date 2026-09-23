import type { Prisma } from "@prisma/client";

import prisma from "~/libs/prisma/client.server";

export type CatalogListStatus = "active" | "archived" | "all";

export type CatalogVariantInput = {
  id: number | null;
  name: string;
  attributes: { name: string; value: string }[];
  descriptionLines: string[];
  priceCents: number | null;
  imageId: number | null;
  active: boolean;
};

export type CatalogProductInput = {
  name: string;
  brand: string | null;
  categoryId: number | null;
  descriptionLines: string[];
  imageId: number | null;
  variants: CatalogVariantInput[];
};

export type CatalogMutationResult =
  | { ok: true; id: number }
  | { ok: false; error: "not_found" | "stale" | "invalid"; message?: string };

const imageSelect = { select: { location: true, thumbnail: true } } as const;

export function listCatalogCategories() {
  return prisma.catalogCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, slug: true, name: true, color: true },
  });
}

export function listCatalogProducts({
  status = "active",
  search,
  categoryId,
}: { status?: CatalogListStatus; search?: string; categoryId?: number | null } = {}) {
  const term = search?.trim();
  const where: Prisma.CatalogProductWhereInput = {
    ...(status === "active" ? { archivedAt: null } : status === "archived" ? { archivedAt: { not: null } } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(term
      ? {
          OR: [
            { name: { contains: term, mode: "insensitive" } },
            { brand: { contains: term, mode: "insensitive" } },
            { variants: { some: { name: { contains: term, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };
  return prisma.catalogProduct.findMany({
    where,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      brand: true,
      archivedAt: true,
      category: { select: { name: true, color: true } },
      image: imageSelect,
      _count: { select: { variants: true } },
    },
  });
}

export function getCatalogProduct(id: number) {
  return prisma.catalogProduct.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      brand: true,
      categoryId: true,
      descriptionLines: true,
      imageId: true,
      image: imageSelect,
      archivedAt: true,
      updatedAt: true,
      variants: {
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        select: {
          id: true,
          name: true,
          attributes: true,
          descriptionLines: true,
          priceCents: true,
          imageId: true,
          image: imageSelect,
          active: true,
        },
      },
    },
  });
}

export type CatalogProductDetail = NonNullable<Awaited<ReturnType<typeof getCatalogProduct>>>;

/** Creates a product with one variant of the same name, because a quotation line always uses a variant. */
export async function createCatalogProduct(data: { name: string; brand: string | null; categoryId: number | null }) {
  return prisma.catalogProduct.create({
    data: { ...data, variants: { create: { name: data.name } } },
    select: { id: true },
  });
}

// Interactive transactions run one statement per round trip; far from the database a large product needs time.
const TRANSACTION_TIMEOUT_MS = 20_000;

function variantData(variant: CatalogVariantInput, sortOrder: number) {
  return {
    name: variant.name,
    attributes: variant.attributes,
    descriptionLines: variant.descriptionLines,
    priceCents: variant.priceCents,
    imageId: variant.imageId,
    active: variant.active,
    sortOrder,
  };
}

/**
 * Saves the product and its whole variant list. Variants with an id are updated, the others are created,
 * and the missing ones are deleted. Quotation lines keep their copied data when a variant goes away.
 */
export async function updateCatalogProduct(
  id: number,
  expectedUpdatedAt: Date,
  input: CatalogProductInput,
): Promise<CatalogMutationResult> {
  if (input.variants.length === 0) return { ok: false, error: "invalid", message: "O produto precisa de pelo menos uma variante." };

  return prisma.$transaction(async (tx) => {
    const current = await tx.catalogProduct.findUnique({
      where: { id },
      select: {
        variants: {
          select: { id: true, name: true, attributes: true, descriptionLines: true, priceCents: true, imageId: true, active: true, sortOrder: true },
        },
      },
    });
    if (!current) return { ok: false, error: "not_found" };
    const storedById = new Map(current.variants.map((variant) => [variant.id, variant]));
    if (input.variants.some((variant) => variant.id !== null && !storedById.has(variant.id))) {
      return { ok: false, error: "invalid", message: "Uma variante não pertence a este produto." };
    }

    // Claim the version first, so a concurrent save cannot interleave its child writes with ours.
    const claimed = await tx.catalogProduct.updateMany({
      where: { id, updatedAt: expectedUpdatedAt },
      data: {
        name: input.name,
        brand: input.brand,
        categoryId: input.categoryId,
        descriptionLines: input.descriptionLines,
        imageId: input.imageId,
      },
    });
    if (claimed.count === 0) return { ok: false, error: "stale" };

    const keptIds = input.variants.flatMap((variant) => (variant.id === null ? [] : [variant.id]));
    if (keptIds.length < storedById.size) {
      await tx.catalogVariant.deleteMany({ where: { productId: id, id: { notIn: keptIds } } });
    }
    const rows = input.variants.map((variant, sortOrder) => ({ id: variant.id, data: variantData(variant, sortOrder) }));
    const created = rows.filter((row) => row.id === null).map((row) => ({ ...row.data, productId: id }));
    if (created.length) await tx.catalogVariant.createMany({ data: created });
    // Only changed rows are written, so a typical edit of a large product stays a few statements.
    for (const row of rows) {
      if (row.id !== null && !sameVariant(storedById.get(row.id)!, row.data)) {
        await tx.catalogVariant.update({ where: { id: row.id }, data: row.data });
      }
    }
    return { ok: true, id };
  }, { timeout: TRANSACTION_TIMEOUT_MS });
}

// jsonb returns object keys shortest first; { name, value } already has that order, so the texts compare equal.
// A false "changed" only costs one extra update, never a lost edit.
function sameVariant(stored: Record<string, unknown>, next: ReturnType<typeof variantData>) {
  return (Object.keys(next) as (keyof typeof next)[]).every(
    (field) => JSON.stringify(stored[field]) === JSON.stringify(next[field]),
  );
}

async function setArchived(id: number, expectedUpdatedAt: Date, archivedAt: Date | null): Promise<CatalogMutationResult> {
  const result = await prisma.catalogProduct.updateMany({ where: { id, updatedAt: expectedUpdatedAt }, data: { archivedAt } });
  return result.count ? { ok: true, id } : { ok: false, error: "stale" };
}

export function archiveCatalogProduct(id: number, expectedUpdatedAt: Date) {
  return setArchived(id, expectedUpdatedAt, new Date());
}

export function restoreCatalogProduct(id: number, expectedUpdatedAt: Date) {
  return setArchived(id, expectedUpdatedAt, null);
}

/** Deleting is always safe: quotation lines keep their copied name, price and bullets. */
export async function deleteCatalogProduct(id: number, expectedUpdatedAt: Date): Promise<CatalogMutationResult> {
  const result = await prisma.catalogProduct.deleteMany({ where: { id, updatedAt: expectedUpdatedAt } });
  return result.count ? { ok: true, id } : { ok: false, error: "stale" };
}

/** What the quotation picker offers: active variants of products that are not archived. */
export function listCatalogPickerProducts() {
  return prisma.catalogProduct.findMany({
    where: { archivedAt: null, variants: { some: { active: true } } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      brand: true,
      categoryId: true,
      descriptionLines: true,
      image: imageSelect,
      imageId: true,
      variants: {
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        select: {
          id: true,
          name: true,
          attributes: true,
          descriptionLines: true,
          priceCents: true,
          imageId: true,
          image: imageSelect,
        },
      },
    },
  });
}

export type CatalogPickerProductRecord = Awaited<ReturnType<typeof listCatalogPickerProducts>>[number];
