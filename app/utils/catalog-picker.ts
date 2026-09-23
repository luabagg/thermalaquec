/** One selectable catalog variant, ready to become a quotation line. */
export type CatalogPickerItem = {
  variantId: number;
  productId: number;
  categoryId: number | null;
  name: string;
  /** Product name when the product has several variants, so the list can group them. */
  group: string | null;
  attributes: { name: string; value: string }[];
  descriptionLines: string[];
  unitPriceCents: number | null;
  imageId: number | null;
  imageUrl: string | null;
  imageThumbnail: string | null;
  /** Folded text for accent- and case-insensitive search. */
  searchText: string;
};

type Image = { location: string; thumbnail: string | null } | null;

type PickerSourceProduct = {
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

function stringList(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

export function attributeList(value: unknown): { name: string; value: string }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) =>
    entry && typeof entry === "object" && "name" in entry && "value" in entry
      ? [{ name: String(entry.name), value: String(entry.value) }]
      : [],
  );
}

export function toCatalogPickerItems(products: PickerSourceProduct[]): CatalogPickerItem[] {
  return products.flatMap((product) =>
    product.variants.map((variant) => {
      const attributes = attributeList(variant.attributes);
      const image = variant.image ?? product.image;
      const descriptionLines = [...new Set([...stringList(product.descriptionLines), ...stringList(variant.descriptionLines)])];
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
        imageThumbnail: image?.thumbnail ?? null,
        searchText: foldSearch(
          [variant.name, product.name, product.brand, ...attributes.map((attribute) => attribute.value)].filter(Boolean).join(" "),
        ),
      };
    }),
  );
}

/** Every search word must appear somewhere in the item. A null category means all categories. */
export function filterCatalogPickerItems(items: CatalogPickerItem[], search: string, categoryId: number | null) {
  const words = foldSearch(search).split(/\s+/).filter(Boolean);
  return items.filter(
    (item) =>
      (categoryId === null || item.categoryId === categoryId) && words.every((word) => item.searchText.includes(word)),
  );
}
