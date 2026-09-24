import { readVariantAttributes, type VariantAttribute } from "~/admin/catalog/variant-attributes";
import { readStringList } from "~/lib/text-lines";

/** One selectable catalog variant, ready to become a quotation line. */
export type CatalogVariantOption = {
  variantId: number;
  productId: number;
  categoryId: number | null;
  name: string;
  /** Product name when the product has several variants, so the list can group them. */
  group: string | null;
  attributes: VariantAttribute[];
  descriptionLines: string[];
  unitPriceCents: number | null;
  imageId: number | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  /** Folded text for accent- and case-insensitive search. */
  searchText: string;
};

type Image = { location: string; thumbnail: string | null } | null;

type CatalogProductWithVariants = {
  id: number;
  name: string;
  brand: string | null;
  categoryId: number | null;
  descriptionLines: unknown;
  imageId: number | null;
  image: Image;
  variants: {
    id: number;
    name: string;
    attributes: unknown;
    descriptionLines: unknown;
    priceCents: number | null;
    imageId: number | null;
    image: Image;
  }[];
};

/** Lowercase without accents: "Válvula" and "valvula" match. */
export function foldSearch(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function toCatalogVariantOptions(products: CatalogProductWithVariants[]): CatalogVariantOption[] {
  return products.flatMap((product) =>
    product.variants.map((variant) => {
      const attributes = readVariantAttributes(variant.attributes);
      const image = variant.image ?? product.image;
      const descriptionLines = [...new Set([...readStringList(product.descriptionLines), ...readStringList(variant.descriptionLines)])];
      return {
        variantId: variant.id,
        productId: product.id,
        categoryId: product.categoryId,
        name: variant.name,
        group: product.variants.length > 1 ? product.name : null,
        attributes,
        descriptionLines,
        unitPriceCents: variant.priceCents,
        imageId: variant.image ? variant.imageId : product.imageId,
        imageUrl: image?.location ?? null,
        thumbnailUrl: image?.thumbnail ?? null,
        searchText: foldSearch(
          [variant.name, product.name, product.brand, ...attributes.map((attribute) => attribute.value)].filter(Boolean).join(" "),
        ),
      };
    }),
  );
}

/** Every search word must appear somewhere in the option. A null category means all categories. */
export function filterCatalogVariantOptions(options: CatalogVariantOption[], search: string, categoryId: number | null) {
  const words = foldSearch(search).split(/\s+/).filter(Boolean);
  return options.filter(
    (option) =>
      (categoryId === null || option.categoryId === categoryId) && words.every((word) => option.searchText.includes(word)),
  );
}
