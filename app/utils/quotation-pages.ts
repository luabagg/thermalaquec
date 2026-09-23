/** One unbreakable piece of the printed quotation, in document order. */
export type QuoteBlock =
  | { kind: "line"; index: number }
  | { kind: "summary" }
  | { kind: "payments-head" }
  | { kind: "payment"; index: number };

export type PageMetrics = {
  /** Content height available below the full header on page 1. */
  firstCapacity: number;
  /** Content height available below the compact header on later pages. */
  restCapacity: number;
  /** Height of the table head, which each page repeats above its lines. */
  tableHead: number;
};

export function buildQuoteBlocks(lineCount: number, paymentCount: number): QuoteBlock[] {
  const blocks: QuoteBlock[] = [];
  for (let index = 0; index < lineCount; index++) blocks.push({ kind: "line", index });
  blocks.push({ kind: "summary" });
  if (paymentCount > 0) blocks.push({ kind: "payments-head" });
  for (let index = 0; index < paymentCount; index++) blocks.push({ kind: "payment", index });
  return blocks;
}

/**
 * Packs blocks into pages greedily. A page that holds lines also pays for the
 * table head. The payments heading never ends a page alone. A block taller
 * than a page gets a page of its own and overflows it.
 */
export function paginateQuoteBlocks(
  blocks: QuoteBlock[],
  heights: number[],
  metrics: PageMetrics,
): QuoteBlock[][] {
  const pages: QuoteBlock[][] = [[]];
  let used = 0;

  // A block's height, plus the table head when it is the first line on the page.
  const ownCost = (at: number, page: QuoteBlock[]) => {
    const opensTable = blocks[at].kind === "line" && !page.some((b) => b.kind === "line");
    return heights[at] + (opensTable ? metrics.tableHead : 0);
  };

  blocks.forEach((block, at) => {
    let page = pages[pages.length - 1];
    const capacity = pages.length === 1 ? metrics.firstCapacity : metrics.restCapacity;
    // Keep the payments heading with the first payment row.
    const keepWithNext = block.kind === "payments-head" && at + 1 < blocks.length ? heights[at + 1] : 0;
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
