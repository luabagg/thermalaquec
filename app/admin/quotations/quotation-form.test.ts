import { expect, test } from "vitest";

import { STALE_EDITOR_MESSAGE, parseQuotationForm } from "./quotation-form";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const base = { clientId: "3", issuedAt: "2026-09-23", status: "draft", lineCount: "0", paymentOptionCount: "0" };

test("a quotation needs a client", () => {
  expect(parseQuotationForm(form({ ...base, clientId: "" }))).toEqual({ error: "Selecione um cliente." });
});

test("the issue date is kept as the calendar day typed, whatever the server time zone", () => {
  const parsed = parseQuotationForm(form(base));

  expect("error" in parsed ? null : parsed.issuedAt?.toISOString()).toBe("2026-09-23T00:00:00.000Z");
});

test("lines keep their order, price in cents and catalog link; nameless rows are skipped", () => {
  const parsed = parseQuotationForm(
    form({
      ...base,
      lineCount: "3",
      "line.0.name": "Boiler 400L",
      "line.0.quantity": "2",
      "line.0.price": "1.234,56",
      "line.0.description": "Inox 316\n\n Garantia ",
      "line.0.catalogVariantId": "201",
      "line.1.name": "   ",
      "line.2.name": "Mão de obra",
      "line.2.quantity": "0",
      "line.2.catalogVariantId": "abc",
    }),
  );

  expect("error" in parsed ? null : parsed.lines).toEqual([
    { name: "Boiler 400L", quantity: 2, descriptionLines: ["Inox 316", "Garantia"], unitPriceCents: 123456, catalogVariantId: 201, imageId: null },
    { name: "Mão de obra", quantity: 1, descriptionLines: [], unitPriceCents: 0, catalogVariantId: null, imageId: null },
  ]);
});

// A page loaded before a deploy can post row counts under other names. Reading a missing count as zero rows
// would make the save delete every stored line or payment option.
test("a form without a row count is refused, not read as zero rows", () => {
  const olderPage = { clientId: "3", issuedAt: "2026-09-23", status: "draft", lineCount: "0", paymentCount: "2" };

  expect(parseQuotationForm(form(olderPage))).toEqual({ error: STALE_EDITOR_MESSAGE });
  expect(parseQuotationForm(form({ ...base, lineCount: "abc" }))).toEqual({ error: STALE_EDITOR_MESSAGE });
});
