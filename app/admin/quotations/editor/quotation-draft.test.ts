import { expect, test } from "vitest";

import { applyDraftEdit, blankLineDraft, replaceDraftRow, type QuotationDraft } from "./quotation-draft";

test("replacing one draft row keeps every other row object, so memoized rows skip rendering", () => {
  const first = { draftKey: "first", name: "Boiler" };
  const unaffected = { draftKey: "second", name: "Pump" };

  const next = replaceDraftRow([first, unaffected], "first", (row) => ({ ...row, name: "New boiler" }));

  expect(next[0]).not.toBe(first);
  expect(next[0].name).toBe("New boiler");
  expect(next[1]).toBe(unaffected);
});

test("a typed price updates the line total, and a price the user is still typing keeps the last valid one", () => {
  const line = { ...blankLineDraft(), draftKey: "line" };
  const draft: QuotationDraft = { clientId: 1, issuedAt: "2026-09-23", status: "draft", notes: "", lines: [line], paymentOptions: [] };

  const priced = applyDraftEdit(draft, { type: "edit-line", draftKey: "line", patch: { priceText: "1.234,56" } });
  const typing = applyDraftEdit(priced, { type: "edit-line", draftKey: "line", patch: { priceText: "abc" } });

  expect(priced.lines[0].unitPriceCents).toBe(123456);
  expect(typing.lines[0]).toMatchObject({ priceText: "abc", unitPriceCents: 123456 });
});
