import { expect, test } from "vitest";

import { buildQuoteBlocks, paginateQuoteBlocks } from "./quotation-pages";

const metrics = { firstCapacity: 100, restCapacity: 150, tableHead: 10 };

function kinds(pages: ReturnType<typeof paginateQuoteBlocks>) {
  return pages.map((page) => page.map((b) => ("index" in b ? `${b.kind}${b.index}` : b.kind)));
}

test("a short quotation fits on one page", () => {
  const blocks = buildQuoteBlocks(2, 1);
  const pages = paginateQuoteBlocks(blocks, [20, 20, 20, 5, 10], metrics);

  expect(kinds(pages)).toEqual([["line0", "line1", "summary", "payments-head", "payment0"]]);
});

test("later pages use their own capacity and pay for a repeated table head", () => {
  const blocks = buildQuoteBlocks(7, 0);
  const pages = paginateQuoteBlocks(blocks, [30, 30, 30, 30, 30, 30, 30, 10], metrics);

  // Page 1: 10 head + 3 x 30 = 100. Page 2: 10 head + 4 x 30 + 10 summary = 140.
  expect(kinds(pages)).toEqual([
    ["line0", "line1", "line2"],
    ["line3", "line4", "line5", "line6", "summary"],
  ]);
});

test("the payments heading moves with the first payment row", () => {
  const blocks = buildQuoteBlocks(1, 2);
  const pages = paginateQuoteBlocks(blocks, [40, 40, 5, 10, 10], metrics);

  expect(kinds(pages)).toEqual([
    ["line0", "summary"],
    ["payments-head", "payment0", "payment1"],
  ]);
});

test("a block taller than a page still gets placed", () => {
  const blocks = buildQuoteBlocks(2, 0);
  const pages = paginateQuoteBlocks(blocks, [10, 400, 10], metrics);

  expect(kinds(pages)).toEqual([["line0"], ["line1"], ["summary"]]);
});
