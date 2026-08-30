import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { productsData } from "~/data/products";
import { loader as productDetailLoader } from "./produtos.$slug";

const root = process.cwd();

function source(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function applicationSources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const location = path.join(directory, entry.name);
    if (entry.isDirectory()) return applicationSources(location);
    if (!/\.(?:ts|tsx|js|mjs)$/.test(entry.name) || entry.name.includes(".test.")) return [];
    return [location];
  });
}

describe("fresh-app legacy product removal", () => {
  it("keeps public product routes on the static marketing catalog", async () => {
    for (const route of ["app/routes/produtos._index.tsx", "app/routes/produtos.$slug.tsx"]) {
      const routeSource = source(route);
      expect(routeSource).toContain('from "~/data/products"');
      expect(routeSource).not.toMatch(/from ["'][^"']*models\//);
    }

    const product = productsData[0];
    await expect(productDetailLoader({ params: { slug: product.slug } } as never)).resolves.toEqual({ product });
  });

  it("removes legacy Prisma models, Image relations, and runtime model imports", () => {
    const schema = source("prisma/schema.prisma");
    const legacyModels = ["Product", "ProductSpec", "Brand", "Category", "Showcase", "ShowcaseProduct"];
    for (const model of legacyModels) {
      expect(schema).not.toMatch(new RegExp(`model\\s+${model}\\s*\\{`));
    }
    const imageModel = schema.match(/model Image \{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(imageModel).not.toMatch(/\bProduct\b|\bShowcase\b/);

    const removedRuntimeModule = path.join(root, "app/models", "product" + ".server.ts");
    expect(existsSync(removedRuntimeModule)).toBe(false);
    const obsoleteImport = "product" + ".server";
    for (const file of applicationSources(path.join(root, "app"))) {
      expect(readFileSync(file, "utf8"), file).not.toContain(obsoleteImport);
    }
  });

  it("uses an unconditional direct cleanup migration and no compatibility preflight", () => {
    const migration = source("prisma/migrations/20260829190000_remove_legacy_products/migration.sql");
    for (const table of ["ShowcaseProduct", "ProductSpec", "Showcase", "Product", "Brand", "Category"]) {
      expect(migration).toContain(`DROP TABLE "${table}";`);
    }
    expect(migration).not.toMatch(/preflight|acknowledge|IF EXISTS|RAISE EXCEPTION/i);
    expect(existsSync(path.join(root, "scripts/legacy-products/preflight.ts"))).toBe(false);
  });

  it("seeds the normalized catalog by slug without legacy alias fallback", () => {
    const seed = source("prisma/seed.js");
    expect(seed).toContain("prisma.quoteCatalogItem.upsert");
    expect(seed).not.toContain("prisma.quoteCatalogAlias");
    expect(seed).not.toContain("normalizeCatalogAlias");
  });
});
