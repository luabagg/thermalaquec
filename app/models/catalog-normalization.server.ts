import { Prisma } from "@prisma/client";

import prisma from "~/libs/prisma/client.server";
import {
  CATALOG_NORMALIZATION_SCHEMA_VERSION,
  digestCatalogSource,
  validateCatalogProposal,
  type CatalogNormalizationProposal,
  type CatalogNormalizationSourceSnapshot,
  type CatalogProposalError,
} from "~/utils/catalog-normalization-contract";

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string") ? value : [];
}

type ValidateCatalogProposalInput = {
  source: CatalogNormalizationSourceSnapshot;
  proposal: CatalogNormalizationProposal;
};

type CatalogProposalValidationResult =
  | { ok: true; runId: number }
  | { ok: false; errors: CatalogProposalError[] };

export async function exportCatalogNormalizationSource(): Promise<CatalogNormalizationSourceSnapshot> {
  const items = await prisma.quoteCatalogItem.findMany({
    where: { archivedAt: null, options: { none: {} } },
    orderBy: { id: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      descriptionLines: true,
      defaultUnitPriceCents: true,
      imageId: true,
    },
  });

  return {
    schemaVersion: CATALOG_NORMALIZATION_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    items: items.map((item) => ({ ...item, descriptionLines: toStringArray(item.descriptionLines) })),
  };
}

export async function validateAndRecordCatalogProposal({ source, proposal }: ValidateCatalogProposalInput): Promise<CatalogProposalValidationResult> {
  const validation = validateCatalogProposal(source, proposal);
  if (!validation.ok) return validation;

  const where = {
    sourceSnapshotDigest_algorithmVersion: {
      sourceSnapshotDigest: digestCatalogSource(source),
      algorithmVersion: proposal.algorithmVersion,
    },
  };
  const existing = await prisma.catalogNormalizationRun.findUnique({ where });
  if (existing) return { ok: true, runId: existing.id };

  try {
    const run = await prisma.catalogNormalizationRun.create({
      data: {
        status: "VALIDATED",
        schemaVersion: proposal.schemaVersion,
        algorithmVersion: proposal.algorithmVersion,
        sourceSnapshotDigest: proposal.sourceSnapshotDigest,
        sourceSnapshot: source,
        proposal,
      },
      select: { id: true },
    });
    return { ok: true, runId: run.id };
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    const concurrentRun = await prisma.catalogNormalizationRun.findUnique({ where });
    if (!concurrentRun) throw error;
    return { ok: true, runId: concurrentRun.id };
  }
}
