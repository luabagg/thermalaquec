import { Prisma, type CatalogNormalizationStatus, type CatalogSourceDisposition } from "@prisma/client";

import prisma from "~/libs/prisma/client.server";
import { catalogVariantKey } from "~/utils/catalog-resolver";
import {
  CATALOG_NORMALIZATION_SCHEMA_VERSION,
  digestCatalogSource,
  normalizeCatalogAlias,
  validateCatalogProposal,
  type CatalogNormalizationFamily,
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
  | { ok: true; runId: number; status: CatalogNormalizationStatus }
  | { ok: false; errors: CatalogProposalError[] };

export type CatalogNormalizationApplyResult =
  | { ok: true; runId: number; status: "APPLIED"; familyCount: number; sourceCount: number; remappedLineCount: number }
  | { ok: false; error: "not_found" | "invalid_status" | "stale_source" | "apply_failed" };

export type CatalogNormalizationRevertResult =
  | { ok: true; runId: number; status: "REVERTED"; restoredLineCount: number; restoredSourceCount: number; archivedFamilyCount: number }
  | { ok: false; error: "not_found" | "invalid_status" | "unsafe_revert" | "revert_failed" };

export type CatalogNormalizationRevertEligibility = {
  eligible: boolean;
  postRunQuotationLineCount: number;
  editedFamilyCount: number;
};

type SourceMapRecord = {
  id: number;
  sourceCatalogItemId: number;
  canonicalCatalogItemId: number;
  sourceStateSnapshot: unknown;
  selectedValuesSnapshot: unknown;
  originalQuotationLineIds: unknown;
  priceDisposition: CatalogSourceDisposition;
  imageDisposition: CatalogSourceDisposition;
  canonicalUpdatedAt: Date;
};

type RunRecord = {
  id: number;
  status: CatalogNormalizationStatus;
  sourceSnapshotDigest: string;
  sourceSnapshot: unknown;
  proposal: unknown;
  result: unknown;
  appliedAt: Date | null;
  revertedAt: Date | null;
  sourceMaps?: SourceMapRecord[];
};

type TxClient = Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

type CurrentSourceItem = {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  slug: string;
  name: string;
  nameTemplate: string | null;
  descriptionLines: unknown;
  defaultUnitPriceCents: number | null;
  imageId: number | null;
  archivedAt: Date | null;
};

type SourceStateSnapshot = {
  id: number;
  createdAt: string;
  updatedAt: string;
  slug: string;
  name: string;
  nameTemplate: string | null;
  descriptionLines: string[];
  defaultUnitPriceCents: number | null;
  imageId: number | null;
  archivedAt: Date | null;
};

function parseSourceSnapshot(value: unknown): CatalogNormalizationSourceSnapshot {
  return value as CatalogNormalizationSourceSnapshot;
}

function parseProposal(value: unknown): CatalogNormalizationProposal {
  return value as CatalogNormalizationProposal;
}

function readRecordedApplyResult(run: RunRecord): CatalogNormalizationApplyResult | null {
  const result = run.result as CatalogNormalizationApplyResult | null;
  return result?.ok && result.status === "APPLIED" ? result : null;
}

function readRecordedRevertResult(run: RunRecord): CatalogNormalizationRevertResult | null {
  const result = run.result as CatalogNormalizationRevertResult | null;
  return result?.ok && result.status === "REVERTED" ? result : null;
}

function numericJsonArray(value: unknown): number[] {
  return Array.isArray(value) ? value.filter((entry): entry is number => Number.isInteger(entry)) : [];
}

async function readCurrentSource(run: RunRecord, tx: TxClient): Promise<Map<number, CurrentSourceItem> | null> {
  const sourceSnapshot = parseSourceSnapshot(run.sourceSnapshot);
  const sourceIds = sourceSnapshot.items.map((item) => item.id);
  const currentItems = await tx.quoteCatalogItem.findMany({
    where: { id: { in: sourceIds }, archivedAt: null },
    orderBy: { id: "asc" },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      slug: true,
      name: true,
      nameTemplate: true,
      descriptionLines: true,
      defaultUnitPriceCents: true,
      imageId: true,
      archivedAt: true,
    },
  });
  const currentSource: CatalogNormalizationSourceSnapshot = {
    schemaVersion: sourceSnapshot.schemaVersion,
    exportedAt: sourceSnapshot.exportedAt,
    items: currentItems.map((item) => ({
      id: item.id,
      slug: item.slug,
      name: item.name,
      descriptionLines: toStringArray(item.descriptionLines),
      defaultUnitPriceCents: item.defaultUnitPriceCents,
      imageId: item.imageId,
    })),
  };
  if (digestCatalogSource(currentSource) !== run.sourceSnapshotDigest) return null;
  return new Map(currentItems.map((item) => [item.id, item]));
}

function sourceStateFromItem(item: CurrentSourceItem): SourceStateSnapshot {
  return {
    id: item.id,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    slug: item.slug,
    name: item.name,
    nameTemplate: item.nameTemplate,
    descriptionLines: toStringArray(item.descriptionLines),
    defaultUnitPriceCents: item.defaultUnitPriceCents,
    imageId: item.imageId,
    archivedAt: item.archivedAt,
  };
}

async function createCanonicalFamily(tx: TxClient, family: CatalogNormalizationFamily, sourceSnapshot: CatalogNormalizationSourceSnapshot) {
  const sourceById = new Map(sourceSnapshot.items.map((item) => [item.id, item]));
  const parentPrice = sourceById.get(family.parentPriceSourceId);
  const parentImage = sourceById.get(family.parentImageSourceId);

  const canonical = await tx.quoteCatalogItem.create({
    data: {
      slug: family.slug,
      name: family.name,
      nameTemplate: family.nameTemplate,
      descriptionLines: family.descriptionLines,
      defaultUnitPriceCents: parentPrice?.defaultUnitPriceCents ?? null,
      imageId: parentImage?.imageId ?? null,
    },
  });

  const valueIdByClientKey = new Map<string, number>();
  for (const [optionIndex, option] of family.options.entries()) {
    const savedOption = await tx.quoteCatalogOption.create({
      data: {
        catalogItemId: canonical.id,
        name: option.name,
        slug: option.slug,
        placement: option.placement,
        sortOrder: optionIndex,
      },
    });
    for (const [valueIndex, value] of option.values.entries()) {
      const savedValue = await tx.quoteCatalogOptionValue.create({
        data: {
          optionId: savedOption.id,
          label: value.label,
          slug: value.slug,
          titleFragment: value.titleFragment,
          descriptionLines: value.descriptionLines,
          sortOrder: valueIndex,
        },
      });
      valueIdByClientKey.set(`${option.clientKey}:${value.clientKey}`, savedValue.id);
    }
  }

  for (const variant of family.variants) {
    const valueIds = variant.valueClientKeys.map((key) => valueIdByClientKey.get(key)!);
    const variantImageSource = variant.imageSourceId !== null ? sourceById.get(variant.imageSourceId) : null;
    const savedVariant = await tx.quoteCatalogVariant.create({
      data: {
        catalogItemId: canonical.id,
        key: catalogVariantKey(valueIds),
        sku: variant.sku,
        active: variant.active,
        nameOverride: variant.nameOverride,
        descriptionLinesOverride: variant.descriptionLinesOverride ?? Prisma.JsonNull,
        unitPriceCents: variant.unitPriceCents,
        imageId: variantImageSource?.imageId ?? null,
      },
    });
    if (valueIds.length) {
      await tx.quoteCatalogVariantValue.createMany({
        data: valueIds.map((optionValueId) => ({ variantId: savedVariant.id, optionValueId })),
      });
    }
  }

  return { canonical, valueIdByClientKey };
}

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
  const existing = await prisma.catalogNormalizationRun.findUnique({
    where,
    select: { id: true, status: true },
  });
  if (existing) return { ok: true, runId: existing.id, status: existing.status };

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
      select: { id: true, status: true },
    });
    return { ok: true, runId: run.id, status: run.status };
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    const concurrentRun = await prisma.catalogNormalizationRun.findUnique({
      where,
      select: { id: true, status: true },
    });
    if (!concurrentRun) throw error;
    return { ok: true, runId: concurrentRun.id, status: concurrentRun.status };
  }
}

export async function applyCatalogNormalizationRun(runId: number): Promise<CatalogNormalizationApplyResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      const run = await tx.catalogNormalizationRun.findUnique({ where: { id: runId } });
      if (!run) return { ok: false, error: "not_found" };
      if (run.status === "APPLIED") return readRecordedApplyResult(run as RunRecord) ?? { ok: false, error: "apply_failed" };
      if (run.status !== "VALIDATED") return { ok: false, error: "invalid_status" };

      const currentSourceById = await readCurrentSource(run as RunRecord, tx);
      if (!currentSourceById) return { ok: false, error: "stale_source" };

      const claimed = await tx.catalogNormalizationRun.updateMany({
        where: { id: runId, status: "VALIDATED" },
        data: { status: "APPLYING" },
      });
      if (claimed.count === 0) {
        const current = await tx.catalogNormalizationRun.findUnique({ where: { id: runId } });
        if (current?.status === "APPLIED") return readRecordedApplyResult(current as RunRecord) ?? { ok: false, error: "apply_failed" };
        return { ok: false, error: "invalid_status" };
      }

      const proposal = parseProposal(run.proposal);
      const sourceSnapshot = parseSourceSnapshot(run.sourceSnapshot);
      let remappedLineCount = 0;
      let sourceCount = 0;

      for (const family of proposal.families) {
        const { canonical, valueIdByClientKey } = await createCanonicalFamily(tx, family, sourceSnapshot);

        for (const mappedSource of family.sources) {
          sourceCount += 1;
          const sourceItem = currentSourceById.get(mappedSource.sourceId);
          if (!sourceItem) throw new Error(`Missing source item ${mappedSource.sourceId}`);

          const quotationLines = await tx.quotationLine.findMany({
            where: { catalogItemId: mappedSource.sourceId },
            orderBy: { id: "asc" },
            select: { id: true },
          });
          const originalQuotationLineIds = quotationLines.map((line) => line.id);
          const selectedValuesSnapshot = mappedSource.selectedValueClientKeys.map((key) => ({
            clientKey: key,
            valueId: valueIdByClientKey.get(key) ?? null,
          }));

          await tx.catalogNormalizationSourceMap.create({
            data: {
              runId,
              sourceCatalogItemId: mappedSource.sourceId,
              canonicalCatalogItemId: canonical.id,
              sourceStateSnapshot: sourceStateFromItem(sourceItem),
              selectedValuesSnapshot,
              originalQuotationLineIds,
              priceDisposition: mappedSource.priceDisposition,
              imageDisposition: mappedSource.imageDisposition,
              canonicalUpdatedAt: canonical.updatedAt,
            },
          });

          await tx.quoteCatalogAlias.create({
            data: {
              catalogItemId: canonical.id,
              originalName: mappedSource.alias,
              normalizedKey: normalizeCatalogAlias(mappedSource.alias),
              sourceSlug: sourceItem.slug,
            },
          });

          if (originalQuotationLineIds.length) {
            const updated = await tx.quotationLine.updateMany({
              where: { id: { in: originalQuotationLineIds }, catalogItemId: mappedSource.sourceId },
              data: { catalogItemId: canonical.id },
            });
            if (updated.count !== originalQuotationLineIds.length) throw new Error("Quotation lines changed during apply");
            remappedLineCount += updated.count;
          }

          const archived = await tx.quoteCatalogItem.updateMany({
            where: { id: mappedSource.sourceId, archivedAt: null },
            data: { archivedAt: new Date() },
          });
          if (archived.count !== 1) throw new Error("Source row changed during apply");
        }
      }

      const result: CatalogNormalizationApplyResult = {
        ok: true,
        runId,
        status: "APPLIED",
        familyCount: proposal.families.length,
        sourceCount,
        remappedLineCount,
      };
      await tx.catalogNormalizationRun.update({
        where: { id: runId },
        data: { status: "APPLIED", appliedAt: new Date(), result },
      });
      return result;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch {
    const current = await prisma.catalogNormalizationRun.findUnique({ where: { id: runId } }).catch(() => null);
    if (current?.status === "APPLIED") return readRecordedApplyResult(current as RunRecord) ?? { ok: false, error: "apply_failed" };
    await prisma.catalogNormalizationRun.updateMany({
      where: { id: runId, status: { in: ["VALIDATED", "APPLYING"] } },
      data: { status: "FAILED", result: { ok: false, error: "apply_failed" } },
    }).catch(() => undefined);
    const finalRun = await prisma.catalogNormalizationRun.findUnique({ where: { id: runId } }).catch(() => null);
    if (finalRun?.status === "APPLIED") return readRecordedApplyResult(finalRun as RunRecord) ?? { ok: false, error: "apply_failed" };
    return { ok: false, error: "apply_failed" };
  }
}

type RevertSafety = {
  eligibility: CatalogNormalizationRevertEligibility;
  restorableLineIdsByMapId: Map<number, number[]>;
  canonicalUpdatedAtById: Map<number, Date>;
};

async function evaluateRevertSafety(tx: TxClient, sourceMaps: SourceMapRecord[]): Promise<RevertSafety> {
  const canonicalUpdatedAtById = new Map<number, Date>();
  const expectedLineById = new Map<number, { canonicalId: number; mapId: number }>();
  let malformedMap = false;

  for (const sourceMap of sourceMaps) {
    const existingTimestamp = canonicalUpdatedAtById.get(sourceMap.canonicalCatalogItemId);
    if (existingTimestamp && existingTimestamp.getTime() !== sourceMap.canonicalUpdatedAt.getTime()) malformedMap = true;
    canonicalUpdatedAtById.set(sourceMap.canonicalCatalogItemId, sourceMap.canonicalUpdatedAt);
    for (const lineId of numericJsonArray(sourceMap.originalQuotationLineIds)) {
      if (expectedLineById.has(lineId)) malformedMap = true;
      expectedLineById.set(lineId, { canonicalId: sourceMap.canonicalCatalogItemId, mapId: sourceMap.id });
    }
  }

  const canonicalIds = [...canonicalUpdatedAtById.keys()];
  const recordedLineIds = [...expectedLineById.keys()];
  const [lines, canonicalFamilies, sourceRows] = await Promise.all([
    canonicalIds.length || recordedLineIds.length
      ? tx.quotationLine.findMany({
          where: {
            OR: [
              { catalogItemId: { in: canonicalIds } },
              { id: { in: recordedLineIds } },
            ],
          },
          select: { id: true, catalogItemId: true },
        })
      : Promise.resolve([]),
    canonicalIds.length
      ? tx.quoteCatalogItem.findMany({
          where: { id: { in: canonicalIds } },
          select: { id: true, updatedAt: true, archivedAt: true },
        })
      : Promise.resolve([]),
    sourceMaps.length
      ? tx.quoteCatalogItem.findMany({
          where: { id: { in: sourceMaps.map((sourceMap) => sourceMap.sourceCatalogItemId) } },
          select: { id: true, archivedAt: true },
        })
      : Promise.resolve([]),
  ]);

  const unsafeLineIds = new Set<number>();
  const restorableLineIdsByMapId = new Map<number, number[]>();
  for (const line of lines) {
    const expected = expectedLineById.get(line.id);
    const referencesGeneratedFamily = line.catalogItemId !== null && canonicalUpdatedAtById.has(line.catalogItemId);
    if (!expected || line.catalogItemId !== expected.canonicalId) {
      if (referencesGeneratedFamily || expected) unsafeLineIds.add(line.id);
      continue;
    }
    const restorable = restorableLineIdsByMapId.get(expected.mapId) ?? [];
    restorable.push(line.id);
    restorableLineIdsByMapId.set(expected.mapId, restorable);
  }

  const canonicalFamilyById = new Map(canonicalFamilies.map((family) => [family.id, family]));
  let editedFamilyCount = 0;
  for (const [canonicalId, recordedUpdatedAt] of canonicalUpdatedAtById) {
    const family = canonicalFamilyById.get(canonicalId);
    if (!family || family.archivedAt !== null || family.updatedAt.getTime() !== recordedUpdatedAt.getTime()) editedFamilyCount += 1;
  }

  const sourceIds = new Set(sourceMaps.map((sourceMap) => sourceMap.sourceCatalogItemId));
  const sourceRowsById = new Map(sourceRows.map((row) => [row.id, row]));
  const sourceArchived = sourceIds.size > 0
    && sourceRows.length === sourceIds.size
    && [...sourceIds].every((sourceId) => sourceRowsById.get(sourceId)?.archivedAt !== null);
  const eligibility = {
    eligible: !malformedMap && unsafeLineIds.size === 0 && editedFamilyCount === 0 && sourceArchived,
    postRunQuotationLineCount: unsafeLineIds.size,
    editedFamilyCount,
  };
  return { eligibility, restorableLineIdsByMapId, canonicalUpdatedAtById };
}

export async function getCatalogNormalizationRevertEligibility(runId: number): Promise<CatalogNormalizationRevertEligibility | { eligible: false; error: "not_found" | "invalid_status" }> {
  const run = await prisma.catalogNormalizationRun.findUnique({
    where: { id: runId },
    include: { sourceMaps: true },
  });
  if (!run) return { eligible: false, error: "not_found" };
  if (run.status !== "APPLIED") return { eligible: false, error: "invalid_status" };
  return (await evaluateRevertSafety(prisma, run.sourceMaps as SourceMapRecord[])).eligibility;
}

export async function revertCatalogNormalizationRun(runId: number): Promise<CatalogNormalizationRevertResult> {
  try {
    const initialRun = await prisma.catalogNormalizationRun.findUnique({
      where: { id: runId },
      include: { sourceMaps: true },
    });
    if (!initialRun) return { ok: false, error: "not_found" };
    if (initialRun.status === "REVERTED") return readRecordedRevertResult(initialRun as RunRecord) ?? { ok: false, error: "revert_failed" };
    if (initialRun.status !== "APPLIED") return { ok: false, error: "invalid_status" };
    if (!(await evaluateRevertSafety(prisma, initialRun.sourceMaps as SourceMapRecord[])).eligibility.eligible) {
      return { ok: false, error: "unsafe_revert" };
    }

    return await prisma.$transaction(async (tx) => {
      const run = await tx.catalogNormalizationRun.findUnique({
        where: { id: runId },
        include: { sourceMaps: true },
      });
      if (!run) return { ok: false, error: "not_found" };
      if (run.status === "REVERTED") return readRecordedRevertResult(run as RunRecord) ?? { ok: false, error: "revert_failed" };
      if (run.status !== "APPLIED") return { ok: false, error: "invalid_status" };

      const safety = await evaluateRevertSafety(tx, run.sourceMaps as SourceMapRecord[]);
      if (!safety.eligibility.eligible) return { ok: false, error: "unsafe_revert" };

      const claimed = await tx.catalogNormalizationRun.updateMany({
        where: { id: runId, status: "APPLIED" },
        data: { status: "REVERTING" },
      });
      if (claimed.count === 0) {
        const current = await tx.catalogNormalizationRun.findUnique({ where: { id: runId } });
        if (current?.status === "REVERTED") return readRecordedRevertResult(current as RunRecord) ?? { ok: false, error: "revert_failed" };
        return { ok: false, error: "invalid_status" };
      }

      let restoredLineCount = 0;
      let restoredSourceCount = 0;
      for (const sourceMap of run.sourceMaps) {
        const lineIds = safety.restorableLineIdsByMapId.get(sourceMap.id) ?? [];
        if (lineIds.length) {
          const updated = await tx.quotationLine.updateMany({
            where: {
              id: { in: lineIds },
              catalogItemId: sourceMap.canonicalCatalogItemId,
            },
            data: { catalogItemId: sourceMap.sourceCatalogItemId },
          });
          if (updated.count !== lineIds.length) throw new Error("Quotation lines changed during revert");
          restoredLineCount += updated.count;
        }

        const snapshot = sourceMap.sourceStateSnapshot as SourceStateSnapshot;
        const restored = await tx.quoteCatalogItem.updateMany({
          where: { id: sourceMap.sourceCatalogItemId, archivedAt: { not: null } },
          data: {
            createdAt: snapshot.createdAt,
            updatedAt: snapshot.updatedAt,
            slug: snapshot.slug,
            name: snapshot.name,
            nameTemplate: snapshot.nameTemplate,
            descriptionLines: snapshot.descriptionLines,
            defaultUnitPriceCents: snapshot.defaultUnitPriceCents,
            imageId: snapshot.imageId,
            archivedAt: snapshot.archivedAt,
          },
        });
        if (restored.count !== 1) throw new Error("Source row changed during revert");
        restoredSourceCount += 1;
      }

      let archivedFamilyCount = 0;
      for (const [canonicalId, canonicalUpdatedAt] of safety.canonicalUpdatedAtById) {
        const archived = await tx.quoteCatalogItem.updateMany({
          where: { id: canonicalId, archivedAt: null, updatedAt: canonicalUpdatedAt },
          data: { archivedAt: new Date() },
        });
        if (archived.count !== 1) throw new Error("Canonical family changed during revert");
        archivedFamilyCount += 1;
      }

      const result: CatalogNormalizationRevertResult = {
        ok: true,
        runId,
        status: "REVERTED",
        restoredLineCount,
        restoredSourceCount,
        archivedFamilyCount,
      };
      await tx.catalogNormalizationRun.update({
        where: { id: runId },
        data: { status: "REVERTED", revertedAt: new Date(), result },
      });
      return result;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch {
    const current = await prisma.catalogNormalizationRun.findUnique({ where: { id: runId } }).catch(() => null);
    if (current?.status === "REVERTED") return readRecordedRevertResult(current as RunRecord) ?? { ok: false, error: "revert_failed" };
    return { ok: false, error: "revert_failed" };
  }
}

export async function resolveCatalogImportAlias(name: string) {
  const normalizedKey = normalizeCatalogAlias(name);
  return prisma.quoteCatalogAlias.findUnique({
    where: { normalizedKey },
    select: { catalogItemId: true },
  });
}
