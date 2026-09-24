// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { PRODUCT_FIELD, parseCatalogProductForm } from "../product-form";
import { blankVariantDraft } from "./variant-draft";
import { VariantDraftRow } from "./VariantDraftRow";

afterEach(cleanup);

const ignore = () => {};

// A save deletes every stored variant whose id the form does not send back, and an unchecked checkbox sends
// nothing. A field name that the rows write and the parser does not read would delete or hide variants.
test("the parser reads back every variant field the rows submit", () => {
  const stored = {
    ...blankVariantDraft("Boiler"),
    id: 7,
    name: "Boiler 400L",
    priceText: "1.234,56",
    attributesText: "Capacidade: 400L",
    description: "Inox 316\nGarantia de 5 anos",
    imageId: 9,
    active: true,
    openOnMount: false,
  };
  const added = { ...blankVariantDraft("Boiler"), name: "Boiler 600L", active: false };
  const { container } = render(
    <form>
      <input type="hidden" name={PRODUCT_FIELD.expectedUpdatedAt} value="2026-09-23T12:00:00.000Z" />
      <input type="hidden" name={PRODUCT_FIELD.name} value="Boiler" />
      <input type="hidden" name={PRODUCT_FIELD.variantCount} value="2" />
      {[stored, added].map((variant, index) => (
        <VariantDraftRow key={variant.draftKey} variant={variant} index={index} canRemove uploading={false} onChange={ignore} onRemove={ignore} onUpload={ignore} />
      ))}
    </form>,
  );

  const parsed = parseCatalogProductForm(new FormData(container.querySelector("form")!));

  expect(parsed.ok && parsed.content.variants).toEqual([
    {
      id: 7,
      name: "Boiler 400L",
      attributes: [{ name: "Capacidade", value: "400L" }],
      descriptionLines: ["Inox 316", "Garantia de 5 anos"],
      priceCents: 123456,
      imageId: 9,
      active: true,
    },
    { id: null, name: "Boiler 600L", attributes: [], descriptionLines: [], priceCents: null, imageId: null, active: false },
  ]);
});
