import { expect, test } from "vitest";

import { isValidTaxId } from "./tax-id";

test("tax ids must carry valid check digits", () => {
  expect(isValidTaxId("52998224725")).toBe(true);
  expect(isValidTaxId("52998224724")).toBe(false);
  expect(isValidTaxId("11111111111")).toBe(false);
  expect(isValidTaxId("11222333000181")).toBe(true);
  expect(isValidTaxId("11222333000182")).toBe(false);
});

test("the 2026 alphanumeric CNPJ is accepted", () => {
  // Example published by the Receita Federal.
  expect(isValidTaxId("12ABC34501DE35")).toBe(true);
  expect(isValidTaxId("12ABC34501DE36")).toBe(false);
});
