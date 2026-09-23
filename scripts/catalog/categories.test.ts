import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

import { CATEGORIES, categoryForLine } from "./categories.mjs";

const families = JSON.parse(readFileSync("data/catalog/families.json", "utf8")) as { line: string }[];

test("every product line in the catalog belongs to a category", () => {
  const unmapped = [...new Set(families.map((family) => family.line))].filter((line) => !categoryForLine(line));

  expect(unmapped).toEqual([]);
});

test("no product line belongs to two categories", () => {
  const lines = CATEGORIES.flatMap((category) => category.lines);

  expect(lines.length).toBe(new Set(lines).size);
});
