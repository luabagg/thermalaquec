import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    quoteCatalogItem: { findMany: vi.fn() },
    catalogNormalizationRun: { findUnique: vi.fn(), create: vi.fn() },
  },
}));
vi.mock("~/libs/prisma/client.server", () => ({ default: prismaMock }));

import { digestCatalogSource, type CatalogNormalizationProposal, type CatalogNormalizationSourceSnapshot } from "~/utils/catalog-normalization-contract";
import { exportCatalogNormalizationSource, validateAndRecordCatalogProposal } from "./catalog-normalization.server";

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

describe("catalog normalization preparation", () => {
  beforeEach(() => vi.clearAllMocks());

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
    prismaMock.catalogNormalizationRun.create.mockResolvedValueOnce({ id: 4 });

    await expect(validateAndRecordCatalogProposal({ source, proposal })).resolves.toEqual({ ok: true, runId: 4 });
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

  it("reuses an existing validated run for the same digest and algorithm", async () => {
    prismaMock.catalogNormalizationRun.findUnique.mockResolvedValueOnce({ id: 7, status: "VALIDATED" });

    await expect(validateAndRecordCatalogProposal({ source, proposal })).resolves.toEqual({ ok: true, runId: 7 });
    expect(prismaMock.catalogNormalizationRun.create).not.toHaveBeenCalled();
  });
});
