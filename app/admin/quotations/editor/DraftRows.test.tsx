// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { QUOTATION_FIELD, parseQuotationForm } from "../quotation-form";
import { LineDraftRow, PaymentOptionDraftRow } from "./DraftRows";
import { blankLineDraft, blankPaymentOptionDraft } from "./quotation-draft";

afterEach(cleanup);

const ignore = () => {};

// A save replaces every stored line and payment option with what the parser reads. A field name that the rows
// write and the parser does not read would delete those rows on the next autosave.
test("the parser reads back every line and payment option field the rows submit", () => {
  const line = {
    ...blankLineDraft(),
    name: "Boiler 400L",
    quantity: 2,
    priceText: "1.234,56",
    description: "Inox 316\nGarantia de 5 anos",
    catalogVariantId: 201,
    imageId: 7,
    openOnMount: false,
  };
  const option = { ...blankPaymentOptionDraft(), label: "À vista", amountText: "4.500,00", detail: "Pix" };
  const { container } = render(
    <form>
      <input type="hidden" name={QUOTATION_FIELD.clientId} value="3" />
      <input type="hidden" name={QUOTATION_FIELD.lineCount} value="1" />
      <input type="hidden" name={QUOTATION_FIELD.paymentOptionCount} value="1" />
      <LineDraftRow line={line} index={0} busy={false} uploading={false} onEdit={ignore} onUpload={ignore} />
      <PaymentOptionDraftRow option={option} index={0} onEdit={ignore} />
    </form>,
  );

  const parsed = parseQuotationForm(new FormData(container.querySelector("form")!));

  expect(parsed).toMatchObject({
    lines: [
      {
        name: "Boiler 400L",
        quantity: 2,
        descriptionLines: ["Inox 316", "Garantia de 5 anos"],
        unitPriceCents: 123456,
        catalogVariantId: 201,
        imageId: 7,
      },
    ],
    paymentOptions: [{ label: "À vista", amountCents: 450000, detail: "Pix" }],
  });
});
