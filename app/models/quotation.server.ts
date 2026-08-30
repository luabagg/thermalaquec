import type { Prisma, QuoteCatalogItem, QuoteClient, Quotation, QuotationLine, QuotationPaymentOption } from "@prisma/client";

import prisma from "~/libs/prisma/client.server";
import {
  requireCatalogSelectionSecret,
  verifyCatalogSelectionToken,
} from "~/utils/catalog-selection-token.server";
import type { CatalogSelectionSnapshotEntry } from "~/utils/catalog-resolver";

export type QuotationWithRelations = Quotation & {
  client: QuoteClient;
  lines: (QuotationLine & { Image: { id: number; location: string; thumbnail: string | null } | null })[];
  paymentOptions: (QuotationPaymentOption & { clientKey?: string })[];
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

const quotationDetailInclude = {
  client: true,
  lines: { orderBy: { sortOrder: "asc" as const }, include: { Image: true } },
  paymentOptions: { orderBy: { sortOrder: "asc" as const } },
};

const quotationEditorSelect = {
  id: true,
  title: true,
  issuedAt: true,
  status: true,
  notes: true,
  client: {
    select: {
      id: true,
      name: true,
      location: true,
      document: true,
    },
  },
  lines: {
    orderBy: { sortOrder: "asc" as const },
    select: {
      id: true,
      sortOrder: true,
      name: true,
      quantity: true,
      descriptionLines: true,
      unitPriceCents: true,
      catalogItemId: true,
      catalogSelectionSnapshot: true,
      imageId: true,
      Image: {
        select: {
          location: true,
          thumbnail: true,
        },
      },
    },
  },
  paymentOptions: {
    orderBy: { sortOrder: "asc" as const },
    select: {
      id: true,
      sortOrder: true,
      label: true,
      amountCents: true,
      detail: true,
    },
  },
} satisfies Prisma.QuotationSelect;

const quoteCatalogEditorSelect = {
  id: true,
  slug: true,
  name: true,
  descriptionLines: true,
  defaultUnitPriceCents: true,
  imageId: true,
  Image: {
    select: {
      location: true,
      thumbnail: true,
    },
  },
} satisfies Prisma.QuoteCatalogItemSelect;

function toSnapshotArray(value: unknown): CatalogSelectionSnapshotEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Record<string, unknown>;
      return {
        optionSlug: String(row.optionSlug ?? ""),
        optionLabel: String(row.optionLabel ?? ""),
        valueSlug: String(row.valueSlug ?? ""),
        valueLabel: String(row.valueLabel ?? ""),
      };
    })
    .filter((entry): entry is CatalogSelectionSnapshotEntry => entry !== null);
}

type QuotationEditorLineInput = {
  id?: number | null;
  name: string;
  quantity: number;
  descriptionLines: string[];
  unitPriceCents: number;
  catalogItemId?: number | null;
  catalogResolutionToken?: string | null;
  imageId?: number | null;
};

function resolveLineSnapshot(
  line: QuotationEditorLineInput,
  existingSnapshots: Map<number, CatalogSelectionSnapshotEntry[]>,
): CatalogSelectionSnapshotEntry[] | { error: string } {
  if (line.id != null) {
    const existing = existingSnapshots.get(line.id);
    if (existing === undefined) return { error: "Invalid quotation line" };
    return existing;
  }

  const token = line.catalogResolutionToken?.trim();
  if (token) {
    if (line.catalogItemId == null) return { error: "Invalid catalog selection" };
    try {
      const payload = verifyCatalogSelectionToken(token, requireCatalogSelectionSecret());
      if (payload.catalogItemId !== line.catalogItemId) return { error: "Invalid catalog selection" };
      return payload.selectionSnapshot;
    } catch {
      return { error: "Invalid catalog selection" };
    }
  }

  if (line.catalogItemId != null) return { error: "Invalid catalog selection" };
  return [];
}

function normalizeEditorLine(
  quotationId: number,
  line: {
    name: string;
    quantity: number;
    descriptionLines: string[];
    unitPriceCents: number;
    catalogItemId?: number | null;
    catalogSelectionSnapshot: CatalogSelectionSnapshotEntry[];
    imageId?: number | null;
  },
  sortOrder: number,
) {
  return {
    quotationId,
    sortOrder,
    name: line.name.trim(),
    quantity: Math.max(1, line.quantity),
    descriptionLines: line.descriptionLines,
    unitPriceCents: Math.max(0, line.unitPriceCents),
    catalogItemId: line.catalogItemId ?? null,
    catalogSelectionSnapshot: line.catalogSelectionSnapshot,
    imageId: line.imageId ?? null,
  };
}

function normalizeEditorPaymentOption(
  quotationId: number,
  option: { label: string; amountCents: number; detail?: string | null },
  sortOrder: number,
) {
  return {
    quotationId,
    sortOrder,
    label: option.label.trim(),
    amountCents: Math.max(0, option.amountCents),
    detail: option.detail?.trim() || null,
  };
}

async function findOwnedQuotation(id: number, ownerUserId: string) {
  return prisma.quotation.findFirst({
    where: { id, ownerUserId },
    select: { id: true, clientId: true },
  });
}

export type QuotationEditorSaveInput = {
  quotationId: number;
  ownerUserId: string;
  revision: number;
  intent: "save" | "save-print" | "autosave";
  title: string;
  issuedAt?: Date;
  status: Quotation["status"];
  location: string | null;
  document: string | null;
  notes: string | null;
  lines: Array<QuotationEditorLineInput>;
  paymentOptions: Array<{ label: string; amountCents: number; detail?: string | null }>;
};

export type QuotationEditorSaveResult =
  | { ok: true; quotationId: number; revision: number; redirectTo?: string }
  | { ok: false; status: number; error: string };

export async function saveQuotation(input: QuotationEditorSaveInput): Promise<QuotationEditorSaveResult> {
  if (input.intent !== "save" && input.intent !== "save-print" && input.intent !== "autosave") {
    return { ok: false, status: 400, error: "Unknown intent" };
  }

  const normalizedTitle = input.title.trim();
  const result = await prisma.$transaction(async (tx) => {
    const owned = await tx.quotation.findFirst({
      where: { id: input.quotationId, ownerUserId: input.ownerUserId },
      select: { id: true, clientId: true },
    });
    if (!owned) return null;

    const existingLines = await tx.quotationLine.findMany({
      where: { quotationId: input.quotationId },
      select: { id: true, catalogSelectionSnapshot: true },
    });
    const existingSnapshots = new Map(
      existingLines.map((line) => [line.id, toSnapshotArray(line.catalogSelectionSnapshot)]),
    );

    const normalizedLines = [];
    for (const line of input.lines) {
      const snapshot = resolveLineSnapshot(line, existingSnapshots);
      if ("error" in snapshot) return { error: snapshot.error } as const;
      normalizedLines.push({ ...line, catalogSelectionSnapshot: snapshot });
    }

    await tx.quoteClient.update({
      where: { id: owned.clientId },
      data: {
        location: input.location?.trim() || null,
        document: input.document?.trim() || null,
      },
    });

    await tx.quotation.update({
      where: { id: input.quotationId },
      data: {
        title: normalizedTitle,
        issuedAt: input.issuedAt,
        status: input.status,
        notes: input.notes,
      },
    });

    await tx.quotationLine.deleteMany({ where: { quotationId: input.quotationId } });
    if (normalizedLines.length > 0) {
      await tx.quotationLine.createMany({
        data: normalizedLines.map((line, index) => normalizeEditorLine(input.quotationId, line, index)),
      });
    }

    await tx.quotationPaymentOption.deleteMany({ where: { quotationId: input.quotationId } });
    if (input.paymentOptions.length > 0) {
      await tx.quotationPaymentOption.createMany({
        data: input.paymentOptions.map((option, index) =>
          normalizeEditorPaymentOption(input.quotationId, option, index),
        ),
      });
    }

    return { quotationId: input.quotationId, revision: input.revision };
  });

  if (result && "error" in result && typeof result.error === "string") {
    return { ok: false, status: 400, error: result.error };
  }

  if (!result) {
    return { ok: false, status: 404, error: "Not found" };
  }

  return {
    ok: true,
    quotationId: result.quotationId,
    revision: result.revision,
    ...(input.intent === "save-print" ? { redirectTo: `/admin/quotations/${input.quotationId}/print?autoprint=1` } : {}),
  };
}

export async function loadQuotationEditorData(ownerUserId: string, quotationId: number) {
  const quotationPromise = prisma.quotation.findFirst({
    where: { id: quotationId, ownerUserId },
    select: quotationEditorSelect,
  });
  const catalogPromise = prisma.quoteCatalogItem.findMany({
    where: { archivedAt: null },
    orderBy: { name: "asc" },
    select: quoteCatalogEditorSelect,
  });

  const [quotation, catalog] = await Promise.all([quotationPromise, catalogPromise]);
  return { quotation, catalog };
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

export const DEFAULT_WARRANTY_NOTES = [
  "Garantia de 3 anos nas bombas de calor",
  "Garantia de 5 anos nos componentes hidráulicos e acumulador",
  "Mão de obra, serviços elétricos, hidráulico, frete, guincho (se necessário) por conta da empresa",
  "Venda toda feita diretamente pela Thermal Aquecimento",
].join("\n");

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
