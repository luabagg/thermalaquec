import { parseCalendarDay } from "~/lib/calendar-day";
import { parseBRLToCents } from "~/lib/money";
import { splitTextLines } from "~/lib/text-lines";

import type { LineContent, PaymentOptionContent, QuotationContent } from "./quotation-content";

// The editor form writes these names and `parseQuotationForm` reads them. A save replaces every line and
// payment option, so a name that differs between the two sides deletes the rows it misses.

export const QUOTATION_FIELD = {
  clientId: "clientId",
  issuedAt: "issuedAt",
  status: "status",
  notes: "notes",
  lineCount: "lineCount",
  paymentOptionCount: "paymentOptionCount",
} as const;

type LineField = "name" | "quantity" | "price" | "description" | "catalogVariantId" | "imageId";
type PaymentOptionField = "label" | "amount" | "detail";

export function lineFieldName(index: number, field: LineField) {
  return `line.${index}.${field}`;
}

export function paymentOptionFieldName(index: number, field: PaymentOptionField) {
  return `paymentOption.${index}.${field}`;
}

export const STALE_EDITOR_MESSAGE = "Esta página do editor está desatualizada. Recarregue a página e salve de novo.";

function text(form: FormData, key: string) {
  return String(form.get(key) ?? "");
}

function positiveId(form: FormData, key: string) {
  const id = Number(text(form, key));
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * 0 to count - 1, for the count of rows the form says it submitted. Null when the count is missing or not a
 * whole number: a form from an older page, which names its fields differently. Reading that as zero rows
 * would delete every stored row.
 */
function submittedRowIndexes(form: FormData, countField: string) {
  const count = form.has(countField) ? Number(text(form, countField)) : NaN;
  if (!Number.isInteger(count) || count < 0) return null;
  return Array.from({ length: count }, (_, index) => index);
}

function readLine(form: FormData, index: number): LineContent | null {
  const name = text(form, lineFieldName(index, "name")).trim();
  if (!name) return null;
  return {
    name,
    quantity: Math.max(1, Math.trunc(Number(text(form, lineFieldName(index, "quantity"))) || 1)),
    descriptionLines: splitTextLines(text(form, lineFieldName(index, "description"))),
    unitPriceCents: parseBRLToCents(text(form, lineFieldName(index, "price"))) ?? 0,
    catalogVariantId: positiveId(form, lineFieldName(index, "catalogVariantId")),
    imageId: positiveId(form, lineFieldName(index, "imageId")),
  };
}

function readPaymentOption(form: FormData, index: number): PaymentOptionContent | null {
  const label = text(form, paymentOptionFieldName(index, "label")).trim();
  if (!label) return null;
  return {
    label,
    amountCents: parseBRLToCents(text(form, paymentOptionFieldName(index, "amount"))) ?? 0,
    detail: text(form, paymentOptionFieldName(index, "detail")).trim() || null,
  };
}

/**
 * Reads the quotation editor form. Rows without a name are skipped: autosave submits
 * without browser validation, and a nameless row has nothing to print.
 */
export function parseQuotationForm(form: FormData): QuotationContent | { error: string } {
  const clientId = positiveId(form, QUOTATION_FIELD.clientId);
  if (clientId === null) return { error: "Selecione um cliente." };
  const lineIndexes = submittedRowIndexes(form, QUOTATION_FIELD.lineCount);
  const paymentOptionIndexes = submittedRowIndexes(form, QUOTATION_FIELD.paymentOptionCount);
  if (!lineIndexes || !paymentOptionIndexes) return { error: STALE_EDITOR_MESSAGE };
  return {
    clientId,
    issuedAt: parseCalendarDay(text(form, QUOTATION_FIELD.issuedAt)),
    status: text(form, QUOTATION_FIELD.status) === "final" ? "final" : "draft",
    notes: text(form, QUOTATION_FIELD.notes).trim() || null,
    lines: lineIndexes.flatMap((index) => readLine(form, index) ?? []),
    paymentOptions: paymentOptionIndexes.flatMap((index) => readPaymentOption(form, index) ?? []),
  };
}
