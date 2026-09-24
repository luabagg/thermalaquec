import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";

import { QuotationDocument } from "./QuotationDocument";

const documentProps = {
  issuedAt: "2026-08-29T00:00:00.000Z",
  client: {
    name: "Client",
    taxId: null,
    phone: null,
    street: null,
    number: null,
    complement: null,
    district: null,
    city: "Farroupilha",
    state: "RS",
  },
  lines: [
    {
      rowKey: "line-1",
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
  salesRep: { name: "Rep", phone: "1", city: "City", email: "rep@example.com" },
};

test("QuotationDocument uses the thumbnail on screen and print asset in print mode", () => {
  const screen = renderToStaticMarkup(<QuotationDocument {...documentProps} />);
  const print = renderToStaticMarkup(<QuotationDocument {...documentProps} printMode />);

  expect(screen).toContain('src="https://cdn.test/thumb.webp"');
  expect(screen).not.toContain('src="https://cdn.test/print.webp"');
  expect(print).toContain('src="https://cdn.test/print.webp"');
  expect(print).not.toContain('src="https://cdn.test/thumb.webp"');
});
