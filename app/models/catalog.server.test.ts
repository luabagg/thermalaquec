import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, txMock } = vi.hoisted(() => {
  const txMock = {
    quoteCatalogItem: { updateMany: vi.fn(), findUnique: vi.fn() },
    quoteCatalogOption: { create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    quoteCatalogOptionValue: { create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    quoteCatalogVariant: { create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    quoteCatalogVariantValue: { createMany: vi.fn(), deleteMany: vi.fn() },
  };
  const prismaMock = {
    quoteCatalogItem: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
    quotationLine: { groupBy: vi.fn() },
    $transaction: vi.fn(async (callback: (tx: typeof txMock) => unknown) => callback(txMock)),
  };
  return { prismaMock, txMock };
});
vi.mock("~/libs/prisma/client.server", () => ({ default: prismaMock }));

import { archiveCatalogFamily, getCatalogDeletionEligibility, getCatalogDeletionEligibilityByIds, getCatalogFamilyDetail, listActiveCatalogPickerSummaries, listCatalogSummaries, restoreCatalogFamily, updateCatalogFamilyAggregate } from "./catalog.server";

const input = {
  id: 1, expectedUpdatedAt: "2026-08-29T00:00:00.000Z",
  family: { slug: "boiler", name: "Boiler", nameTemplate: null, descriptionLines: [], defaultUnitPriceCents: null, imageId: null },
  options: [], variants: [],
};
const existing = (options: Array<{ id: number; values: Array<{ id: number }> }> = [], variants: Array<{ id: number }> = []) => ({ options, variants });

function prepareUpdate(record = existing()) {
  prismaMock.quoteCatalogItem.findUnique.mockResolvedValueOnce(record);
  txMock.quoteCatalogItem.updateMany.mockResolvedValueOnce({ count: 1 });
  txMock.quoteCatalogItem.findUnique.mockResolvedValueOnce({ id: 1 });
}

describe("catalog aggregate model", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists compact active summaries without option values or variants", async () => {
    prismaMock.quoteCatalogItem.findMany.mockResolvedValueOnce([]);
    await listCatalogSummaries({ status: "active", search: "boiler" });
    expect(prismaMock.quoteCatalogItem.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { archivedAt: null, name: { contains: "boiler", mode: "insensitive" } },
      select: expect.objectContaining({
        _count: { select: { options: true, variants: true } },
      }),
    }));
  });

  it("lists active quotation picker summaries without detail payloads", async () => {
    prismaMock.quoteCatalogItem.findMany.mockResolvedValueOnce([]);
    await listActiveCatalogPickerSummaries();
    const query = prismaMock.quoteCatalogItem.findMany.mock.calls[0][0];
    expect(query).toMatchObject({
      where: { archivedAt: null },
      orderBy: { name: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        defaultUnitPriceCents: true,
        imageId: true,
        Image: { select: { location: true, thumbnail: true } },
        _count: { select: { options: true, variants: true } },
      },
    });
    expect(query.select).not.toHaveProperty("descriptionLines");
    expect(query.select).not.toHaveProperty("options");
    expect(query.select).not.toHaveProperty("variants");
  });

  it("returns stale before mutating children when its parent version cannot be claimed", async () => {
    prismaMock.quoteCatalogItem.findUnique.mockResolvedValueOnce(existing());
    txMock.quoteCatalogItem.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(updateCatalogFamilyAggregate(input)).resolves.toEqual({ ok: false, error: "stale" });
    expect(txMock.quoteCatalogOption.create).not.toHaveBeenCalled();
  });

  it("updates unchanged child IDs rather than recreating them", async () => {
    prepareUpdate(existing([{ id: 2, values: [{ id: 3 }] }]));
    txMock.quoteCatalogOption.update.mockResolvedValueOnce({ id: 2 });
    txMock.quoteCatalogOptionValue.update.mockResolvedValueOnce({ id: 3 });
    await updateCatalogFamilyAggregate({ ...input, options: [{ id: 2, clientKey: "o", name: "Size", slug: "size", placement: "TITLE", sortOrder: 0, values: [{ id: 3, clientKey: "v", label: "Large", slug: "large", titleFragment: null, descriptionLines: [], sortOrder: 0 }] }] });
    expect(txMock.quoteCatalogOption.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 2 } }));
    expect(txMock.quoteCatalogOptionValue.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 3 } }));
    expect(txMock.quoteCatalogOption.create).not.toHaveBeenCalled();
  });

  it("deletes values omitted from a retained option after variants and before options", async () => {
    prepareUpdate(existing([{ id: 2, values: [{ id: 3 }, { id: 5 }] }], [{ id: 4 }]));
    txMock.quoteCatalogOption.update.mockResolvedValueOnce({ id: 2 });
    txMock.quoteCatalogOptionValue.update.mockResolvedValueOnce({ id: 3 });
    await updateCatalogFamilyAggregate({ ...input, options: [{ id: 2, clientKey: "o", name: "Size", slug: "size", placement: "TITLE", sortOrder: 0, values: [{ id: 3, clientKey: "v", label: "Large", slug: "large", titleFragment: null, descriptionLines: [], sortOrder: 0 }] }] });
    expect(txMock.quoteCatalogOptionValue.deleteMany).toHaveBeenCalledWith({ where: { id: { in: [5] } } });
    expect(txMock.quoteCatalogVariant.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(txMock.quoteCatalogOptionValue.deleteMany.mock.invocationCallOrder[0]);
    expect(txMock.quoteCatalogOptionValue.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(txMock.quoteCatalogOption.deleteMany.mock.invocationCallOrder[0]);
  });

  it("rejects invalid aggregate IDs and nesting before the parent claim or child mutations", async () => {
    prismaMock.quoteCatalogItem.findUnique.mockResolvedValueOnce(existing([{ id: 2, values: [{ id: 3 }] }, { id: 9, values: [] }]));
    const result = await updateCatalogFamilyAggregate({ ...input, options: [{ id: 2, clientKey: "parent", name: "Other", slug: "other", placement: "TITLE", sortOrder: 0, values: [] }, { id: 9, clientKey: "wrong-parent", name: "Size", slug: "size", placement: "TITLE", sortOrder: 1, values: [{ id: 3, clientKey: "v", label: "Large", slug: "large", titleFragment: null, descriptionLines: [], sortOrder: 0 }] }] });
    expect(result).toMatchObject({ ok: false, error: "invalid" });
    expect(txMock.quoteCatalogItem.updateMany).not.toHaveBeenCalled();
    expect(txMock.quoteCatalogOption.update).not.toHaveBeenCalled();
    expect(txMock.quoteCatalogOptionValue.update).not.toHaveBeenCalled();
  });

  it("rejects a retained variant that references an unknown removed value before mutation", async () => {
    prismaMock.quoteCatalogItem.findUnique.mockResolvedValueOnce(existing([{ id: 2, values: [{ id: 3 }] }], [{ id: 4 }]));
    const result = await updateCatalogFamilyAggregate({ ...input, variants: [{ id: 4, clientKey: "variant", valueClientKeys: ["removed"], sku: null, active: true, nameOverride: null, descriptionLinesOverride: null, unitPriceCents: null, imageId: null }] });
    expect(result).toMatchObject({ ok: false, error: "invalid" });
    expect(txMock.quoteCatalogItem.updateMany).not.toHaveBeenCalled();
  });

  it("includes ordered options and variant images in family detail", async () => {
    prismaMock.quoteCatalogItem.findUnique.mockResolvedValueOnce(null);
    await getCatalogFamilyDetail(1);
    expect(prismaMock.quoteCatalogItem.findUnique).toHaveBeenCalledWith(expect.objectContaining({ include: expect.objectContaining({
      variants: expect.objectContaining({
        include: expect.objectContaining({ Image: { select: { location: true, thumbnail: true } } }),
      }),
    }) }));
  });

  it("archives and restores only when the expected version matches", async () => {
    prismaMock.quoteCatalogItem.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 });
    prismaMock.quoteCatalogItem.findUnique.mockResolvedValueOnce({ id: 1 }).mockResolvedValueOnce({ id: 1 });
    await archiveCatalogFamily(1, input.expectedUpdatedAt);
    await restoreCatalogFamily(1, input.expectedUpdatedAt);
    expect(prismaMock.quoteCatalogItem.updateMany).toHaveBeenNthCalledWith(1, expect.objectContaining({ data: { archivedAt: expect.any(Date) } }));
    expect(prismaMock.quoteCatalogItem.updateMany).toHaveBeenNthCalledWith(2, expect.objectContaining({ data: { archivedAt: null } }));
  });

  it("blocks deletion only when a quotation still references the family", async () => {
    prismaMock.quotationLine.groupBy.mockResolvedValueOnce([]);
    await expect(getCatalogDeletionEligibility(1)).resolves.toEqual({ eligible: true, quotationLines: 0 });
  });

  it("counts a whole catalog page with one query", async () => {
    prismaMock.quotationLine.groupBy.mockResolvedValueOnce([{ catalogItemId: 1, _count: { _all: 2 } }]);

    const eligibilityById = await getCatalogDeletionEligibilityByIds([1, 2]);

    expect(prismaMock.quotationLine.groupBy).toHaveBeenCalledTimes(1);
    expect([...eligibilityById.values()]).toEqual([
      { eligible: false, quotationLines: 2 },
      { eligible: true, quotationLines: 0 },
    ]);
  });

  it("reads no reference table for an empty catalog page", async () => {
    await expect(getCatalogDeletionEligibilityByIds([])).resolves.toEqual(new Map());
    expect(prismaMock.quotationLine.groupBy).not.toHaveBeenCalled();
  });
});
