import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";

import { QuotationDocument } from "./QuotationDocument";
import { updateEditorRow } from "~/utils/quotation-editor-state";

const documentProps = {
  title: "Quote",
  issuedAt: "2026-08-29T12:00:00.000Z",
  client: { name: "Client", location: null, document: null },
  lines: [
    {
      clientKey: "line-1",
      name: "Boiler",
      quantity: 1,
      descriptionLines: [],
      unitPriceCents: 100,
      imageUrl: "https://cdn.test/print.webp",
      thumbnailUrl: "https://cdn.test/thumb.webp",
    },
  ],
  paymentOptions: [],
  notes: null,
  rep: { brandPerson: "Rep", phone: "1", city: "City", email: "rep@example.com" },
};

test("QuotationDocument uses the thumbnail on screen and print asset in print mode", () => {
  const screen = renderToStaticMarkup(<QuotationDocument {...documentProps} />);
  const print = renderToStaticMarkup(<QuotationDocument {...documentProps} printMode />);

  expect(screen).toContain('src="https://cdn.test/thumb.webp"');
  expect(screen).not.toContain('src="https://cdn.test/print.webp"');
  expect(print).toContain('src="https://cdn.test/print.webp"');
  expect(print).not.toContain('src="https://cdn.test/thumb.webp"');
});

test("updating one editor row preserves unaffected row identity for memoized rendering", () => {
  const first = { clientKey: "first", name: "Boiler" };
  const unaffected = { clientKey: "second", name: "Pump" };

  const next = updateEditorRow([first, unaffected], "first", (row) => ({ ...row, name: "New boiler" }));

  expect(next[0]).not.toBe(first);
  expect(next[0].name).toBe("New boiler");
  expect(next[1]).toBe(unaffected);
});
