import type { Prisma, QuoteCatalogItem, QuoteClient, Quotation, QuotationLine, QuotationPaymentOption } from "@prisma/client";

import prisma from "~/libs/prisma/client.server";

export type QuotationWithRelations = Quotation & {
  client: QuoteClient;
  lines: QuotationLine[];
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
  return prisma.quoteCatalogItem.findMany({ orderBy: { name: "asc" } });
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

export async function listQuotations() {
  return prisma.quotation.findMany({
    include: { client: true, lines: true },
    orderBy: { issuedAt: "desc" },
  });
}

export async function getQuotation(id: number): Promise<QuotationWithRelations | null> {
  return prisma.quotation.findUnique({
    where: { id },
    include: {
      client: true,
      lines: { orderBy: { sortOrder: "asc" } },
      paymentOptions: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function createQuotation(data: { clientId: number; title?: string; notes?: string | null }) {
  const client = await prisma.quoteClient.findUniqueOrThrow({ where: { id: data.clientId } });
  return prisma.quotation.create({
    data: {
      clientId: client.id,
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
  data: {
    title?: string;
    issuedAt?: Date;
    notes?: string | null;
    status?: "draft" | "final";
    clientLocation?: string | null;
    clientDocument?: string | null;
  },
) {
  const quotation = await prisma.quotation.findUniqueOrThrow({ where: { id } });

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
      include: {
        client: true,
        lines: { orderBy: { sortOrder: "asc" } },
        paymentOptions: { orderBy: { sortOrder: "asc" } },
      },
    });
  });
}

export async function replaceQuotationLines(
  quotationId: number,
  lines: Array<{
    name: string;
    quantity: number;
    descriptionLines: string[];
    unitPriceCents: number;
    catalogItemId?: number | null;
  }>,
) {
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
      })),
    });
    return tx.quotationLine.findMany({
      where: { quotationId },
      orderBy: { sortOrder: "asc" },
    });
  });
}

export async function replacePaymentOptions(
  quotationId: number,
  options: Array<{ label: string; amountCents: number; detail?: string | null }>,
) {
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

export function lineTotalCents(line: Pick<QuotationLine, "quantity" | "unitPriceCents">) {
  return line.quantity * line.unitPriceCents;
}

export function quotationTotalCents(lines: Array<Pick<QuotationLine, "quantity" | "unitPriceCents">>) {
  return lines.reduce((sum, line) => sum + lineTotalCents(line), 0);
}

export function formatBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export function parseBRLToCents(value: string): number | null {
  const cleaned = value.replace(/[^\d,.-]/g, "").trim();
  if (!cleaned) return null;
  // Accept "146660,00" or "146660.00" or "146.660,00"
  let normalized = cleaned;
  if (cleaned.includes(",") && cleaned.includes(".")) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (cleaned.includes(",")) {
    normalized = cleaned.replace(",", ".");
  }
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

export function slugifyCatalog(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export type { QuoteCatalogItem, QuoteClient, Quotation, QuotationLine, QuotationPaymentOption, Prisma };
