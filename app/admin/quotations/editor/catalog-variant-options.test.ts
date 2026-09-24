import { expect, test } from "vitest";

import { filterCatalogVariantOptions, toCatalogVariantOptions } from "./catalog-variant-options";

const image = (name: string) => ({ location: `https://cdn.test/${name}.webp`, thumbnail: `https://cdn.test/${name}-thumb.webp` });

const products = [
  {
    id: 1,
    name: "Válvula",
    brand: null,
    categoryId: 10,
    descriptionLines: [],
    imageId: null,
    image: null,
    variants: [
      { id: 101, name: "Válvula de retenção", attributes: [], descriptionLines: [], priceCents: null, imageId: null, image: null },
    ],
  },
  {
    id: 2,
    name: "Boiler Warma",
    brand: "Warma",
    categoryId: 20,
    descriptionLines: ["Garantia de 5 anos"],
    imageId: 7,
    image: image("boiler"),
    variants: [
      {
        id: 201,
        name: "Boiler 400L inox 316 Warma",
        attributes: [{ name: "Capacidade", value: "400L" }],
        descriptionLines: ["Isolamento em PU", "Garantia de 5 anos"],
        priceCents: 450000,
        imageId: null,
        image: null,
      },
      {
        id: 202,
        name: "Boiler 600L inox 304 Warma",
        attributes: [{ name: "Capacidade", value: "600L" }],
        descriptionLines: [],
        priceCents: null,
        imageId: 9,
        image: image("boiler-600"),
      },
    ],
  },
];

const options = toCatalogVariantOptions(products);

test("search ignores accents and case", () => {
  expect(filterCatalogVariantOptions(options, "VALVULA", null).map((option) => option.variantId)).toEqual([101]);
});

test("every search word must match, across name, brand and attributes", () => {
  expect(filterCatalogVariantOptions(options, "warma 600l", null).map((option) => option.variantId)).toEqual([202]);
  expect(filterCatalogVariantOptions(options, "warma valvula", null)).toEqual([]);
});

test("a category narrows the list, and no category shows all", () => {
  expect(filterCatalogVariantOptions(options, "", 20).map((option) => option.variantId)).toEqual([201, 202]);
  expect(filterCatalogVariantOptions(options, "", null)).toHaveLength(3);
});

test("a variant uses its own image when it has one, else the product image", () => {
  const [, withProductImage, withOwnImage] = options;

  expect(withProductImage).toMatchObject({ imageId: 7, imageUrl: image("boiler").location });
  expect(withOwnImage).toMatchObject({ imageId: 9, imageUrl: image("boiler-600").location });
});

test("the line bullets are the product bullets then the variant bullets, without repeats", () => {
  expect(options[1].descriptionLines).toEqual(["Garantia de 5 anos", "Isolamento em PU"]);
});

test("only products with several variants are grouped", () => {
  expect(options.map((option) => option.group)).toEqual([null, "Boiler Warma", "Boiler Warma"]);
});
