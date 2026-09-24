/** One piece of the printed quotation that never splits across pages, in document order. */
export type DocumentBlock =
  | { kind: "line"; index: number }
  | { kind: "summary" }
  | { kind: "payment-options-heading" }
  | { kind: "payment-option"; index: number };

export type PageMetrics = {
  /** Content height available below the full header on page 1. */
  firstCapacity: number;
  /** Content height available below the compact header on later pages. */
  restCapacity: number;
  /** Height of the table head, which each page repeats above its lines. */
  tableHead: number;
};

export function buildDocumentBlocks(lineCount: number, paymentOptionCount: number): DocumentBlock[] {
  const blocks: DocumentBlock[] = [];
  for (let index = 0; index < lineCount; index++) blocks.push({ kind: "line", index });
  blocks.push({ kind: "summary" });
  if (paymentOptionCount > 0) blocks.push({ kind: "payment-options-heading" });
  for (let index = 0; index < paymentOptionCount; index++) blocks.push({ kind: "payment-option", index });
  return blocks;
}

/**
 * Packs blocks into pages greedily. A page that holds lines also pays for the
 * table head. The payment options heading never ends a page alone. A block taller
 * than a page gets a page of its own and overflows it.
 */
export function paginateDocumentBlocks(
  blocks: DocumentBlock[],
  heights: number[],
  metrics: PageMetrics,
): DocumentBlock[][] {
  const pages: DocumentBlock[][] = [[]];
  let used = 0;

  // A block's height, plus the table head when it is the first line on the page.
  const ownCost = (at: number, page: DocumentBlock[]) => {
    const opensTable = blocks[at].kind === "line" && !page.some((b) => b.kind === "line");
    return heights[at] + (opensTable ? metrics.tableHead : 0);
  };

  blocks.forEach((block, at) => {
    let page = pages[pages.length - 1];
    const capacity = pages.length === 1 ? metrics.firstCapacity : metrics.restCapacity;
    // Keep the payment options heading with the first payment option.
    const keepWithNext = block.kind === "payment-options-heading" && at + 1 < blocks.length ? heights[at + 1] : 0;
    if (page.length > 0 && used + ownCost(at, page) + keepWithNext > capacity) {
      page = [];
      pages.push(page);
      used = 0;
    }
    used += ownCost(at, page);
    page.push(block);
  });

  return pages;
}
