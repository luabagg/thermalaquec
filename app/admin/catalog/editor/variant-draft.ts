import { imagePreviewUrl } from "~/admin/images/upload-image";
import { centsToInputText } from "~/lib/money";
import { readStringList } from "~/lib/text-lines";

import type { StoredProduct } from "../catalog.server";
import { formatAttributeText } from "../variant-attributes";

/** A variant as the product editor holds it: form text as typed. */
export type VariantDraft = {
  /** Stable React key: the stored id, or a key made when the user adds the variant. */
  draftKey: string;
  /** Null until the variant is saved. */
  id: number | null;
  name: string;
  attributesText: string;
  description: string;
  /** Empty means "no catalog price". */
  priceText: string;
  imageId: number | null;
  previewUrl: string | null;
  active: boolean;
  /** Only a variant the user adds starts open. */
  openOnMount: boolean;
};

export function storedVariantsToDrafts(product: StoredProduct): VariantDraft[] {
  return product.variants.map((variant) => ({
    draftKey: String(variant.id),
    id: variant.id,
    name: variant.name,
    attributesText: formatAttributeText(variant.attributes),
    description: readStringList(variant.descriptionLines).join("\n"),
    priceText: variant.priceCents === null ? "" : centsToInputText(variant.priceCents),
    imageId: variant.imageId,
    previewUrl: imagePreviewUrl(variant.image),
    active: variant.active,
    openOnMount: false,
  }));
}

/** A new variant starts with the product name, which the user then extends, e.g. "Boiler 400L". */
export function blankVariantDraft(productName: string): VariantDraft {
  return {
    draftKey: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    id: null,
    name: productName,
    attributesText: "",
    description: "",
    priceText: "",
    imageId: null,
    previewUrl: null,
    active: true,
    openOnMount: true,
  };
}

/** The lowest catalog price among the variants, or null when none has a price. */
export function lowestPriceCents(variants: { priceCents: number | null }[]) {
  const prices = variants.flatMap((variant) => (variant.priceCents === null ? [] : [variant.priceCents]));
  return prices.length > 0 ? Math.min(...prices) : null;
}
