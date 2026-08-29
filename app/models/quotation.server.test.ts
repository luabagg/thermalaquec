import { afterEach, expect, test, vi } from "vitest";

const { prismaMock, txMock } = vi.hoisted(() => {
  const txMock = {
    quotation: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    quoteClient: {
      update: vi.fn(),
    },
    quotationLine: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    quotationPaymentOption: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
  };

  const prismaMock = {
    quotation: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    quoteClient: {
      update: vi.fn(),
    },
    quotationLine: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    quotationPaymentOption: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    quoteCatalogItem: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(async (callback: (tx: typeof txMock) => unknown) => callback(txMock)),
  };

  return { prismaMock, txMock };
});

vi.mock("~/libs/prisma/client.server", () => ({ default: prismaMock }));

afterEach(() => {
  vi.clearAllMocks();
});

test("saveQuotation atomically updates the owned quotation and returns a minimal save result", async () => {
  const { saveQuotation } = await import("./quotation.server");

  txMock.quotation.findFirst.mockResolvedValueOnce({ id: 42, clientId: 7 });
  txMock.quoteClient.update.mockResolvedValueOnce({ id: 7 });
  txMock.quotation.update.mockResolvedValueOnce({ id: 42 });
  txMock.quotationLine.deleteMany.mockResolvedValueOnce({ count: 2 });
  txMock.quotationLine.createMany.mockResolvedValueOnce({ count: 2 });
  txMock.quotationPaymentOption.deleteMany.mockResolvedValueOnce({ count: 1 });
  txMock.quotationPaymentOption.createMany.mockResolvedValueOnce({ count: 1 });

  const issuedAt = new Date("2026-08-29T12:00:00.000Z");
  const result = await saveQuotation({
    quotationId: 42,
    ownerUserId: "user-1",
    revision: 17,
    intent: "save-print",
    title: "  Heat pump quote  ",
    issuedAt,
    status: "final",
    location: "  Rua Central, 10  ",
    document: "  12.345.678/0001-90  ",
    notes: "  line one  ",
    lines: [
      {
        name: "  Boiler  ",
        quantity: 0,
        descriptionLines: ["Install"],
        unitPriceCents: -1200,
        catalogItemId: 99,
        imageId: 11,
      },
      {
        name: "Service",
        quantity: 2,
        descriptionLines: [],
        unitPriceCents: 4500,
      },
    ],
    paymentOptions: [
      { label: "  Cash  ", amountCents: -1, detail: "  upfront  " },
      { label: "Card", amountCents: 9900 },
    ],
  });

  expect(result).toEqual({
    ok: true,
    quotationId: 42,
    revision: 17,
    redirectTo: "/admin/quotations/42/print?autoprint=1",
  });
  expect(result).not.toHaveProperty("client");
  expect(result).not.toHaveProperty("lines");

  expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  expect(txMock.quotation.findFirst).toHaveBeenCalledWith({
    where: { id: 42, ownerUserId: "user-1" },
    select: { id: true, clientId: true },
  });
  expect(txMock.quoteClient.update).toHaveBeenCalledWith({
    where: { id: 7 },
    data: {
      location: "Rua Central, 10",
      document: "12.345.678/0001-90",
    },
  });
  expect(txMock.quotation.update).toHaveBeenCalledWith({
    where: { id: 42 },
    data: {
      title: "Heat pump quote",
      issuedAt,
      status: "final",
      notes: "  line one  ",
    },
  });
  expect(txMock.quotationLine.deleteMany).toHaveBeenCalledWith({ where: { quotationId: 42 } });
  expect(txMock.quotationLine.createMany).toHaveBeenCalledWith({
    data: [
      {
        quotationId: 42,
        sortOrder: 0,
        name: "Boiler",
        quantity: 1,
        descriptionLines: ["Install"],
        unitPriceCents: 0,
        catalogItemId: 99,
        imageId: 11,
      },
      {
        quotationId: 42,
        sortOrder: 1,
        name: "Service",
        quantity: 2,
        descriptionLines: [],
        unitPriceCents: 4500,
        catalogItemId: null,
        imageId: null,
      },
    ],
  });
  expect(txMock.quotationPaymentOption.deleteMany).toHaveBeenCalledWith({ where: { quotationId: 42 } });
  expect(txMock.quotationPaymentOption.createMany).toHaveBeenCalledWith({
    data: [
      {
        quotationId: 42,
        sortOrder: 0,
        label: "Cash",
        amountCents: 0,
        detail: "upfront",
      },
      {
        quotationId: 42,
        sortOrder: 1,
        label: "Card",
        amountCents: 9900,
        detail: null,
      },
    ],
  });
});

test("saveQuotation returns a not-found result and skips writes when the owner check fails", async () => {
  const { saveQuotation } = await import("./quotation.server");

  txMock.quotation.findFirst.mockResolvedValueOnce(null);

  const result = await saveQuotation({
    quotationId: 42,
    ownerUserId: "user-1",
    revision: 18,
    intent: "autosave",
    title: "Draft",
    status: "draft",
    location: null,
    document: null,
    notes: null,
    lines: [],
    paymentOptions: [],
  });

  expect(result).toEqual({ ok: false, status: 404, error: "Not found" });
  expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  expect(txMock.quoteClient.update).not.toHaveBeenCalled();
  expect(txMock.quotation.update).not.toHaveBeenCalled();
  expect(txMock.quotationLine.deleteMany).not.toHaveBeenCalled();
  expect(txMock.quotationPaymentOption.deleteMany).not.toHaveBeenCalled();
});

test("loadQuotationEditorData fetches quotation and catalog in parallel with narrow selects", async () => {
  const { loadQuotationEditorData } = await import("./quotation.server");

  const quotation = { id: 42 };
  const catalog = [{ id: 1 }];
  prismaMock.quotation.findFirst.mockResolvedValueOnce(quotation);
  prismaMock.quoteCatalogItem.findMany.mockResolvedValueOnce(catalog);

  const promise = loadQuotationEditorData("user-1", 42);

  expect(prismaMock.quotation.findFirst).toHaveBeenCalledTimes(1);
  expect(prismaMock.quoteCatalogItem.findMany).toHaveBeenCalledTimes(1);

  const quotationQuery = prismaMock.quotation.findFirst.mock.calls[0][0];
  const catalogQuery = prismaMock.quoteCatalogItem.findMany.mock.calls[0][0];

  expect(quotationQuery).toMatchObject({
    where: { id: 42, ownerUserId: "user-1" },
    select: {
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
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          sortOrder: true,
          name: true,
          quantity: true,
          descriptionLines: true,
          unitPriceCents: true,
          catalogItemId: true,
          imageId: true,
          Image: {
            select: { location: true },
          },
        },
      },
      paymentOptions: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          sortOrder: true,
          label: true,
          amountCents: true,
          detail: true,
        },
      },
    },
  });
  expect(quotationQuery).not.toHaveProperty("include");
  expect(catalogQuery).toMatchObject({
    orderBy: { name: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      descriptionLines: true,
      defaultUnitPriceCents: true,
      imageId: true,
      Image: {
        select: { location: true },
      },
    },
  });
  expect(catalogQuery).not.toHaveProperty("include");

  await expect(promise).resolves.toEqual({ quotation, catalog });
});
