import { expect, test } from "vitest";

import { STALE_PRODUCT_MESSAGE, parseCatalogProductForm } from "./product-form";
import { formatAttributeText, parseAttributeText } from "./variant-attributes";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const base = {
  expectedUpdatedAt: "2026-09-23T12:00:00.000Z",
  name: "Boiler",
  variantCount: "1",
  "variant.0.id": "7",
  "variant.0.name": "Boiler 400L",
};

test("a variant without a price has no catalog price, and a typed price is read in reais", () => {
  const empty = parseCatalogProductForm(form(base));
  const typed = parseCatalogProductForm(form({ ...base, "variant.0.price": "1.234,56" }));

  expect(empty.ok && empty.content.variants[0].priceCents).toBeNull();
  expect(typed.ok && typed.content.variants[0].priceCents).toBe(123456);
});

test("an unreadable price is rejected instead of saved as zero", () => {
  expect(parseCatalogProductForm(form({ ...base, "variant.0.price": "abc" }))).toEqual({
    ok: false,
    error: "Preço inválido na variante 1.",
  });
});

test("a product needs a name and at least one named variant", () => {
  expect(parseCatalogProductForm(form({ ...base, name: " " })).ok).toBe(false);
  expect(parseCatalogProductForm(form({ ...base, variantCount: "0" })).ok).toBe(false);
  expect(parseCatalogProductForm(form({ ...base, "variant.0.name": "" })).ok).toBe(false);
});

test("a form without its version is treated as stale", () => {
  expect(parseCatalogProductForm(form({ ...base, expectedUpdatedAt: "" }))).toEqual({ ok: false, error: STALE_PRODUCT_MESSAGE });
});

test("an unchecked availability box makes the variant inactive", () => {
  const inactive = parseCatalogProductForm(form(base));
  const active = parseCatalogProductForm(form({ ...base, "variant.0.active": "on" }));

  expect(inactive.ok && inactive.content.variants[0].active).toBe(false);
  expect(active.ok && active.content.variants[0].active).toBe(true);
});

test("attributes are one 'name: value' per line, split at the first colon", () => {
  expect(parseAttributeText("Capacidade: 400L\nsem dois pontos\nRelação: 3:1\n: vazio")).toEqual([
    { name: "Capacidade", value: "400L" },
    { name: "Relação", value: "3:1" },
  ]);
  expect(formatAttributeText([{ name: "Capacidade", value: "400L" }])).toBe("Capacidade: 400L");
});

// A page loaded before a deploy can post the variant count under another name. Refusing it keeps the save from
// reading zero variants.
test("a form without a variant count is treated as stale", () => {
  const withoutCount = Object.fromEntries(Object.entries(base).filter(([key]) => key !== "variantCount"));

  expect(parseCatalogProductForm(form(withoutCount))).toEqual({ ok: false, error: STALE_PRODUCT_MESSAGE });
});
