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

async function upsertCatalogProduct(product) {
  await prisma.quoteCatalogItem.upsert({
    where: { slug: product.id },
    update: {
      name: product.name,
      descriptionLines: product.descriptionLines ?? [],
      defaultUnitPriceCents: product.defaultUnitPriceCents ?? null,
    },
    create: {
      slug: product.id,
      name: product.name,
      descriptionLines: product.descriptionLines ?? [],
      defaultUnitPriceCents: product.defaultUnitPriceCents ?? null,
    },
  });
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
