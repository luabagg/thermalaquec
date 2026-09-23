// Persistence rules checked against a real PostgreSQL. Runs only with TEST_DATABASE_URL set to a local
// database, because every test truncates the tables:
//   TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55432/thermal yarn test app/models/models.db.test.ts
import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

const url = process.env.TEST_DATABASE_URL;

type Models = {
  prisma: PrismaClient;
  quotation: typeof import("./quotation.server");
  client: typeof import("./client.server");
  catalog: typeof import("./catalog.server");
};

describe.skipIf(!url)("persistence", () => {
  let m: Models;

  beforeAll(async () => {
    if (!/@(127\.0\.0\.1|localhost)[:/]/.test(url!)) throw new Error("TEST_DATABASE_URL must point at a local database");
    process.env.POSTGRES_PRISMA_URL = url;
    process.env.POSTGRES_URL_NON_POOLING = url;
    m = {
      prisma: (await import("~/libs/prisma/client.server")).default,
      quotation: await import("./quotation.server"),
      client: await import("./client.server"),
      catalog: await import("./catalog.server"),
    };
  });

  beforeEach(async () => {
    await m.prisma.$executeRawUnsafe(
      "TRUNCATE clients, quotations, catalog_products, catalog_categories, images RESTART IDENTITY CASCADE",
    );
  });

  afterAll(async () => {
    await m?.prisma.$disconnect();
  });

  const OWNER = "00000000-0000-4000-8000-000000000001";
  const OTHER_OWNER = "00000000-0000-4000-8000-000000000002";
  const clientData = {
    name: "Abel",
    document: null,
    phone: "54991553618",
    email: null,
    postalCode: null,
    street: null,
    number: null,
    complement: null,
    district: null,
    city: "Farroupilha",
    state: "RS",
    notes: null,
  };

  async function seedQuotation(ownerUserId = OWNER) {
    const client = await m.client.createClient(clientData);
    if (!client.ok) throw new Error("client not created");
    const quotation = await m.quotation.createQuotation({ clientId: client.client.id, ownerUserId });
    return { clientId: client.client.id, quotationId: quotation.id };
  }

  async function seedProduct(variantNames: string[]) {
    const product = await m.prisma.catalogProduct.create({
      data: { name: "Boiler", variants: { create: variantNames.map((name, sortOrder) => ({ name, sortOrder })) } },
      include: { variants: { orderBy: { sortOrder: "asc" } } },
    });
    return product;
  }

  const line = (name: string, catalogVariantId: number | null = null) => ({
    name,
    quantity: 2,
    descriptionLines: [`${name} bullet`],
    unitPriceCents: 150_00,
    catalogVariantId,
    imageId: null,
  });

  function save(ids: { clientId: number; quotationId: number }, lines: ReturnType<typeof line>[], ownerUserId = OWNER) {
    return m.quotation.saveQuotation({
      quotationId: ids.quotationId,
      ownerUserId,
      clientId: ids.clientId,
      status: "draft",
      notes: null,
      lines,
      paymentOptions: [{ label: "À vista", amountCents: 300_00, detail: null }],
    });
  }

  test("saving the same editor state twice keeps every line", async () => {
    const ids = await seedQuotation();

    await expect(save(ids, [line("Boiler"), line("Bomba")])).resolves.toEqual({ ok: true });
    await expect(save(ids, [line("Boiler"), line("Bomba")])).resolves.toEqual({ ok: true });

    const saved = await m.quotation.getQuotation(ids.quotationId, OWNER);
    expect(saved?.lines.map((row) => row.name)).toEqual(["Boiler", "Bomba"]);
    expect(saved?.paymentOptions).toHaveLength(1);
  });

  test("a line whose catalog variant was deleted meanwhile saves without the link", async () => {
    const ids = await seedQuotation();
    const product = await seedProduct(["Boiler 400L"]);
    const variantId = product.variants[0].id;
    await m.prisma.catalogVariant.delete({ where: { id: variantId } });

    await expect(save(ids, [line("Boiler 400L", variantId)])).resolves.toEqual({ ok: true });

    const [saved] = (await m.quotation.getQuotation(ids.quotationId, OWNER))!.lines;
    expect(saved).toMatchObject({ name: "Boiler 400L", unitPriceCents: 150_00, catalogVariantId: null });
  });

  test("deleting a catalog product keeps the quotation lines that used it", async () => {
    const ids = await seedQuotation();
    const product = await seedProduct(["Boiler 400L"]);
    await save(ids, [line("Boiler 400L", product.variants[0].id)]);

    const current = await m.catalog.getCatalogProduct(product.id);
    await expect(m.catalog.deleteCatalogProduct(product.id, current!.updatedAt)).resolves.toMatchObject({ ok: true });

    const [kept] = (await m.quotation.getQuotation(ids.quotationId, OWNER))!.lines;
    expect(kept).toMatchObject({ name: "Boiler 400L", descriptionLines: ["Boiler 400L bullet"], catalogVariantId: null });
  });

  test("another user cannot save or read a quotation", async () => {
    const ids = await seedQuotation(OWNER);
    await save(ids, [line("Original")]);

    await expect(save(ids, [line("Hijack")], OTHER_OWNER)).resolves.toMatchObject({ ok: false, status: 404 });
    await expect(m.quotation.getQuotation(ids.quotationId, OTHER_OWNER)).resolves.toBeNull();
    const kept = await m.quotation.getQuotation(ids.quotationId, OWNER);
    expect(kept?.lines.map((row) => row.name)).toEqual(["Original"]);
  });

  test("saving a quotation never changes its client", async () => {
    const ids = await seedQuotation();
    const before = await m.prisma.client.findUniqueOrThrow({ where: { id: ids.clientId } });

    await save(ids, [line("Boiler")]);

    await expect(m.prisma.client.findUniqueOrThrow({ where: { id: ids.clientId } })).resolves.toEqual(before);
  });

  test("two clients cannot share a CPF/CNPJ", async () => {
    await m.client.createClient({ ...clientData, document: "52998224725" });

    await expect(m.client.createClient({ ...clientData, name: "Outro", document: "52998224725" })).resolves.toEqual({
      ok: false,
      fieldErrors: { document: expect.any(String) },
    });
  });

  test("a client with quotations cannot be deleted", async () => {
    const ids = await seedQuotation();

    await expect(m.client.deleteClient(ids.clientId)).resolves.toEqual({ ok: false, error: "has_quotations" });
    await expect(m.prisma.client.count()).resolves.toBe(1);
  });

  test("a stale product edit changes nothing", async () => {
    const product = await seedProduct(["Boiler 400L"]);
    const staleVersion = new Date(product.updatedAt.getTime() - 1000);
    const input = {
      name: "Renamed",
      brand: null,
      categoryId: null,
      descriptionLines: [],
      imageId: null,
      variants: [{ id: product.variants[0].id, name: "Renamed 400L", attributes: [], descriptionLines: [], priceCents: null, imageId: null, active: true }],
    };

    await expect(m.catalog.updateCatalogProduct(product.id, staleVersion, input)).resolves.toEqual({ ok: false, error: "stale" });
    const unchanged = await m.catalog.getCatalogProduct(product.id);
    expect(unchanged?.name).toBe("Boiler");
    expect(unchanged?.variants.map((variant) => variant.name)).toEqual(["Boiler 400L"]);
  });

  test("saving a product keeps kept variants, drops removed ones and adds new ones in order", async () => {
    const product = await seedProduct(["Boiler 400L", "Boiler 600L"]);
    const [kept] = product.variants;
    const variant = (id: number | null, name: string) => ({ id, name, attributes: [], descriptionLines: [], priceCents: null, imageId: null, active: true });

    const result = await m.catalog.updateCatalogProduct(product.id, product.updatedAt, {
      name: "Boiler",
      brand: "Warma",
      categoryId: null,
      descriptionLines: [],
      imageId: null,
      variants: [variant(null, "Boiler 1000L"), variant(kept.id, "Boiler 400L inox")],
    });

    expect(result).toEqual({ ok: true, id: product.id });
    const saved = await m.catalog.getCatalogProduct(product.id);
    expect(saved?.variants.map((row) => [row.name, row.id === kept.id])).toEqual([
      ["Boiler 1000L", false],
      ["Boiler 400L inox", true],
    ]);
  });

  test("a product cannot lose its last variant or take another product's variant", async () => {
    const product = await seedProduct(["Boiler 400L"]);
    const other = await seedProduct(["Outro"]);
    const base = { name: "Boiler", brand: null, categoryId: null, descriptionLines: [], imageId: null };
    const foreign = { id: other.variants[0].id, name: "Outro", attributes: [], descriptionLines: [], priceCents: null, imageId: null, active: true };

    await expect(m.catalog.updateCatalogProduct(product.id, product.updatedAt, { ...base, variants: [] })).resolves.toMatchObject({ ok: false, error: "invalid" });
    await expect(m.catalog.updateCatalogProduct(product.id, product.updatedAt, { ...base, variants: [foreign] })).resolves.toMatchObject({ ok: false, error: "invalid" });
    await expect(m.prisma.catalogVariant.count({ where: { productId: other.id } })).resolves.toBe(1);
  });

  test("the picker offers only active variants of products that are not archived", async () => {
    const shown = await seedProduct(["Boiler 400L", "Boiler 600L"]);
    await m.prisma.catalogVariant.update({ where: { id: shown.variants[1].id }, data: { active: false } });
    const archived = await seedProduct(["Arquivado"]);
    await m.prisma.catalogProduct.update({ where: { id: archived.id }, data: { archivedAt: new Date() } });

    const products = await m.catalog.listCatalogPickerProducts();

    expect(products.flatMap((product) => product.variants.map((variant) => variant.name))).toEqual(["Boiler 400L"]);
  });
});
