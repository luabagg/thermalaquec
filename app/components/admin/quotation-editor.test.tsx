import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test } from "vitest";

const root = resolve(process.cwd());
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

test("quotation editor rows are memoized", () => {
  const rows = read("app/components/admin/QuotationEditorRows.tsx");
  expect(rows).toContain("export const QuotationEditorLineRow = memo");
  expect(rows).toContain("export const QuotationEditorPaymentRow = memo");
});

test("quotation preview is deferred and editor route avoids time-based debounce", () => {
  const preview = read("app/components/admin/QuotationPreview.tsx");
  expect(preview).toContain("useDeferredValue");

  const route = read("app/routes/admin.quotations.$id.tsx");
  expect(route).not.toContain("useDebouncedValue");
  expect(route).not.toContain("120");
  expect(route).toContain("QuotationPreview");
  expect(route).toContain("useCallback");
});

test("document and print keys use stable row keys and thumbnail fallback", () => {
  const doc = read("app/components/admin/QuotationDocument.tsx");
  expect(doc).toContain("clientKey ?? `${line.name}-${line.quantity}-${line.unitPriceCents}`");
  expect(doc).toContain("thumbnailUrl ?? line.imageUrl");
  expect(doc).toContain("clientKey ?? `${opt.label}-${opt.amountCents}`");

  const printRoute = read("app/routes/admin.quotations.$id_.print.tsx");
  expect(printRoute).toContain("clientKey: String(line.id)");
  expect(printRoute).toContain("thumbnailUrl: line.Image?.thumbnail ?? null");
  expect(printRoute).toContain("clientKey: String(option.id)");
});
