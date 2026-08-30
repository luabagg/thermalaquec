import { expect, test } from "vitest";
import { MAX_CATALOG_AGGREGATE_BYTES, parseCatalogAggregateJson, parseIntegerArray } from "./catalog-admin";

function aggregate(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    expectedUpdatedAt: "2026-08-29T00:00:00.000Z",
    family: {
      slug: "boiler",
      name: "Boiler",
      nameTemplate: null,
      descriptionLines: [],
      defaultUnitPriceCents: 100,
      imageId: null,
    },
    options: [],
    variants: [],
    ...overrides,
  };
}

test("accepts only actual positive integer IDs", () => {
  expect(parseIntegerArray([1, 2, 0, -1, 1.5, "3", null, true])).toEqual([1, 2]);
  expect(parseIntegerArray("1")).toEqual([]);
});

test("rejects aggregate JSON above the bounded payload size", () => {
  const raw = JSON.stringify(aggregate({ padding: "x".repeat(MAX_CATALOG_AGGREGATE_BYTES) }));
  expect(parseCatalogAggregateJson(raw)).toEqual({
    error: "As alterações excedem o limite permitido. Reduza os textos ou a quantidade de itens.",
  });
});

test.each([
  ["family price", { family: { ...(aggregate().family as object), defaultUnitPriceCents: "Infinity" } }],
  ["family image", { family: { ...(aggregate().family as object), imageId: "NaN" } }],
  [
    "option order",
    { options: [{ clientKey: "option", name: "Size", slug: "size", placement: "TITLE", sortOrder: "Infinity", values: [] }] },
  ],
  [
    "value order",
    {
      options: [
        {
          clientKey: "option",
          name: "Size",
          slug: "size",
          placement: "TITLE",
          sortOrder: 0,
          values: [{ clientKey: "value", label: "One", slug: "one", titleFragment: null, descriptionLines: [], sortOrder: "NaN" }],
        },
      ],
    },
  ],
  [
    "variant price",
    {
      variants: [
        {
          clientKey: "variant",
          valueClientKeys: [],
          sku: null,
          active: true,
          nameOverride: null,
          descriptionLinesOverride: null,
          unitPriceCents: "Infinity",
          imageId: null,
        },
      ],
    },
  ],
])("rejects a non-finite %s", (_label, override) => {
  const result = parseCatalogAggregateJson(JSON.stringify(aggregate(override)));
  expect(result).toHaveProperty("error");
  expect("error" in result ? result.error : "").toMatch(/inválid/i);
});

test("ignores a client-computed variant key", () => {
  const parsed = parseCatalogAggregateJson(
    JSON.stringify(
      aggregate({
        variants: [
          {
            clientKey: "variant",
            key: "malicious-key",
            valueClientKeys: [],
            sku: null,
            active: true,
            nameOverride: null,
            descriptionLinesOverride: null,
            unitPriceCents: null,
            imageId: null,
          },
        ],
      })
    )
  );

  expect(parsed).toMatchObject({ variants: [{ clientKey: "variant" }] });
  expect("error" in parsed ? parsed : parsed.variants[0]).not.toHaveProperty("key");
});
