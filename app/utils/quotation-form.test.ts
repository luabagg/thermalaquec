import { expect, test } from "vitest";

import { parseQuotationForm, todayInBrazil } from "./quotation-form";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const base = { clientId: "3", issuedAt: "2026-09-23", status: "draft", lineCount: "0", paymentCount: "0" };

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

test("a quotation created late in the evening in Brazil is dated that day, not the next UTC day", () => {
  // 22:30 in São Paulo (UTC-3) is already 01:30 of the next day in UTC.
  expect(todayInBrazil(new Date("2026-09-24T01:30:00.000Z")).toISOString()).toBe("2026-09-23T00:00:00.000Z");
  expect(todayInBrazil(new Date("2026-09-23T03:30:00.000Z")).toISOString()).toBe("2026-09-23T00:00:00.000Z");
});
