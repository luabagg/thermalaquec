import type { QuotationStatus } from "@prisma/client";

import { calendarDayInputValue } from "~/lib/calendar-day";
import { centsToInputText, parseBRLToCents } from "~/lib/money";
import { readStringList, splitTextLines } from "~/lib/text-lines";

import type { DocumentClient, QuotationDocumentProps } from "../document/QuotationDocument";
import type { SalesRep } from "../issuer";
import type { StoredQuotation } from "../quotation.server";
import type { CatalogVariantOption } from "./catalog-variant-options";

// The editor keeps the quotation as a draft: form text as typed, plus the values the preview needs.
// Rows get a draft key when they enter the draft, so React keeps a row's state while rows move.

export type LineDraft = {
  draftKey: string;
  name: string;
  quantity: number;
  /** Textarea text, one bullet per line. */
  description: string;
  priceText: string;
  /** Last valid reading of `priceText`, so the preview keeps a price while the user types. */
  unitPriceCents: number;
  catalogVariantId: number | null;
  imageId: number | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  /** Only a line typed by hand starts open; saved and catalog lines start closed. */
  openOnMount: boolean;
};

export type PaymentOptionDraft = {
  draftKey: string;
  label: string;
  amountText: string;
  /** Last valid reading of `amountText`. */
  amountCents: number;
  detail: string;
};

export type QuotationDraft = {
  clientId: number;
  /** "YYYY-MM-DD", as the date input holds it. */
  issuedAt: string;
  status: QuotationStatus;
  notes: string;
  lines: LineDraft[];
  paymentOptions: PaymentOptionDraft[];
};

type HeaderField = "clientId" | "issuedAt" | "status" | "notes";

export type DraftEdit =
  | { type: "edit-header"; patch: Partial<Pick<QuotationDraft, HeaderField>> }
  | { type: "add-lines"; lines: LineDraft[] }
  | { type: "edit-line"; draftKey: string; patch: Partial<Omit<LineDraft, "draftKey">> }
  | { type: "remove-line"; draftKey: string }
  | { type: "add-payment-option"; option: PaymentOptionDraft }
  | { type: "edit-payment-option"; draftKey: string; patch: Partial<Omit<PaymentOptionDraft, "draftKey">> }
  | { type: "remove-payment-option"; draftKey: string };

export function newDraftKey() {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function storedQuotationToDraft(quotation: StoredQuotation): QuotationDraft {
  return {
    clientId: quotation.client.id,
    issuedAt: calendarDayInputValue(quotation.issuedAt),
    status: quotation.status,
    notes: quotation.notes ?? "",
    lines: quotation.lines.map(storedLineToDraft),
    paymentOptions: quotation.paymentOptions.map(storedPaymentOptionToDraft),
  };
}

function storedLineToDraft(line: StoredQuotation["lines"][number]): LineDraft {
  return {
    draftKey: String(line.id),
    name: line.name,
    quantity: line.quantity,
    description: readStringList(line.descriptionLines).join("\n"),
    priceText: centsToInputText(line.unitPriceCents),
    unitPriceCents: line.unitPriceCents,
    catalogVariantId: line.catalogVariantId,
    imageId: line.imageId,
    imageUrl: line.image?.location ?? null,
    thumbnailUrl: line.image?.thumbnail ?? null,
    openOnMount: false,
  };
}

function storedPaymentOptionToDraft(option: StoredQuotation["paymentOptions"][number]): PaymentOptionDraft {
  return {
    draftKey: String(option.id),
    label: option.label,
    amountText: centsToInputText(option.amountCents),
    amountCents: option.amountCents,
    detail: option.detail ?? "",
  };
}

export function catalogVariantToLineDraft(variant: CatalogVariantOption): LineDraft {
  const unitPriceCents = variant.unitPriceCents ?? 0;
  return {
    draftKey: newDraftKey(),
    name: variant.name,
    quantity: 1,
    description: variant.descriptionLines.join("\n"),
    priceText: centsToInputText(unitPriceCents),
    unitPriceCents,
    catalogVariantId: variant.variantId,
    imageId: variant.imageId,
    imageUrl: variant.imageUrl,
    thumbnailUrl: variant.thumbnailUrl,
    openOnMount: false,
  };
}

export function blankLineDraft(): LineDraft {
  return {
    draftKey: newDraftKey(),
    name: "",
    quantity: 1,
    description: "",
    priceText: "0,00",
    unitPriceCents: 0,
    catalogVariantId: null,
    imageId: null,
    imageUrl: null,
    thumbnailUrl: null,
    openOnMount: true,
  };
}

export function blankPaymentOptionDraft(): PaymentOptionDraft {
  return { draftKey: newDraftKey(), label: "À vista", amountText: "0,00", amountCents: 0, detail: "" };
}

/** Replaces one row and keeps every other row object, so memoized rows skip rendering. */
export function replaceDraftRow<T extends { draftKey: string }>(rows: T[], draftKey: string, replace: (row: T) => T): T[] {
  return rows.map((row) => (row.draftKey === draftKey ? replace(row) : row));
}

function editLine(line: LineDraft, patch: Partial<LineDraft>): LineDraft {
  const next = { ...line, ...patch };
  if (patch.priceText !== undefined) next.unitPriceCents = parseBRLToCents(patch.priceText) ?? line.unitPriceCents;
  return next;
}

function editPaymentOption(option: PaymentOptionDraft, patch: Partial<PaymentOptionDraft>): PaymentOptionDraft {
  const next = { ...option, ...patch };
  if (patch.amountText !== undefined) next.amountCents = parseBRLToCents(patch.amountText) ?? option.amountCents;
  return next;
}

/** The draft reducer. It must stay pure: build new rows, with their draft keys, before dispatching them. */
export function applyDraftEdit(draft: QuotationDraft, edit: DraftEdit): QuotationDraft {
  switch (edit.type) {
    case "edit-header":
      return { ...draft, ...edit.patch };
    case "add-lines":
      return { ...draft, lines: [...draft.lines, ...edit.lines] };
    case "edit-line":
      return { ...draft, lines: replaceDraftRow(draft.lines, edit.draftKey, (line) => editLine(line, edit.patch)) };
    case "remove-line":
      return { ...draft, lines: draft.lines.filter((line) => line.draftKey !== edit.draftKey) };
    case "add-payment-option":
      return { ...draft, paymentOptions: [...draft.paymentOptions, edit.option] };
    case "edit-payment-option":
      return {
        ...draft,
        paymentOptions: replaceDraftRow(draft.paymentOptions, edit.draftKey, (option) => editPaymentOption(option, edit.patch)),
      };
    case "remove-payment-option":
      return { ...draft, paymentOptions: draft.paymentOptions.filter((option) => option.draftKey !== edit.draftKey) };
  }
}

/** The printed document as the draft stands now, for the live preview. */
export function draftToDocument(
  draft: QuotationDraft,
  client: DocumentClient,
  salesRep: SalesRep,
): Omit<QuotationDocumentProps, "printMode"> {
  return {
    issuedAt: draft.issuedAt,
    client,
    lines: draft.lines.map((line) => ({
      rowKey: line.draftKey,
      name: line.name,
      quantity: line.quantity,
      descriptionLines: splitTextLines(line.description),
      unitPriceCents: line.unitPriceCents,
      imageUrl: line.imageUrl,
      thumbnailUrl: line.thumbnailUrl,
    })),
    paymentOptions: draft.paymentOptions.map((option) => ({
      rowKey: option.draftKey,
      label: option.label,
      amountCents: option.amountCents,
      detail: option.detail || null,
    })),
    notes: draft.notes || null,
    salesRep,
  };
}
