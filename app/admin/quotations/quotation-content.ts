import type { QuotationStatus } from "@prisma/client";

/** What a quotation says: the editor form submits it and `saveQuotation` stores it. */
export type QuotationContent = {
  clientId: number;
  /** Absent keeps the stored date. */
  issuedAt?: Date;
  status: QuotationStatus;
  notes: string | null;
  lines: LineContent[];
  paymentOptions: PaymentOptionContent[];
};

/** A line carries its own copy of name, price, bullets and image, so catalog edits never change it. */
export type LineContent = {
  name: string;
  quantity: number;
  descriptionLines: string[];
  unitPriceCents: number;
  catalogVariantId: number | null;
  imageId: number | null;
};

export type PaymentOptionContent = { label: string; amountCents: number; detail: string | null };

type PricedLine = Pick<LineContent, "quantity" | "unitPriceCents">;

export function lineTotalCents(line: PricedLine) {
  return line.quantity * line.unitPriceCents;
}

export function quotationTotalCents(lines: PricedLine[]) {
  return lines.reduce((sum, line) => sum + lineTotalCents(line), 0);
}
