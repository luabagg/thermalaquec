import type { Prisma, QuotationStatus } from "@prisma/client";

import prisma from "~/libs/prisma/client.server";
import { clientFieldsSelect } from "~/models/client.server";
import { todayInBrazil } from "~/utils/quotation-form";

export const DEFAULT_WARRANTY_NOTES = [
  "Garantia de 3 anos nas bombas de calor",
  "Garantia de 5 anos nos componentes hidráulicos e acumulador",
  "Mão de obra, serviços elétricos, hidráulico, frete, guincho (se necessário) por conta da empresa",
  "Venda toda feita diretamente pela Thermal Aquecimento",
].join("\n");

/** Everything the editor and the printed document need. */
const quotationDocumentSelect = {
  id: true,
  issuedAt: true,
  status: true,
  notes: true,
  client: { select: clientFieldsSelect },
  lines: {
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      quantity: true,
      descriptionLines: true,
      unitPriceCents: true,
      catalogVariantId: true,
      imageId: true,
      image: { select: { location: true, thumbnail: true } },
    },
  },
  paymentOptions: {
    orderBy: { sortOrder: "asc" },
    select: { id: true, label: true, amountCents: true, detail: true },
  },
} satisfies Prisma.QuotationSelect;

export type QuotationDocumentRecord = Prisma.QuotationGetPayload<{ select: typeof quotationDocumentSelect }>;

export function getQuotation(id: number, ownerUserId: string) {
  return prisma.quotation.findFirst({ where: { id, ownerUserId }, select: quotationDocumentSelect });
}

export function listQuotations(ownerUserId: string) {
  return prisma.quotation.findMany({
    where: { ownerUserId },
    orderBy: [{ issuedAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      issuedAt: true,
      status: true,
      client: { select: { name: true, city: true, state: true } },
      lines: { select: { quantity: true, unitPriceCents: true } },
    },
  });
}

export async function createQuotation(data: { clientId: number; ownerUserId: string }) {
  return prisma.quotation.create({
    data: {
      clientId: data.clientId,
      ownerUserId: data.ownerUserId,
      issuedAt: todayInBrazil(),
      notes: DEFAULT_WARRANTY_NOTES,
      status: "draft",
    },
    select: { id: true },
  });
}

export async function deleteQuotation(id: number, ownerUserId: string) {
  const result = await prisma.quotation.deleteMany({ where: { id, ownerUserId } });
  return result.count > 0;
}

export type QuotationLineInput = {
  name: string;
  quantity: number;
  descriptionLines: string[];
  unitPriceCents: number;
  catalogVariantId: number | null;
  imageId: number | null;
};

export type QuotationPaymentInput = { label: string; amountCents: number; detail: string | null };

export type QuotationSaveInput = {
  quotationId: number;
  ownerUserId: string;
  clientId: number;
  issuedAt?: Date;
  status: QuotationStatus;
  notes: string | null;
  lines: QuotationLineInput[];
  paymentOptions: QuotationPaymentInput[];
};

export type QuotationSaveResult = { ok: true } | { ok: false; status: 400 | 404; error: string };

/** Keeps only the ids that still exist, so a line never fails on a catalog item or image deleted meanwhile. */
async function existingIds(tx: Prisma.TransactionClient, model: "catalogVariant" | "image", ids: (number | null)[]) {
  const wanted = [...new Set(ids.filter((id): id is number => id !== null))];
  if (wanted.length === 0) return new Set<number>();
  const rows =
    model === "catalogVariant"
      ? await tx.catalogVariant.findMany({ where: { id: { in: wanted } }, select: { id: true } })
      : await tx.image.findMany({ where: { id: { in: wanted } }, select: { id: true } });
  return new Set(rows.map((row) => row.id));
}

/**
 * Replaces the quotation's header, lines and payment options in one transaction.
 * Lines carry their own copy of name, price, bullets and image, so they need no server-side resolution.
 */
export async function saveQuotation(input: QuotationSaveInput): Promise<QuotationSaveResult> {
  return prisma.$transaction(async (tx) => {
    const owned = await tx.quotation.findFirst({
      where: { id: input.quotationId, ownerUserId: input.ownerUserId },
      select: { id: true },
    });
    if (!owned) return { ok: false, status: 404, error: "Orçamento não encontrado." };
    const client = await tx.client.findUnique({ where: { id: input.clientId }, select: { id: true } });
    if (!client) return { ok: false, status: 400, error: "Cliente não encontrado." };

    const [variantIds, imageIds] = await Promise.all([
      existingIds(tx, "catalogVariant", input.lines.map((line) => line.catalogVariantId)),
      existingIds(tx, "image", input.lines.map((line) => line.imageId)),
    ]);

    await tx.quotation.update({
      where: { id: input.quotationId },
      data: { clientId: input.clientId, issuedAt: input.issuedAt, status: input.status, notes: input.notes },
    });
    await tx.quotationLine.deleteMany({ where: { quotationId: input.quotationId } });
    await tx.quotationLine.createMany({
      data: input.lines.map((line, sortOrder) => ({
        quotationId: input.quotationId,
        sortOrder,
        name: line.name.trim(),
        quantity: Math.max(1, Math.trunc(line.quantity)),
        descriptionLines: line.descriptionLines,
        unitPriceCents: Math.max(0, Math.round(line.unitPriceCents)),
        catalogVariantId: line.catalogVariantId !== null && variantIds.has(line.catalogVariantId) ? line.catalogVariantId : null,
        imageId: line.imageId !== null && imageIds.has(line.imageId) ? line.imageId : null,
      })),
    });
    await tx.quotationPaymentOption.deleteMany({ where: { quotationId: input.quotationId } });
    await tx.quotationPaymentOption.createMany({
      data: input.paymentOptions.map((option, sortOrder) => ({
        quotationId: input.quotationId,
        sortOrder,
        label: option.label.trim(),
        amountCents: Math.max(0, Math.round(option.amountCents)),
        detail: option.detail?.trim() || null,
      })),
    });
    return { ok: true };
  }, { timeout: 20_000 });
}
