import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, txMock } = vi.hoisted(() => {
  const txMock = {
    quoteCatalogItem: { updateMany: vi.fn(), findUnique: vi.fn() },
    quoteCatalogOption: { create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    quoteCatalogOptionValue: { create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    quoteCatalogVariant: { create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    quoteCatalogVariantValue: { createMany: vi.fn(), deleteMany: vi.fn(), count: vi.fn() },
  };
  const prismaMock = {
    quoteCatalogItem: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
    quoteCatalogOption: {}, quoteCatalogOptionValue: {}, quoteCatalogVariant: {}, quoteCatalogVariantValue: {},
    quotationLine: { count: vi.fn() }, catalogNormalizationSourceMap: { count: vi.fn() }, quoteCatalogAlias: { count: vi.fn() },
    $transaction: vi.fn(async (callback: (tx: typeof txMock) => unknown) => callback(txMock)),
  };
  return { prismaMock, txMock };
});
vi.mock("~/libs/prisma/client.server", () => ({ default: prismaMock }));

import { archiveCatalogFamily, getCatalogDeletionEligibility, listCatalogSummaries, restoreCatalogFamily, updateCatalogFamilyAggregate } from "./catalog.server";

const input = {
  id: 1, expectedUpdatedAt: "2026-08-29T00:00:00.000Z",
  family: { slug: "boiler", name: "Boiler", nameTemplate: null, descriptionLines: [], defaultUnitPriceCents: null, imageId: null },
  options: [], variants: [],
};

describe("catalog aggregate model", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists compact active summaries without option values or variants", async () => {
    prismaMock.quoteCatalogItem.findMany.mockResolvedValueOnce([]);
    await listCatalogSummaries({ status: "active", search: "boiler" });
    expect(prismaMock.quoteCatalogItem.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { archivedAt: null, name: { contains: "boiler", mode: "insensitive" } },
      select: expect.not.objectContaining({ options: expect.anything(), variants: expect.anything() }),
    }));
  });

  it("returns stale before reading or mutating children when its parent version cannot be claimed", async () => {
    txMock.quoteCatalogItem.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(updateCatalogFamilyAggregate(input)).resolves.toEqual({ ok: false, error: "stale" });
    expect(txMock.quoteCatalogItem.findUnique).not.toHaveBeenCalled();
  });

  it("updates unchanged child IDs rather than recreating them", async () => {
    txMock.quoteCatalogItem.updateMany.mockResolvedValueOnce({ count: 1 });
    txMock.quoteCatalogItem.findUnique.mockResolvedValueOnce({ options: [{ id: 2, values: [{ id: 3 }] }], variants: [] }).mockResolvedValueOnce({ id: 1 });
    txMock.quoteCatalogOption.update.mockResolvedValueOnce({ id: 2 });
    txMock.quoteCatalogOptionValue.update.mockResolvedValueOnce({ id: 3 });
    txMock.quoteCatalogVariantValue.count.mockResolvedValueOnce(0);
    await updateCatalogFamilyAggregate({ ...input, options: [{ id: 2, clientKey: "o", name: "Size", slug: "size", placement: "TITLE", sortOrder: 0, values: [{ id: 3, clientKey: "v", label: "Large", slug: "large", titleFragment: null, descriptionLines: [], sortOrder: 0 }] }] });
    expect(txMock.quoteCatalogOption.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 2 } }));
    expect(txMock.quoteCatalogOptionValue.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 3 } }));
    expect(txMock.quoteCatalogOption.create).not.toHaveBeenCalled();
    expect(txMock.quoteCatalogOptionValue.create).not.toHaveBeenCalled();
  });

  it("deletes explicitly omitted variants before their now-unreferenced values", async () => {
    txMock.quoteCatalogItem.updateMany.mockResolvedValueOnce({ count: 1 });
    txMock.quoteCatalogItem.findUnique.mockResolvedValueOnce({ options: [{ id: 2, values: [{ id: 3 }] }], variants: [{ id: 4 }] }).mockResolvedValueOnce({ id: 1 });
    txMock.quoteCatalogVariantValue.count.mockResolvedValueOnce(0);
    await updateCatalogFamilyAggregate(input);
    expect(txMock.quoteCatalogVariant.deleteMany).toHaveBeenCalledWith({ where: { catalogItemId: 1, id: { notIn: [] } } });
    expect(txMock.quoteCatalogOptionValue.deleteMany).toHaveBeenCalledWith({ where: { optionId: { in: [2] } } });
  });

  it("rejects implicit orphaning when a retained variant references a removed value", async () => {
    txMock.quoteCatalogItem.updateMany.mockResolvedValueOnce({ count: 1 });
    txMock.quoteCatalogItem.findUnique.mockResolvedValueOnce({ options: [{ id: 2, values: [{ id: 3 }] }], variants: [{ id: 4 }] });
    await expect(updateCatalogFamilyAggregate({ ...input, variants: [{ id: 4, clientKey: "variant", valueClientKeys: ["removed"], sku: null, active: true, nameOverride: null, descriptionLinesOverride: null, unitPriceCents: null, imageId: null }] })).resolves.toMatchObject({ ok: false, error: "invalid" });
    expect(txMock.quoteCatalogOptionValue.deleteMany).not.toHaveBeenCalled();
  });

  it("archives and restores only when the expected version matches", async () => {
    prismaMock.quoteCatalogItem.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 });
    prismaMock.quoteCatalogItem.findUnique.mockResolvedValueOnce({ id: 1 }).mockResolvedValueOnce({ id: 1 });
    await archiveCatalogFamily(1, input.expectedUpdatedAt);
    await restoreCatalogFamily(1, input.expectedUpdatedAt);
    expect(prismaMock.quoteCatalogItem.updateMany).toHaveBeenNthCalledWith(1, expect.objectContaining({ data: { archivedAt: expect.any(Date) } }));
    expect(prismaMock.quoteCatalogItem.updateMany).toHaveBeenNthCalledWith(2, expect.objectContaining({ data: { archivedAt: null } }));
  });

  it("blocks hard deletion eligibility for quotation and normalization provenance", async () => {
    prismaMock.quotationLine.count.mockResolvedValueOnce(1);
    prismaMock.catalogNormalizationSourceMap.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);
    prismaMock.quoteCatalogAlias.count.mockResolvedValueOnce(1);
    await expect(getCatalogDeletionEligibility(1)).resolves.toMatchObject({ eligible: false, quotationLines: 1, sourceMaps: 1, aliases: 1, generatedFamilies: 1 });
  });
});
