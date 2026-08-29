import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const prisma = new PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.resolve(__dirname, "../data/quotations");

function readJson(file) {
  const full = path.join(DATA, file);
  if (!fs.existsSync(full)) {
    console.warn(`Skip missing ${file}`);
    return null;
  }
  return JSON.parse(fs.readFileSync(full, "utf8"));
}

function normalizeCatalogAlias(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(litros?|lts?)\b/g, "l")
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function upsertCatalogProduct(product) {
  const slug = product.id;
  const data = {
    name: product.name,
    descriptionLines: product.descriptionLines ?? [],
    defaultUnitPriceCents: product.defaultUnitPriceCents ?? null,
  };

  const bySlug = await prisma.quoteCatalogItem.findUnique({ where: { slug } });
  if (bySlug) {
    await prisma.quoteCatalogItem.update({ where: { slug }, data });
    return;
  }

  const byAlias = await prisma.quoteCatalogAlias.findUnique({
    where: { normalizedKey: normalizeCatalogAlias(product.name) },
    select: { catalogItemId: true },
  });
  if (byAlias) {
    await prisma.quoteCatalogItem.update({ where: { id: byAlias.catalogItemId }, data });
    return;
  }

  await prisma.quoteCatalogItem.create({ data: { slug, ...data } });
}

async function main() {
  const products = readJson("catalog.products.json") || [];
  const clients = readJson("catalog.clients.json") || [];

  console.log(`Seeding ${clients.length} clients, ${products.length} catalog items…`);

  for (const client of clients) {
    const existing = await prisma.quoteClient.findFirst({
      where: { name: client.name },
    });
    if (existing) {
      await prisma.quoteClient.update({
        where: { id: existing.id },
        data: {
          location: client.locations?.[0] ?? existing.location,
          document: client.document ?? existing.document,
        },
      });
    } else {
      await prisma.quoteClient.create({
        data: {
          name: client.name,
          location: client.locations?.[0] ?? null,
          document: client.document ?? null,
        },
      });
    }
  }

  for (const product of products) {
    await upsertCatalogProduct(product);
  }

  console.log("Seed done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
