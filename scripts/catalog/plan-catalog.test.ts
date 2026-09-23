import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

import { planCatalog, type SourceFamily, type SourceProduct } from "./plan-catalog";

const families = JSON.parse(readFileSync("data/catalog/families.json", "utf8")) as SourceFamily[];
const products = JSON.parse(readFileSync("data/catalog/products.json", "utf8")) as SourceProduct[];
const plan = planCatalog(families, products);

test("every family becomes one product with at least one variant", () => {
  expect(plan).toHaveLength(families.length);
  expect(plan.every((product) => product.variants.length > 0)).toBe(true);
});

test("every source row lands in exactly one variant", () => {
  const sourceIds = plan.flatMap((product) => product.variants.flatMap((variant) => variant.sourceIds));
  const memberIds = families.flatMap((family) => family.members.map((member) => member.id));

  expect(sourceIds.length).toBe(new Set(sourceIds).size);
  expect([...sourceIds].sort()).toEqual([...memberIds].sort());
});

test("a merged family keeps one variant per source row, with its own printed name", () => {
  const boiler = plan.find((product) => product.name === "Boiler")!;

  expect(boiler.variants).toHaveLength(44);
  expect(boiler.variants.map((variant) => variant.name)).toContain("Boiler 1000L alta pressão inox 304");
});

test("a generic family collapses into a single variant", () => {
  const cable = plan.find((product) => product.name === "Cabo" && product.variants[0].sourceIds.length > 1)!;

  expect(cable.variants).toHaveLength(1);
  expect(cable.variants[0].attributes).toEqual([]);
});

test("variants are ordered with numbers compared as numbers", () => {
  const boiler = plan.find((product) => product.name === "Boiler")!;
  const names = boiler.variants.map((variant) => variant.name);

  expect(names.indexOf("Boiler 400L baixa pressão PPR-3")).toBeLessThan(
    names.indexOf("Boiler 1000L alta pressão inox 304"),
  );
});

test("the parser leftover axis is not shown as an attribute", () => {
  const attributeNames = plan.flatMap((product) =>
    product.variants.flatMap((variant) => variant.attributes.map((attribute) => attribute.name)),
  );

  expect(attributeNames).not.toContain("Modelo");
});
