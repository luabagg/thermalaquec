import { expect, test } from "vitest";

import { buildDocumentBlocks, paginateDocumentBlocks } from "./document-pages";

const metrics = { firstCapacity: 100, restCapacity: 150, tableHead: 10 };

function kinds(pages: ReturnType<typeof paginateDocumentBlocks>) {
  return pages.map((page) => page.map((b) => ("index" in b ? `${b.kind}${b.index}` : b.kind)));
}

test("a short quotation fits on one page", () => {
  const blocks = buildDocumentBlocks(2, 1);
  const pages = paginateDocumentBlocks(blocks, [20, 20, 20, 5, 10], metrics);

  expect(kinds(pages)).toEqual([["line0", "line1", "summary", "payment-options-heading", "payment-option0"]]);
});

test("later pages use their own capacity and pay for a repeated table head", () => {
  const blocks = buildDocumentBlocks(7, 0);
  const pages = paginateDocumentBlocks(blocks, [30, 30, 30, 30, 30, 30, 30, 10], metrics);

  // Page 1: 10 head + 3 x 30 = 100. Page 2: 10 head + 4 x 30 + 10 summary = 140.
  expect(kinds(pages)).toEqual([
    ["line0", "line1", "line2"],
    ["line3", "line4", "line5", "line6", "summary"],
  ]);
});

test("the payment options heading moves with the first payment option", () => {
  const blocks = buildDocumentBlocks(1, 2);
  const pages = paginateDocumentBlocks(blocks, [40, 40, 5, 10, 10], metrics);

  expect(kinds(pages)).toEqual([
    ["line0", "summary"],
    ["payment-options-heading", "payment-option0", "payment-option1"],
  ]);
});

test("a block taller than a page still gets placed", () => {
  const blocks = buildDocumentBlocks(2, 0);
  const pages = paginateDocumentBlocks(blocks, [10, 400, 10], metrics);

  expect(kinds(pages)).toEqual([["line0"], ["line1"], ["summary"]]);
});
