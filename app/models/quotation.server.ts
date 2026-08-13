import type { Prisma, QuoteCatalogItem, QuoteClient, Quotation, QuotationLine, QuotationPaymentOption } from "@prisma/client";

import prisma from "~/libs/prisma/client.server";

export type QuotationWithRelations = Quotation & {
  client: QuoteClient;
  lines: (QuotationLine & { Image: { id: number; location: string } | null })[];
  paymentOptions: QuotationPaymentOption[];
};

export async function listQuoteClients() {
  return prisma.quoteClient.findMany({ orderBy: { name: "asc" } });
}

export async function getQuoteClient(id: number) {
  return prisma.quoteClient.findUnique({ where: { id } });
}

export async function createQuoteClient(data: { name: string; location?: string | null; document?: string | null }) {
  return prisma.quoteClient.create({
    data: {
      name: data.name.trim(),
      location: data.location?.trim() || null,
      document: data.document?.trim() || null,
    },
  });
}

export async function updateQuoteClient(
  id: number,
  data: { name: string; location?: string | null; document?: string | null },
) {
  return prisma.quoteClient.update({
    where: { id },
    data: {
      name: data.name.trim(),
      location: data.location?.trim() || null,
      document: data.document?.trim() || null,
    },
  });
}

export async function listCatalogItems() {
  return prisma.quoteCatalogItem.findMany({
    orderBy: { name: "asc" },
    include: { Image: true },
  });
}

export async function getCatalogItem(id: number) {
  return prisma.quoteCatalogItem.findUnique({ where: { id } });
}

export async function createCatalogItem(data: {
  slug: string;
  name: string;
  descriptionLines?: string[];
  defaultUnitPriceCents?: number | null;
}) {
  return prisma.quoteCatalogItem.create({
    data: {
      slug: data.slug,
      name: data.name.trim(),
      descriptionLines: data.descriptionLines ?? [],
      defaultUnitPriceCents: data.defaultUnitPriceCents ?? null,
    },
  });
}

export async function updateCatalogItem(
  id: number,
  data: {
    name: string;
    descriptionLines?: string[];
    defaultUnitPriceCents?: number | null;
  },
) {
  return prisma.quoteCatalogItem.update({
    where: { id },
    data: {
      name: data.name.trim(),
      descriptionLines: data.descriptionLines ?? [],
      defaultUnitPriceCents: data.defaultUnitPriceCents ?? null,
    },
  });
}

const quotationDetailInclude = {
  client: true,
  lines: { orderBy: { sortOrder: "asc" as const }, include: { Image: true } },
  paymentOptions: { orderBy: { sortOrder: "asc" as const } },
};

async function findOwnedQuotation(id: number, ownerUserId: string) {
  return prisma.quotation.findFirst({
    where: { id, ownerUserId },
    select: { id: true, clientId: true },
  });
}

export async function listQuotations(ownerUserId: string) {
  return prisma.quotation.findMany({
    where: { ownerUserId },
    include: { client: true, lines: true },
    orderBy: { issuedAt: "desc" },
  });
}

export async function getQuotation(id: number, ownerUserId: string): Promise<QuotationWithRelations | null> {
  return prisma.quotation.findFirst({
    where: { id, ownerUserId },
    include: quotationDetailInclude,
  });
}

export async function createQuotation(data: {
  clientId: number;
  ownerUserId: string;
  title?: string;
  notes?: string | null;
}) {
  const client = await prisma.quoteClient.findUniqueOrThrow({ where: { id: data.clientId } });
  return prisma.quotation.create({
    data: {
      clientId: client.id,
      ownerUserId: data.ownerUserId,
      title: (data.title?.trim() || client.name).trim(),
      issuedAt: new Date(),
      notes: data.notes ?? DEFAULT_WARRANTY_NOTES,
      status: "draft",
    },
  });
}

export const DEFAULT_WARRANTY_NOTES =
  "Garantia de 3 anos nas bombas de calor. Garantia de 5 anos nos componentes hidráulicos e acumulador. Mão de obra, serviços elétricos, hidráulico, frete, guincho (se necessário) por conta da empresa. Venda toda feita diretamente pela Thermal Aquecimento.";

export async function updateQuotationMeta(
  id: number,
  ownerUserId: string,
  data: {
    title?: string;
    issuedAt?: Date;
    notes?: string | null;
    status?: "draft" | "final";
    clientLocation?: string | null;
    clientDocument?: string | null;
  },
) {
  const quotation = await findOwnedQuotation(id, ownerUserId);
  if (!quotation) return null;

  return prisma.$transaction(async (tx) => {
    if (data.clientLocation !== undefined || data.clientDocument !== undefined) {
      await tx.quoteClient.update({
        where: { id: quotation.clientId },
        data: {
          ...(data.clientLocation !== undefined ? { location: data.clientLocation?.trim() || null } : {}),
          ...(data.clientDocument !== undefined ? { document: data.clientDocument?.trim() || null } : {}),
        },
      });
    }

    return tx.quotation.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title.trim() } : {}),
        ...(data.issuedAt !== undefined ? { issuedAt: data.issuedAt } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
      include: quotationDetailInclude,
    });
  });
}

export async function replaceQuotationLines(
  quotationId: number,
  ownerUserId: string,
  lines: Array<{
    name: string;
    quantity: number;
    descriptionLines: string[];
    unitPriceCents: number;
    catalogItemId?: number | null;
    imageId?: number | null;
  }>,
) {
  const owned = await findOwnedQuotation(quotationId, ownerUserId);
  if (!owned) return null;

  return prisma.$transaction(async (tx) => {
    await tx.quotationLine.deleteMany({ where: { quotationId } });
    if (lines.length === 0) return [];
    await tx.quotationLine.createMany({
      data: lines.map((line, index) => ({
        quotationId,
        sortOrder: index,
        name: line.name.trim(),
        quantity: Math.max(1, line.quantity),
        descriptionLines: line.descriptionLines,
        unitPriceCents: Math.max(0, line.unitPriceCents),
        catalogItemId: line.catalogItemId ?? null,
        imageId: line.imageId ?? null,
      })),
    });
    return tx.quotationLine.findMany({
      where: { quotationId },
      orderBy: { sortOrder: "asc" },
      include: { Image: true },
    });
  });
}

export async function appendQuotationLine(
  quotationId: number,
  ownerUserId: string,
  line: {
    name: string;
    quantity?: number;
    descriptionLines?: string[];
    unitPriceCents?: number;
    catalogItemId?: number | null;
    imageId?: number | null;
  },
) {
  const owned = await findOwnedQuotation(quotationId, ownerUserId);
  if (!owned) return null;

  const max = await prisma.quotationLine.aggregate({
    where: { quotationId },
    _max: { sortOrder: true },
  });
  return prisma.quotationLine.create({
    data: {
      quotationId,
      sortOrder: (max._max.sortOrder ?? -1) + 1,
      name: line.name.trim(),
      quantity: Math.max(1, line.quantity ?? 1),
      descriptionLines: line.descriptionLines ?? [],
      unitPriceCents: Math.max(0, line.unitPriceCents ?? 0),
      catalogItemId: line.catalogItemId ?? null,
      imageId: line.imageId ?? null,
    },
    include: { Image: true },
  });
}

export async function deleteQuotationLine(lineId: number) {
  await prisma.quotationLine.delete({ where: { id: lineId } });
}

export async function deleteQuotationLineForQuotation(
  quotationId: number,
  ownerUserId: string,
  lineId: number,
) {
  const owned = await findOwnedQuotation(quotationId, ownerUserId);
  if (!owned) return false;

  const line = await prisma.quotationLine.findFirst({
    where: { id: lineId, quotationId },
  });
  if (!line) return false;
  await prisma.quotationLine.delete({ where: { id: lineId } });
  return true;
}

export async function setQuotationLineImage(lineId: number, imageId: number | null) {
  return prisma.quotationLine.update({
    where: { id: lineId },
    data: { imageId },
    include: { Image: true },
  });
}

export async function setQuotationLineImageForQuotation(
  quotationId: number,
  ownerUserId: string,
  lineId: number,
  imageId: number | null,
) {
  const owned = await findOwnedQuotation(quotationId, ownerUserId);
  if (!owned) return null;

  const line = await prisma.quotationLine.findFirst({
    where: { id: lineId, quotationId },
  });
  if (!line) return null;
  return prisma.quotationLine.update({
    where: { id: lineId },
    data: { imageId },
    include: { Image: true },
  });
}

export async function setCatalogItemImage(catalogItemId: number, imageId: number | null) {
  return prisma.quoteCatalogItem.update({
    where: { id: catalogItemId },
    data: { imageId },
    include: { Image: true },
  });
}

export async function appendPaymentOption(
  quotationId: number,
  ownerUserId: string,
  option: { label: string; amountCents?: number; detail?: string | null },
) {
  const owned = await findOwnedQuotation(quotationId, ownerUserId);
  if (!owned) return null;

  const max = await prisma.quotationPaymentOption.aggregate({
    where: { quotationId },
    _max: { sortOrder: true },
  });
  return prisma.quotationPaymentOption.create({
    data: {
      quotationId,
      sortOrder: (max._max.sortOrder ?? -1) + 1,
      label: option.label.trim(),
      amountCents: Math.max(0, option.amountCents ?? 0),
      detail: option.detail?.trim() || null,
    },
  });
}

export async function deletePaymentOption(optionId: number) {
  await prisma.quotationPaymentOption.delete({ where: { id: optionId } });
}

export async function deletePaymentOptionForQuotation(
  quotationId: number,
  ownerUserId: string,
  optionId: number,
) {
  const owned = await findOwnedQuotation(quotationId, ownerUserId);
  if (!owned) return false;

  const option = await prisma.quotationPaymentOption.findFirst({
    where: { id: optionId, quotationId },
  });
  if (!option) return false;
  await prisma.quotationPaymentOption.delete({ where: { id: optionId } });
  return true;
}

export async function deleteQuotation(id: number, ownerUserId: string) {
  const result = await prisma.quotation.deleteMany({ where: { id, ownerUserId } });
  return result.count > 0;
}

export async function replacePaymentOptions(
  quotationId: number,
  ownerUserId: string,
  options: Array<{ label: string; amountCents: number; detail?: string | null }>,
) {
  const owned = await findOwnedQuotation(quotationId, ownerUserId);
  if (!owned) return null;

  return prisma.$transaction(async (tx) => {
    await tx.quotationPaymentOption.deleteMany({ where: { quotationId } });
    if (options.length === 0) return [];
    await tx.quotationPaymentOption.createMany({
      data: options.map((opt, index) => ({
        quotationId,
        sortOrder: index,
        label: opt.label.trim(),
        amountCents: Math.max(0, opt.amountCents),
        detail: opt.detail?.trim() || null,
      })),
    });
    return tx.quotationPaymentOption.findMany({
      where: { quotationId },
      orderBy: { sortOrder: "asc" },
    });
  });
}

export {
  formatBRL,
  lineTotalCents,
  parseBRLToCents,
  quotationTotalCents,
  slugifyCatalog,
} from "~/utils/quotation";

export type { QuoteCatalogItem, QuoteClient, Quotation, QuotationLine, QuotationPaymentOption, Prisma };
