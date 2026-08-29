import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, txMock } = vi.hoisted(() => {
  const txMock = {
    quoteCatalogItem: { findMany: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    quoteCatalogOption: { create: vi.fn() },
    quoteCatalogOptionValue: { create: vi.fn() },
    quoteCatalogVariant: { create: vi.fn() },
    quoteCatalogVariantValue: { createMany: vi.fn() },
    quoteCatalogAlias: { create: vi.fn(), deleteMany: vi.fn() },
    catalogNormalizationRun: { findUnique: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
    catalogNormalizationSourceMap: { create: vi.fn() },
    quotationLine: { findMany: vi.fn(), updateMany: vi.fn() },
  };
  const prismaMock = {
    quoteCatalogItem: { findMany: vi.fn() },
    quoteCatalogAlias: { findUnique: vi.fn() },
    catalogNormalizationRun: { findUnique: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    quotationLine: { findMany: vi.fn() },
    $transaction: vi.fn(),
  };
  return { prismaMock, txMock };
});
vi.mock("~/libs/prisma/client.server", () => ({ default: prismaMock }));

import {
  digestCatalogSource,
  normalizeCatalogAlias,
  type CatalogNormalizationProposal,
  type CatalogNormalizationSourceSnapshot,
} from "~/utils/catalog-normalization-contract";
import {
  applyCatalogNormalizationRun,
  exportCatalogNormalizationSource,
  getCatalogNormalizationRevertEligibility,
  resolveCatalogImportAlias,
  revertCatalogNormalizationRun,
  validateAndRecordCatalogProposal,
} from "./catalog-normalization.server";

const source: CatalogNormalizationSourceSnapshot = {
  schemaVersion: 1,
  exportedAt: "2026-08-29T00:00:00.000Z",
  items: [{ id: 1, slug: "boiler", name: "Boiler", descriptionLines: [], defaultUnitPriceCents: 100, imageId: null }],
};
const proposal: CatalogNormalizationProposal = {
  schemaVersion: 1,
  sourceSnapshotDigest: digestCatalogSource(source),
  algorithmVersion: "agent-v1",
  families: [{
    clientKey: "boiler",
    slug: "boiler-normalized",
    name: "Boiler",
    nameTemplate: null,
    descriptionLines: [],
    parentPriceSourceId: 1,
    parentImageSourceId: 1,
    options: [],
    variants: [],
    sources: [{
      sourceId: 1,
      alias: "Boiler",
      selectedValueClientKeys: [],
      priceDisposition: "PARENT_SOURCE",
      imageDisposition: "PARENT_SOURCE",
    }],
  }],
};

const validatedRunId = 10;
const sourceCreatedAt = new Date("2026-01-01T00:00:00.000Z");
const sourceUpdatedAt = new Date("2026-08-01T00:00:00.000Z");
const canonicalUpdatedAt = new Date("2026-08-29T12:00:00.000Z");
const applyResult = { ok: true as const, runId: validatedRunId, status: "APPLIED" as const, familyCount: 1, sourceCount: 1, remappedLineCount: 1 };

function validatedRun(overrides: Record<string, unknown> = {}) {
  return {
    id: validatedRunId,
    status: "VALIDATED",
    sourceSnapshotDigest: digestCatalogSource(source),
    sourceSnapshot: source,
    proposal,
    result: null,
    appliedAt: null,
    revertedAt: null,
    ...overrides,
  };
}

function sourceItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    createdAt: sourceCreatedAt,
    updatedAt: sourceUpdatedAt,
    slug: "boiler",
    name: "Boiler",
    nameTemplate: null,
    descriptionLines: [],
    defaultUnitPriceCents: 100,
    imageId: null,
    archivedAt: null,
    ...overrides,
  };
}

function sourceStateSnapshot() {
  return {
    ...sourceItem(),
    createdAt: sourceCreatedAt.toISOString(),
    updatedAt: sourceUpdatedAt.toISOString(),
  };
}

function prepareApplyMocks() {
  txMock.catalogNormalizationRun.findUnique.mockResolvedValueOnce(validatedRun());
  txMock.quoteCatalogItem.findMany.mockResolvedValueOnce([sourceItem()]);
  txMock.catalogNormalizationRun.updateMany.mockResolvedValueOnce({ count: 1 });
  txMock.quoteCatalogItem.create.mockResolvedValueOnce({ id: 50, updatedAt: canonicalUpdatedAt });
  txMock.quotationLine.findMany.mockResolvedValueOnce([
    { id: 90, catalogItemId: 1, name: "Boiler 400L", descriptionLines: ["Original"], catalogSelectionSnapshot: [] },
  ]);
  txMock.catalogNormalizationSourceMap.create.mockResolvedValueOnce({ id: 1 });
  txMock.quoteCatalogAlias.create.mockResolvedValueOnce({ id: 1 });
  txMock.quotationLine.updateMany.mockResolvedValueOnce({ count: 1 });
  txMock.quoteCatalogItem.updateMany.mockResolvedValueOnce({ count: 1 });
  txMock.catalogNormalizationRun.update.mockResolvedValueOnce({});
}

beforeEach(() => {
  vi.resetAllMocks();
  prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof txMock) => unknown) => callback(txMock));
});

describe("catalog normalization preparation", () => {
  it("exports only active flat catalog fields and no quotation/client data", async () => {
    prismaMock.quoteCatalogItem.findMany.mockResolvedValueOnce([
      { id: 1, slug: "boiler", name: "Boiler", descriptionLines: [], defaultUnitPriceCents: 100, imageId: null },
    ]);

    const exported = await exportCatalogNormalizationSource();

    expect(exported.items[0]).toEqual({ id: 1, slug: "boiler", name: "Boiler", descriptionLines: [], defaultUnitPriceCents: 100, imageId: null });
    expect(JSON.stringify(exported)).not.toMatch(/client|quotation/i);
    expect(prismaMock.quoteCatalogItem.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { archivedAt: null, options: { none: {} } },
    }));
  });

  it("records only proposals matching the current source digest", async () => {
    prismaMock.catalogNormalizationRun.findUnique.mockResolvedValueOnce(null);
    prismaMock.catalogNormalizationRun.create.mockResolvedValueOnce({ id: 4, status: "VALIDATED" });

    await expect(validateAndRecordCatalogProposal({ source, proposal })).resolves.toEqual({ ok: true, runId: 4, status: "VALIDATED" });
    expect(prismaMock.catalogNormalizationRun.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: "VALIDATED",
        sourceSnapshotDigest: proposal.sourceSnapshotDigest,
        sourceSnapshot: source,
        proposal,
      }),
    }));
  });

  it("rejects stale digests without recording a run", async () => {
    const staleProposal = { ...proposal, sourceSnapshotDigest: "stale" };

    await expect(validateAndRecordCatalogProposal({ source, proposal: staleProposal })).resolves.toMatchObject({
      ok: false,
      errors: [expect.objectContaining({ code: "stale_source_digest" })],
    });
    expect(prismaMock.catalogNormalizationRun.create).not.toHaveBeenCalled();
  });

  it("rejects semantically invalid proposals without recording a run", async () => {
    const invalidProposal = { ...proposal, families: [] };

    await expect(validateAndRecordCatalogProposal({ source, proposal: invalidProposal })).resolves.toMatchObject({
      ok: false,
      errors: [expect.objectContaining({ code: "missing_source" })],
    });
    expect(prismaMock.catalogNormalizationRun.create).not.toHaveBeenCalled();
  });

  it("reuses the uniquely recorded run and reports its current status", async () => {
    prismaMock.catalogNormalizationRun.findUnique.mockResolvedValueOnce({ id: 7, status: "APPLIED" });

    await expect(validateAndRecordCatalogProposal({ source, proposal })).resolves.toEqual({ ok: true, runId: 7, status: "APPLIED" });
    expect(prismaMock.catalogNormalizationRun.create).not.toHaveBeenCalled();
  });
});

describe("catalog normalization apply", () => {
  it("applies a validated run atomically and changes only quotation catalog references", async () => {
    prepareApplyMocks();

    const result = await applyCatalogNormalizationRun(validatedRunId);

    expect(result).toMatchObject({ ok: true, status: "APPLIED", remappedLineCount: 1 });
    expect(txMock.quotationLine.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [90] }, catalogItemId: 1 },
      data: { catalogItemId: 50 },
    });
    const remapData = txMock.quotationLine.updateMany.mock.calls[0]?.[0].data;
    expect(Object.keys(remapData)).toEqual(["catalogItemId"]);
    expect(remapData).not.toHaveProperty("name");
    expect(remapData).not.toHaveProperty("descriptionLines");
    expect(remapData).not.toHaveProperty("unitPriceCents");
    expect(remapData).not.toHaveProperty("imageId");
    expect(remapData).not.toHaveProperty("catalogSelectionSnapshot");
    expect(txMock.catalogNormalizationSourceMap.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        sourceCatalogItemId: 1,
        canonicalCatalogItemId: 50,
        sourceStateSnapshot: sourceStateSnapshot(),
        originalQuotationLineIds: [90],
        canonicalUpdatedAt,
      }),
    }));
  });

  it("returns the recorded result for an already applied run", async () => {
    txMock.catalogNormalizationRun.findUnique.mockResolvedValueOnce(
      validatedRun({ status: "APPLIED", result: applyResult, appliedAt: canonicalUpdatedAt }),
    );

    await expect(applyCatalogNormalizationRun(validatedRunId)).resolves.toEqual(applyResult);
    expect(txMock.quoteCatalogItem.findMany).not.toHaveBeenCalled();
    expect(txMock.catalogNormalizationRun.updateMany).not.toHaveBeenCalled();
  });

  it("rejects a fresh validated run when its recorded source rows changed", async () => {
    txMock.catalogNormalizationRun.findUnique.mockResolvedValueOnce(validatedRun());
    txMock.quoteCatalogItem.findMany.mockResolvedValueOnce([{ ...sourceItem(), defaultUnitPriceCents: 999 }]);

    await expect(applyCatalogNormalizationRun(validatedRunId)).resolves.toEqual({ ok: false, error: "stale_source" });
    expect(txMock.catalogNormalizationRun.updateMany).not.toHaveBeenCalled();
    expect(txMock.quoteCatalogItem.create).not.toHaveBeenCalled();
    expect(prismaMock.catalogNormalizationRun.updateMany).not.toHaveBeenCalled();
  });

  it("records FAILED separately when the apply transaction throws", async () => {
    txMock.catalogNormalizationRun.findUnique.mockResolvedValueOnce(validatedRun());
    txMock.quoteCatalogItem.findMany.mockResolvedValueOnce([sourceItem()]);
    txMock.catalogNormalizationRun.updateMany.mockResolvedValueOnce({ count: 1 });
    txMock.quoteCatalogItem.create.mockRejectedValueOnce(new Error("boom"));
    prismaMock.catalogNormalizationRun.findUnique.mockResolvedValue(null);
    prismaMock.catalogNormalizationRun.updateMany.mockResolvedValueOnce({ count: 1 });

    await expect(applyCatalogNormalizationRun(validatedRunId)).resolves.toEqual({ ok: false, error: "apply_failed" });
    expect(prismaMock.catalogNormalizationRun.updateMany).toHaveBeenCalledWith({
      where: { id: validatedRunId, status: { in: ["VALIDATED", "APPLYING"] } },
      data: { status: "FAILED", result: { ok: false, error: "apply_failed" } },
    });
  });

  it("does not let a second caller continue an APPLYING run", async () => {
    txMock.catalogNormalizationRun.findUnique.mockResolvedValueOnce(validatedRun({ status: "APPLYING" }));

    await expect(applyCatalogNormalizationRun(validatedRunId)).resolves.toEqual({ ok: false, error: "invalid_status" });
    expect(txMock.quoteCatalogItem.create).not.toHaveBeenCalled();
  });
});

describe("catalog normalization revert", () => {
  const sourceMap = {
    id: 1,
    sourceCatalogItemId: 1,
    canonicalCatalogItemId: 50,
    sourceStateSnapshot: sourceStateSnapshot(),
    selectedValuesSnapshot: [],
    originalQuotationLineIds: [90],
    priceDisposition: "PARENT_SOURCE",
    imageDisposition: "PARENT_SOURCE",
    canonicalUpdatedAt,
  };
  const appliedRun = {
    ...validatedRun({ status: "APPLIED", result: applyResult, appliedAt: canonicalUpdatedAt }),
    sourceMaps: [sourceMap],
  };
  const canonicalFamily = { id: 50, updatedAt: canonicalUpdatedAt, archivedAt: null };
  const archivedSource = { id: 1, archivedAt: new Date("2026-08-29T12:00:01.000Z") };

  function prepareSafeEligibilityMocks(target: typeof prismaMock | typeof txMock) {
    target.quotationLine.findMany.mockResolvedValueOnce([{ id: 90, catalogItemId: 50 }]);
    target.quoteCatalogItem.findMany
      .mockResolvedValueOnce([canonicalFamily])
      .mockResolvedValueOnce([archivedSource]);
  }

  it("blocks quotation references added after the run", async () => {
    prismaMock.catalogNormalizationRun.findUnique.mockResolvedValue(appliedRun);
    prismaMock.quotationLine.findMany.mockResolvedValue([
      { id: 90, catalogItemId: 50 },
      { id: 91, catalogItemId: 50 },
    ]);
    prismaMock.quoteCatalogItem.findMany
      .mockResolvedValueOnce([canonicalFamily])
      .mockResolvedValueOnce([archivedSource])
      .mockResolvedValueOnce([canonicalFamily])
      .mockResolvedValueOnce([archivedSource]);

    expect(await getCatalogNormalizationRevertEligibility(validatedRunId)).toEqual({
      eligible: false,
      postRunQuotationLineCount: 1,
      editedFamilyCount: 0,
    });
    await expect(revertCatalogNormalizationRun(validatedRunId)).resolves.toEqual({ ok: false, error: "unsafe_revert" });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("safely restores exact recorded IDs and returns the recorded result on repeat", async () => {
    prismaMock.catalogNormalizationRun.findUnique.mockResolvedValueOnce(appliedRun);
    prepareSafeEligibilityMocks(prismaMock);
    txMock.catalogNormalizationRun.findUnique.mockResolvedValueOnce(appliedRun);
    prepareSafeEligibilityMocks(txMock);
    txMock.catalogNormalizationRun.updateMany.mockResolvedValueOnce({ count: 1 });
    txMock.quotationLine.updateMany.mockResolvedValueOnce({ count: 1 });
    txMock.quoteCatalogItem.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });
    txMock.quoteCatalogAlias.deleteMany.mockResolvedValueOnce({ count: 1 });
    txMock.catalogNormalizationRun.update.mockResolvedValueOnce({});

    const revertResult = { ok: true as const, runId: validatedRunId, status: "REVERTED" as const, restoredLineCount: 1, restoredSourceCount: 1, archivedFamilyCount: 1 };
    await expect(revertCatalogNormalizationRun(validatedRunId)).resolves.toEqual(revertResult);
    expect(txMock.quotationLine.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [90] }, catalogItemId: 50 },
      data: { catalogItemId: 1 },
    });
    expect(txMock.quoteCatalogAlias.deleteMany).toHaveBeenCalledWith({
      where: { catalogItemId: { in: [50] } },
    });
    expect(txMock.quoteCatalogItem.updateMany).toHaveBeenCalledWith({
      where: { id: 1, archivedAt: { not: null } },
      data: {
        createdAt: sourceCreatedAt.toISOString(),
        updatedAt: sourceUpdatedAt.toISOString(),
        slug: "boiler",
        name: "Boiler",
        nameTemplate: null,
        descriptionLines: [],
        defaultUnitPriceCents: 100,
        imageId: null,
        archivedAt: null,
      },
    });

    prismaMock.catalogNormalizationRun.findUnique.mockResolvedValueOnce({
      ...appliedRun,
      status: "REVERTED",
      result: revertResult,
      revertedAt: new Date("2026-08-29T13:00:00.000Z"),
    });
    await expect(revertCatalogNormalizationRun(validatedRunId)).resolves.toEqual(revertResult);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });

  it("blocks safe revert when a recorded quotation line was deleted after apply", async () => {
    prismaMock.catalogNormalizationRun.findUnique.mockResolvedValue(appliedRun);
    prismaMock.quotationLine.findMany.mockResolvedValue([]);
    prismaMock.quoteCatalogItem.findMany
      .mockResolvedValueOnce([canonicalFamily])
      .mockResolvedValueOnce([archivedSource])
      .mockResolvedValueOnce([canonicalFamily])
      .mockResolvedValueOnce([archivedSource]);

    expect(await getCatalogNormalizationRevertEligibility(validatedRunId)).toEqual({
      eligible: false,
      postRunQuotationLineCount: 1,
      editedFamilyCount: 0,
    });
    await expect(revertCatalogNormalizationRun(validatedRunId)).resolves.toEqual({ ok: false, error: "unsafe_revert" });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(txMock.quoteCatalogAlias.deleteMany).not.toHaveBeenCalled();
  });

  it("detects edited generated families", async () => {
    prismaMock.catalogNormalizationRun.findUnique.mockResolvedValueOnce(appliedRun);
    prismaMock.quotationLine.findMany.mockResolvedValueOnce([{ id: 90, catalogItemId: 50 }]);
    prismaMock.quoteCatalogItem.findMany
      .mockResolvedValueOnce([{ ...canonicalFamily, updatedAt: new Date("2026-08-30T00:00:00.000Z") }])
      .mockResolvedValueOnce([archivedSource]);

    expect(await getCatalogNormalizationRevertEligibility(validatedRunId)).toEqual({
      eligible: false,
      postRunQuotationLineCount: 0,
      editedFamilyCount: 1,
    });
  });

  it("blocks a recorded quotation line that was recataloged after apply", async () => {
    prismaMock.catalogNormalizationRun.findUnique.mockResolvedValueOnce(appliedRun);
    prismaMock.quotationLine.findMany.mockResolvedValueOnce([{ id: 90, catalogItemId: 999 }]);
    prismaMock.quoteCatalogItem.findMany
      .mockResolvedValueOnce([canonicalFamily])
      .mockResolvedValueOnce([archivedSource]);

    expect(await getCatalogNormalizationRevertEligibility(validatedRunId)).toEqual({
      eligible: false,
      postRunQuotationLineCount: 1,
      editedFamilyCount: 0,
    });
  });

  it("blocks revert when a recorded source row is missing or no longer archived", async () => {
    prismaMock.catalogNormalizationRun.findUnique.mockResolvedValueOnce(appliedRun);
    prismaMock.quotationLine.findMany.mockResolvedValueOnce([{ id: 90, catalogItemId: 50 }]);
    prismaMock.quoteCatalogItem.findMany
      .mockResolvedValueOnce([canonicalFamily])
      .mockResolvedValueOnce([{ id: 1, archivedAt: null }]);

    expect(await getCatalogNormalizationRevertEligibility(validatedRunId)).toEqual({
      eligible: false,
      postRunQuotationLineCount: 0,
      editedFamilyCount: 0,
    });
  });
});

describe("catalog import alias resolution", () => {
  it("resolves exact normalized alias keys only", async () => {
    prismaMock.quoteCatalogAlias.findUnique.mockResolvedValueOnce({ catalogItemId: 50 });

    await expect(resolveCatalogImportAlias("Boiler 400L")).resolves.toEqual({ catalogItemId: 50 });
    expect(prismaMock.quoteCatalogAlias.findUnique).toHaveBeenCalledWith({
      where: { normalizedKey: normalizeCatalogAlias("Boiler 400L") },
      select: { catalogItemId: true },
    });
  });
});
