import type { QuotationStatus } from "@prisma/client";

import { parseBRLToCents } from "~/utils/quotation";

export type ParsedQuotationForm = {
  clientId: number;
  issuedAt: Date | undefined;
  status: QuotationStatus;
  notes: string | null;
  lines: {
    name: string;
    quantity: number;
    descriptionLines: string[];
    unitPriceCents: number;
    catalogVariantId: number | null;
    imageId: number | null;
  }[];
  paymentOptions: { label: string; amountCents: number; detail: string | null }[];
};

/** Today's calendar day in Brazil, at UTC midnight: the value a DATE column stores for that day. */
export function todayInBrazil(now = new Date()) {
  // en-CA formats as YYYY-MM-DD.
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(now);
  return new Date(`${day}T00:00:00.000Z`);
}

function text(form: FormData, key: string) {
  return String(form.get(key) ?? "");
}

function positiveId(form: FormData, key: string) {
  const id = Number(text(form, key));
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function splitBullets(raw: string) {
  return raw
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * Reads the quotation editor form. Rows without a name are skipped: autosave submits
 * without browser validation, and a nameless row has nothing to print.
 */
export function parseQuotationForm(form: FormData): ParsedQuotationForm | { error: string } {
  const clientId = positiveId(form, "clientId");
  if (clientId === null) return { error: "Selecione um cliente." };
  const issuedRaw = text(form, "issuedAt");
  // A calendar date: store it at UTC midnight, which is what the DATE column keeps.
  const issuedAt = /^\d{4}-\d{2}-\d{2}$/.test(issuedRaw) ? new Date(`${issuedRaw}T00:00:00.000Z`) : undefined;

  const lines = [];
  for (let i = 0; i < Number(text(form, "lineCount")); i++) {
    const name = text(form, `line.${i}.name`).trim();
    if (!name) continue;
    lines.push({
      name,
      quantity: Math.max(1, Math.trunc(Number(text(form, `line.${i}.quantity`)) || 1)),
      descriptionLines: splitBullets(text(form, `line.${i}.description`)),
      unitPriceCents: parseBRLToCents(text(form, `line.${i}.price`)) ?? 0,
      catalogVariantId: positiveId(form, `line.${i}.catalogVariantId`),
      imageId: positiveId(form, `line.${i}.imageId`),
    });
  }

  const paymentOptions = [];
  for (let i = 0; i < Number(text(form, "paymentCount")); i++) {
    const label = text(form, `pay.${i}.label`).trim();
    if (!label) continue;
    paymentOptions.push({
      label,
      amountCents: parseBRLToCents(text(form, `pay.${i}.amount`)) ?? 0,
      detail: text(form, `pay.${i}.detail`).trim() || null,
    });
  }

  return {
    clientId,
    issuedAt,
    status: text(form, "status") === "final" ? "final" : "draft",
    notes: text(form, "notes").trim() || null,
    lines,
    paymentOptions,
  };
}
