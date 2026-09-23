// Writes the catalog planned from data/catalog/families.json into the database.
// It never touches clients or quotations. Quotation lines keep their copied data and
// lose only their link to a replaced variant.
// Refuses to replace an existing catalog unless --replace is passed.
import { readFileSync } from "node:fs";

import prisma from "~/libs/prisma/client.server";

import { CATEGORIES, planCatalog, type SourceFamily, type SourceProduct } from "./plan-catalog";

const replace = process.argv.includes("--replace");
const families = JSON.parse(readFileSync("data/catalog/families.json", "utf8")) as SourceFamily[];
const products = JSON.parse(readFileSync("data/catalog/products.json", "utf8")) as SourceProduct[];
const plan = planCatalog(families, products);

async function main() {
  const summary = await prisma.$transaction(
    async (tx) => {
      const existing = await tx.catalogProduct.count();
      if (existing > 0 && !replace) {
        throw new Error(`The catalog already has ${existing} products. Pass --replace to rebuild it.`);
      }
      const removedProducts = (await tx.catalogProduct.deleteMany({})).count;

      const categoryIdBySlug = new Map<string, number>();
      for (const [sortOrder, category] of CATEGORIES.entries()) {
        const data = { name: category.name, color: category.color, sortOrder };
        const row = await tx.catalogCategory.upsert({
          where: { slug: category.slug },
          create: { slug: category.slug, ...data },
          update: data,
          select: { id: true },
        });
        categoryIdBySlug.set(category.slug, row.id);
      }

      // Reserve one id per product, so each variant knows its product before anything is inserted.
      const reserved = await tx.$queryRaw<{ id: bigint }[]>`
        SELECT nextval(pg_get_serial_sequence('catalog_products', 'id')) AS id FROM generate_series(1, ${plan.length})`;
      const productIds = reserved.map((row) => Number(row.id));
      const createdProducts = (
        await tx.catalogProduct.createMany({
          data: plan.map((product, index) => ({
            id: productIds[index],
            name: product.name,
            brand: product.brand,
            categoryId: categoryIdBySlug.get(product.categorySlug)!,
          })),
        })
      ).count;
      const variants = plan.flatMap((product, index) =>
        product.variants.map((variant) => ({
          productId: productIds[index],
          name: variant.name,
          attributes: variant.attributes,
          descriptionLines: variant.descriptionLines,
          priceCents: variant.priceCents,
          sortOrder: variant.sortOrder,
        })),
      );
      const insertedVariants = (await tx.catalogVariant.createMany({ data: variants })).count;
      return { removedProducts, products: createdProducts, variants: insertedVariants };
    },
    { maxWait: 20_000, timeout: 120_000 },
  );

  const expectedVariants = plan.reduce((sum, product) => sum + product.variants.length, 0);
  if (summary.products !== plan.length || summary.variants !== expectedVariants) {
    throw new Error(`Wrote ${JSON.stringify(summary)}, expected ${plan.length} products and ${expectedVariants} variants`);
  }
  console.log(JSON.stringify({ categories: CATEGORIES.length, ...summary }, null, 2));
}

await main();
await prisma.$disconnect();
