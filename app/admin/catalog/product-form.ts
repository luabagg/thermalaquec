import { parseBRLToCents } from "~/lib/money";
import { splitTextLines } from "~/lib/text-lines";

import type { ProductContent, VariantContent } from "./catalog.server";
import { parseAttributeText } from "./variant-attributes";

// The product editor writes these names and `parseCatalogProductForm` reads them. A save deletes every stored
// variant whose id the form does not send, so a name that differs between the two sides deletes variants.

export const PRODUCT_FIELD = {
  expectedUpdatedAt: "expectedUpdatedAt",
  name: "name",
  brand: "brand",
  categoryId: "categoryId",
  description: "description",
  imageId: "imageId",
  variantCount: "variantCount",
} as const;

type VariantField = "id" | "name" | "price" | "attributes" | "description" | "imageId" | "active";

export function variantFieldName(index: number, field: VariantField) {
  return `variant.${index}.${field}`;
}

export const STALE_PRODUCT_MESSAGE = "Este produto foi alterado em outra aba. Recarregue e tente novamente.";

function text(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function positiveId(form: FormData, key: string) {
  const id = Number(text(form, key));
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** 0 to count - 1. Null when the count is missing or not a whole number: a form from an older page. */
function submittedVariantIndexes(form: FormData) {
  const count = form.has(PRODUCT_FIELD.variantCount) ? Number(text(form, PRODUCT_FIELD.variantCount)) : NaN;
  if (!Number.isInteger(count) || count < 0) return null;
  return Array.from({ length: count }, (_, index) => index);
}

/** An empty price means "no catalog price": the quotation line starts at zero. */
function readVariant(form: FormData, index: number): VariantContent | { error: string } {
  const field = (name: VariantField) => variantFieldName(index, name);
  const name = text(form, field("name"));
  if (!name) return { error: `Informe o nome da variante ${index + 1}.` };
  const priceText = text(form, field("price"));
  const priceCents = priceText ? parseBRLToCents(priceText) : null;
  if (priceText && priceCents === null) return { error: `Preço inválido na variante ${index + 1}.` };
  return {
    id: positiveId(form, field("id")),
    name,
    attributes: parseAttributeText(String(form.get(field("attributes")) ?? "")),
    descriptionLines: splitTextLines(String(form.get(field("description")) ?? "")),
    priceCents,
    imageId: positiveId(form, field("imageId")),
    // An unchecked checkbox submits nothing.
    active: form.get(field("active")) === "on",
  };
}

export type ProductForm = { ok: true; expectedUpdatedAt: Date; content: ProductContent } | { ok: false; error: string };

export function parseCatalogProductForm(form: FormData): ProductForm {
  const expectedUpdatedAt = new Date(text(form, PRODUCT_FIELD.expectedUpdatedAt));
  const variantIndexes = submittedVariantIndexes(form);
  if (Number.isNaN(expectedUpdatedAt.valueOf()) || !variantIndexes) return { ok: false, error: STALE_PRODUCT_MESSAGE };
  const name = text(form, PRODUCT_FIELD.name);
  if (!name) return { ok: false, error: "Informe o nome do produto." };

  const variants: VariantContent[] = [];
  for (const index of variantIndexes) {
    const variant = readVariant(form, index);
    if ("error" in variant) return { ok: false, error: variant.error };
    variants.push(variant);
  }
  if (variants.length === 0) return { ok: false, error: "O produto precisa de pelo menos uma variante." };

  return {
    ok: true,
    expectedUpdatedAt,
    content: {
      name,
      brand: text(form, PRODUCT_FIELD.brand) || null,
      categoryId: positiveId(form, PRODUCT_FIELD.categoryId),
      descriptionLines: splitTextLines(String(form.get(PRODUCT_FIELD.description) ?? "")),
      imageId: positiveId(form, PRODUCT_FIELD.imageId),
      variants,
    },
  };
}
