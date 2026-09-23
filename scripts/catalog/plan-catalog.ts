// Turns the parsed families into catalog products and variants. Pure: no database access.
import { CATEGORIES, categoryForLine } from "./categories.mjs";

export type SourceMember = {
  id: number;
  normalizedName: string;
  price: number | null;
  attributes: { option: string; value: string }[];
};

export type SourceFamily = {
  name: string;
  line: string;
  brand: string | null;
  generic: boolean;
  members: SourceMember[];
};

export type SourceProduct = { id: number; descriptionLines?: string[] | null };

export type PlannedVariant = {
  name: string;
  attributes: { name: string; value: string }[];
  descriptionLines: string[];
  priceCents: number | null;
  sortOrder: number;
  sourceIds: number[];
};

export type PlannedProduct = {
  name: string;
  brand: string | null;
  categorySlug: string;
  variants: PlannedVariant[];
};

// "Modelo" holds whatever the name parser could not classify. The variant name already carries it.
const LEFTOVER_OPTION = "Modelo";

const collator = new Intl.Collator("pt-BR", { numeric: true, sensitivity: "base" });

function attributesOf(member: SourceMember) {
  return member.attributes
    .filter((attribute) => attribute.option !== LEFTOVER_OPTION)
    .map((attribute) => ({ name: attribute.option, value: attribute.value }));
}

function variantsOf(family: SourceFamily, descriptionById: Map<number, string[]>): PlannedVariant[] {
  // A generic family is an explicit collapse of rows that differ only by quantity: one sellable item.
  if (family.generic) {
    return [
      {
        name: family.name,
        attributes: [],
        descriptionLines: [],
        priceCents: null,
        sortOrder: 0,
        sourceIds: family.members.map((member) => member.id),
      },
    ];
  }
  return [...family.members]
    .sort((left, right) => collator.compare(left.normalizedName, right.normalizedName))
    .map((member, sortOrder) => ({
      name: member.normalizedName,
      attributes: attributesOf(member),
      descriptionLines: descriptionById.get(member.id) ?? [],
      priceCents: member.price,
      sortOrder,
      sourceIds: [member.id],
    }));
}

export function planCatalog(families: SourceFamily[], products: SourceProduct[]): PlannedProduct[] {
  const descriptionById = new Map(products.map((product) => [product.id, product.descriptionLines ?? []]));
  return families.map((family) => {
    const categorySlug = categoryForLine(family.line);
    if (!categorySlug) throw new Error(`Product line "${family.line}" has no category in categories.mjs`);
    const variants = variantsOf(family, descriptionById);
    return {
      // A single product keeps its own name; a merged family is named after its line and brand.
      name: family.members.length > 1 ? family.name : variants[0].name,
      brand: family.brand,
      categorySlug,
      variants,
    };
  });
}

export { CATEGORIES };
