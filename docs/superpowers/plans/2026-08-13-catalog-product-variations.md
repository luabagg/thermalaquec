# Catalog Product Variations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let one quotation catalog product (e.g. Boiler) carry option axes (capacity, material) so adding it to a quote composes name, bullet description, price, and image from the selected values — without duplicating near-identical catalog rows.

**Architecture:** Keep `QuoteCatalogItem` as the parent product. Simple items (zero options) behave exactly as today. Configurable items own `QuoteCatalogOption` / `QuoteCatalogOptionValue` rows whose `descriptionLines` are appended onto the product's base bullets. Optional `QuoteCatalogVariant` rows pin an absolute price/image/name for a specific combination. Resolution is a pure function; the quotation line still **snapshots** the resolved name/description/price so printed quotes never drift when the catalog changes.

**Tech Stack:** Remix 2, Prisma 6, PostgreSQL, React 18. Tests via Node 24 built-in test runner (`node --test --experimental-strip-types`). No new runtime dependencies.

## Global Constraints

- Scope is the **quotation catalog** (`QuoteCatalogItem` / `/admin/catalog` / quote builder). Do **not** change marketing `app/data/products.ts`.
- Existing catalog rows remain valid simple products (zero options). No automatic merge of Canva-extracted names.
- Quotation lines stay snapshots: resolve once on "Adicionar", then store `name`, `descriptionLines`, `unitPriceCents`, `imageId` as today. Also persist `catalogOptionValueIds` for audit.
- Prices are **absolute** on the matching variant (or the product default). No additive price deltas — Thermal combination prices are not linear.
- If a product has **any** variants, only those combinations are addable. If it has **none**, every option combination is valid and price falls back to `defaultUnitPriceCents`.
- Description composition: product base bullets first, then each selected value's bullets in option `sortOrder`. Exact-string dedupe. A variant `descriptionLinesOverride` replaces the whole composed list.
- Name composition: `nameTemplate` with `{name}` and `{<option.slug>}` placeholders; if null, join `product.name` + selected value labels in option order.
- Copy and UI remain Portuguese (pt-BR), matching the rest of admin.
- Do not rewrite the Canva parser in this plan.

---

## File map

| File | Responsibility |
|------|----------------|
| `app/utils/catalog-variation.ts` | Pure resolve/compose + variant key. No Prisma. |
| `app/utils/catalog-variation.test.ts` | Node test runner coverage of composition rules. |
| `prisma/schema.prisma` | Options, values, variants, line snapshot field. |
| `prisma/migrations/20260813180000_catalog_variations/migration.sql` | Additive SQL. |
| `app/models/quotation.server.ts` | Load options/variants; CRUD; persist `catalogOptionValueIds`. |
| `app/routes/admin.catalog.tsx` | List shows option count; link to edit. |
| `app/routes/admin.catalog.$id.tsx` | Edit product + options + values + optional variants. |
| `app/components/admin/CatalogVariationPicker.tsx` | Quote-builder option selects + live preview. |
| `app/routes/admin.quotations.$id.tsx` | Picker flow before add; persist selection ids. |
| `package.json` | `"test"` script. |

---

### Task 1: Pure resolver + tests

**Files:**
- Create: `app/utils/catalog-variation.ts`
- Create: `app/utils/catalog-variation.test.ts`
- Modify: `package.json` (add `"test"`)

**Interfaces:**
- Consumes: nothing
- Produces: `variantKey`, `resolveCatalogSelection`, types `CatalogProductInput`, `ResolvedCatalogSelection`, `ResolveCatalogError`

- [ ] **Step 1: Write the failing tests**

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveCatalogSelection,
  variantKey,
  type CatalogProductInput,
} from "./catalog-variation.ts";

const boiler: CatalogProductInput = {
  name: "Boiler",
  nameTemplate: "{name} {capacidade} {material}",
  descriptionLines: [
    "Reservatório de água quente com isolamento térmico",
    "Resistência elétrica de apoio com termostato",
  ],
  defaultUnitPriceCents: 800000,
  imageId: 1,
  options: [
    {
      id: 10,
      name: "Capacidade",
      slug: "capacidade",
      sortOrder: 0,
      values: [
        { id: 101, optionId: 10, label: "400 litros", slug: "400-litros", descriptionLines: ["Capacidade: 400 litros"], sortOrder: 0 },
        { id: 102, optionId: 10, label: "600 litros", slug: "600-litros", descriptionLines: ["Capacidade: 600 litros"], sortOrder: 1 },
      ],
    },
    {
      id: 20,
      name: "Material",
      slug: "material",
      sortOrder: 1,
      values: [
        { id: 201, optionId: 20, label: "AISI 304", slug: "aisi-304", descriptionLines: ["Material: aço inox AISI 304"], sortOrder: 0 },
        {
          id: 202,
          optionId: 20,
          label: "AISI 316",
          slug: "aisi-316",
          descriptionLines: [
            "Material: aço inox AISI 316",
            "Indicado para água com maior agressividade química",
          ],
          sortOrder: 1,
        },
      ],
    },
  ],
  variants: [],
};

describe("variantKey", () => {
  it("sorts ids so selection order does not matter", () => {
    assert.equal(variantKey([202, 101]), variantKey([101, 202]));
    assert.equal(variantKey([202, 101]), "101|202");
  });
});

describe("resolveCatalogSelection", () => {
  it("returns the product as-is when it has no options", () => {
    const simple: CatalogProductInput = {
      name: "Mão de obra",
      nameTemplate: null,
      descriptionLines: ["Instalação completa"],
      defaultUnitPriceCents: 150000,
      imageId: null,
      options: [],
      variants: [],
    };
    const result = resolveCatalogSelection(simple, []);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.value, {
      name: "Mão de obra",
      descriptionLines: ["Instalação completa"],
      unitPriceCents: 150000,
      imageId: null,
      variantKey: null,
      optionValueIds: [],
    });
  });

  it("composes name and appends value bullets in option order", () => {
    const result = resolveCatalogSelection(boiler, [202, 101]);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.name, "Boiler 400 litros AISI 316");
    assert.deepEqual(result.value.descriptionLines, [
      "Reservatório de água quente com isolamento térmico",
      "Resistência elétrica de apoio com termostato",
      "Capacidade: 400 litros",
      "Material: aço inox AISI 316",
      "Indicado para água com maior agressividade química",
    ]);
    assert.equal(result.value.unitPriceCents, 800000);
    assert.equal(result.value.imageId, 1);
    assert.equal(result.value.variantKey, null);
    assert.deepEqual(result.value.optionValueIds, [101, 202]);
  });

  it("dedupes identical bullets across product and values", () => {
    const product: CatalogProductInput = {
      ...boiler,
      nameTemplate: null,
      descriptionLines: ["Capacidade: 400 litros", "Base"],
    };
    const result = resolveCatalogSelection(product, [101, 201]);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.name, "Boiler 400 litros AISI 304");
    assert.deepEqual(result.value.descriptionLines, [
      "Capacidade: 400 litros",
      "Base",
      "Material: aço inox AISI 304",
    ]);
  });

  it("uses variant absolute price, name, image, and description override", () => {
    const product: CatalogProductInput = {
      ...boiler,
      variants: [
        {
          key: "101|202",
          nameOverride: "Boiler 400 L Inox 316",
          descriptionLinesOverride: ["SKU específico 400/316"],
          unitPriceCents: 123456,
          imageId: 9,
        },
      ],
    };
    const result = resolveCatalogSelection(product, [101, 202]);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.name, "Boiler 400 L Inox 316");
    assert.deepEqual(result.value.descriptionLines, ["SKU específico 400/316"]);
    assert.equal(result.value.unitPriceCents, 123456);
    assert.equal(result.value.imageId, 9);
    assert.equal(result.value.variantKey, "101|202");
  });

  it("rejects unknown combinations when variants exist", () => {
    const product: CatalogProductInput = {
      ...boiler,
      variants: [
        {
          key: "101|201",
          nameOverride: null,
          descriptionLinesOverride: null,
          unitPriceCents: 900000,
          imageId: null,
        },
      ],
    };
    const result = resolveCatalogSelection(product, [101, 202]);
    assert.deepEqual(result, { ok: false, error: "unknown_combination" });
  });

  it("rejects missing, duplicate, or unknown option values", () => {
    assert.deepEqual(resolveCatalogSelection(boiler, [101]), { ok: false, error: "missing_option" });
    assert.deepEqual(resolveCatalogSelection(boiler, [101, 102]), { ok: false, error: "duplicate_option" });
    assert.deepEqual(resolveCatalogSelection(boiler, [101, 999]), { ok: false, error: "unknown_value" });
    assert.deepEqual(resolveCatalogSelection(boiler, []), { ok: false, error: "missing_option" });
  });
});
```

- [ ] **Step 2: Run tests and confirm they fail**

Run: `node --test --experimental-strip-types app/utils/catalog-variation.test.ts`

Expected: FAIL — `Cannot find module './catalog-variation.ts'`

- [ ] **Step 3: Implement the resolver**

```ts
export type CatalogOptionValueInput = {
  id: number;
  optionId: number;
  label: string;
  slug: string;
  descriptionLines: string[];
  sortOrder: number;
};

export type CatalogOptionInput = {
  id: number;
  name: string;
  slug: string;
  sortOrder: number;
  values: CatalogOptionValueInput[];
};

export type CatalogVariantInput = {
  key: string;
  nameOverride: string | null;
  descriptionLinesOverride: string[] | null;
  unitPriceCents: number | null;
  imageId: number | null;
};

export type CatalogProductInput = {
  name: string;
  nameTemplate: string | null;
  descriptionLines: string[];
  defaultUnitPriceCents: number | null;
  imageId: number | null;
  options: CatalogOptionInput[];
  variants: CatalogVariantInput[];
};

export type ResolvedCatalogSelection = {
  name: string;
  descriptionLines: string[];
  unitPriceCents: number | null;
  imageId: number | null;
  variantKey: string | null;
  optionValueIds: number[];
};

export type ResolveCatalogError =
  | "missing_option"
  | "duplicate_option"
  | "unknown_value"
  | "unknown_combination";

export type ResolveCatalogResult =
  | { ok: true; value: ResolvedCatalogSelection }
  | { ok: false; error: ResolveCatalogError };

export function variantKey(optionValueIds: number[]): string {
  return [...optionValueIds].sort((a, b) => a - b).join("|");
}

function uniqueLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

function interpolateName(
  product: CatalogProductInput,
  selected: CatalogOptionValueInput[],
  optionsById: Map<number, CatalogOptionInput>,
): string {
  const template = product.nameTemplate?.trim();
  if (!template) {
    return [product.name, ...selected.map((value) => value.label)].join(" ").replace(/\s+/g, " ").trim();
  }
  const vars: Record<string, string> = { name: product.name };
  for (const value of selected) {
    const option = optionsById.get(value.optionId);
    if (option) vars[option.slug] = value.label;
  }
  return template.replace(/\{([a-z0-9-]+)\}/gi, (_, key: string) => vars[key] ?? "").replace(/\s+/g, " ").trim();
}

export function resolveCatalogSelection(
  product: CatalogProductInput,
  optionValueIds: number[],
): ResolveCatalogResult {
  if (product.options.length === 0) {
    if (optionValueIds.length > 0) return { ok: false, error: "unknown_value" };
    return {
      ok: true,
      value: {
        name: product.name,
        descriptionLines: uniqueLines(product.descriptionLines),
        unitPriceCents: product.defaultUnitPriceCents,
        imageId: product.imageId,
        variantKey: null,
        optionValueIds: [],
      },
    };
  }

  const optionsById = new Map(product.options.map((option) => [option.id, option]));
  const valueById = new Map(
    product.options.flatMap((option) => option.values.map((value) => [value.id, value] as const)),
  );

  const selected: CatalogOptionValueInput[] = [];
  const usedOptionIds = new Set<number>();
  for (const id of optionValueIds) {
    const value = valueById.get(id);
    if (!value) return { ok: false, error: "unknown_value" };
    if (usedOptionIds.has(value.optionId)) return { ok: false, error: "duplicate_option" };
    usedOptionIds.add(value.optionId);
    selected.push(value);
  }

  const sortedOptions = [...product.options].sort((a, b) => a.sortOrder - b.sortOrder);
  for (const option of sortedOptions) {
    if (!usedOptionIds.has(option.id)) return { ok: false, error: "missing_option" };
  }

  const selectedInOrder = sortedOptions.map((option) => {
    const value = selected.find((item) => item.optionId === option.id);
    if (!value) throw new Error("invariant: missing_option already checked");
    return value;
  });

  const key = variantKey(selectedInOrder.map((value) => value.id));
  const variant = product.variants.find((item) => item.key === key) ?? null;
  if (product.variants.length > 0 && !variant) {
    return { ok: false, error: "unknown_combination" };
  }

  const composedLines = uniqueLines([
    ...product.descriptionLines,
    ...selectedInOrder.flatMap((value) => value.descriptionLines),
  ]);

  return {
    ok: true,
    value: {
      name: variant?.nameOverride?.trim() || interpolateName(product, selectedInOrder, optionsById),
      descriptionLines: variant?.descriptionLinesOverride ?? composedLines,
      unitPriceCents: variant?.unitPriceCents ?? product.defaultUnitPriceCents,
      imageId: variant?.imageId ?? product.imageId,
      variantKey: variant ? variant.key : null,
      optionValueIds: selectedInOrder.map((value) => value.id),
    },
  };
}

export function toCatalogProductInput(item: {
  name: string;
  nameTemplate: string | null;
  descriptionLines: unknown;
  defaultUnitPriceCents: number | null;
  imageId: number | null;
  options: Array<{
    id: number;
    name: string;
    slug: string;
    sortOrder: number;
    values: Array<{
      id: number;
      optionId: number;
      label: string;
      slug: string;
      descriptionLines: unknown;
      sortOrder: number;
    }>;
  }>;
  variants: Array<{
    key: string;
    nameOverride: string | null;
    descriptionLinesOverride: unknown;
    unitPriceCents: number | null;
    imageId: number | null;
  }>;
}): CatalogProductInput {
  const asLines = (raw: unknown): string[] =>
    Array.isArray(raw) ? raw.map(String).map((line) => line.trim()).filter(Boolean) : [];
  return {
    name: item.name,
    nameTemplate: item.nameTemplate,
    descriptionLines: asLines(item.descriptionLines),
    defaultUnitPriceCents: item.defaultUnitPriceCents,
    imageId: item.imageId,
    options: item.options.map((option) => ({
      ...option,
      values: option.values.map((value) => ({
        ...value,
        descriptionLines: asLines(value.descriptionLines),
      })),
    })),
    variants: item.variants.map((variant) => ({
      ...variant,
      descriptionLinesOverride: variant.descriptionLinesOverride == null ? null : asLines(variant.descriptionLinesOverride),
    })),
  };
}
```

- [ ] **Step 4: Run tests and confirm they pass**

Run: `node --test --experimental-strip-types app/utils/catalog-variation.test.ts`

Expected: PASS, all tests.

- [ ] **Step 5: Add the npm script**

In `package.json` scripts:

```json
"test": "node --test --experimental-strip-types app/utils/catalog-variation.test.ts"
```

- [ ] **Step 6: Commit**

```bash
git add app/utils/catalog-variation.ts app/utils/catalog-variation.test.ts package.json
git commit -m "$(cat <<'EOF'
feat: add catalog variation resolver

Compose quote name, bullets, and price from product options so boiler sizes and materials stop duplicating catalog rows.
EOF
)"
```

---

### Task 2: Prisma schema and migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260813180000_catalog_variations/migration.sql`

**Interfaces:**
- Consumes: Task 1 types (`variantKey` format `id|id`)
- Produces: models `QuoteCatalogOption`, `QuoteCatalogOptionValue`, `QuoteCatalogVariant`, `QuoteCatalogVariantValue`; fields `QuoteCatalogItem.nameTemplate`, `QuotationLine.catalogOptionValueIds`

- [ ] **Step 1: Extend `Image` and `QuoteCatalogItem`**

In `prisma/schema.prisma`, add `QuoteCatalogVariant QuoteCatalogVariant[]` to `Image`.

On `QuoteCatalogItem`, add:

```prisma
  nameTemplate String? @map("name_template") @db.VarChar(200)
  options      QuoteCatalogOption[]
  variants     QuoteCatalogVariant[]
```

On `QuotationLine`, add:

```prisma
  catalogOptionValueIds Json @default("[]") @map("catalog_option_value_ids")
```

- [ ] **Step 2: Append the new models after `QuoteCatalogItem`**

```prisma
model QuoteCatalogOption {
  id            Int                       @id @default(autoincrement())
  createdAt     DateTime                  @default(now()) @map("created_at")
  catalogItemId Int                       @map("catalog_item_id")
  name          String                    @db.VarChar(100)
  slug          String                    @db.VarChar(50)
  sortOrder     Int                       @default(0) @map("sort_order")
  catalogItem   QuoteCatalogItem          @relation(fields: [catalogItemId], references: [id], onDelete: Cascade)
  values        QuoteCatalogOptionValue[]

  @@unique([catalogItemId, slug])
  @@index([catalogItemId])
  @@map("quote_catalog_options")
}

model QuoteCatalogOptionValue {
  id               Int                         @id @default(autoincrement())
  createdAt        DateTime                    @default(now()) @map("created_at")
  optionId         Int                         @map("option_id")
  label            String                      @db.VarChar(100)
  slug             String                      @db.VarChar(50)
  descriptionLines Json                        @default("[]") @map("description_lines")
  sortOrder        Int                         @default(0) @map("sort_order")
  option           QuoteCatalogOption          @relation(fields: [optionId], references: [id], onDelete: Cascade)
  variantValues    QuoteCatalogVariantValue[]

  @@unique([optionId, slug])
  @@index([optionId])
  @@map("quote_catalog_option_values")
}

model QuoteCatalogVariant {
  id                       Int                        @id @default(autoincrement())
  createdAt                DateTime                   @default(now()) @map("created_at")
  catalogItemId            Int                        @map("catalog_item_id")
  key                      String                     @db.VarChar(200)
  nameOverride             String?                    @map("name_override") @db.VarChar(200)
  descriptionLinesOverride Json?                      @map("description_lines_override")
  unitPriceCents           Int?                       @map("unit_price_cents")
  imageId                  Int?                       @map("image_id")
  catalogItem              QuoteCatalogItem           @relation(fields: [catalogItemId], references: [id], onDelete: Cascade)
  Image                    Image?                     @relation(fields: [imageId], references: [id])
  values                   QuoteCatalogVariantValue[]

  @@unique([catalogItemId, key])
  @@index([catalogItemId])
  @@map("quote_catalog_variants")
}

model QuoteCatalogVariantValue {
  variantId     Int                     @map("variant_id")
  optionValueId Int                     @map("option_value_id")
  variant       QuoteCatalogVariant     @relation(fields: [variantId], references: [id], onDelete: Cascade)
  optionValue   QuoteCatalogOptionValue @relation(fields: [optionValueId], references: [id], onDelete: Cascade)

  @@id([variantId, optionValueId])
  @@index([optionValueId])
  @@map("quote_catalog_variant_values")
}
```

- [ ] **Step 3: Write the migration SQL**

```sql
ALTER TABLE "quote_catalog_items" ADD COLUMN "name_template" VARCHAR(200);

ALTER TABLE "quotation_lines" ADD COLUMN "catalog_option_value_ids" JSONB NOT NULL DEFAULT '[]';

CREATE TABLE "quote_catalog_options" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "catalog_item_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "quote_catalog_options_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quote_catalog_option_values" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "option_id" INTEGER NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "description_lines" JSONB NOT NULL DEFAULT '[]',
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "quote_catalog_option_values_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quote_catalog_variants" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "catalog_item_id" INTEGER NOT NULL,
    "key" VARCHAR(200) NOT NULL,
    "name_override" VARCHAR(200),
    "description_lines_override" JSONB,
    "unit_price_cents" INTEGER,
    "image_id" INTEGER,

    CONSTRAINT "quote_catalog_variants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quote_catalog_variant_values" (
    "variant_id" INTEGER NOT NULL,
    "option_value_id" INTEGER NOT NULL,

    CONSTRAINT "quote_catalog_variant_values_pkey" PRIMARY KEY ("variant_id","option_value_id")
);

CREATE UNIQUE INDEX "quote_catalog_options_catalog_item_id_slug_key" ON "quote_catalog_options"("catalog_item_id", "slug");
CREATE INDEX "quote_catalog_options_catalog_item_id_idx" ON "quote_catalog_options"("catalog_item_id");
CREATE UNIQUE INDEX "quote_catalog_option_values_option_id_slug_key" ON "quote_catalog_option_values"("option_id", "slug");
CREATE INDEX "quote_catalog_option_values_option_id_idx" ON "quote_catalog_option_values"("option_id");
CREATE UNIQUE INDEX "quote_catalog_variants_catalog_item_id_key_key" ON "quote_catalog_variants"("catalog_item_id", "key");
CREATE INDEX "quote_catalog_variants_catalog_item_id_idx" ON "quote_catalog_variants"("catalog_item_id");
CREATE INDEX "quote_catalog_variant_values_option_value_id_idx" ON "quote_catalog_variant_values"("option_value_id");

ALTER TABLE "quote_catalog_options" ADD CONSTRAINT "quote_catalog_options_catalog_item_id_fkey" FOREIGN KEY ("catalog_item_id") REFERENCES "quote_catalog_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quote_catalog_option_values" ADD CONSTRAINT "quote_catalog_option_values_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "quote_catalog_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quote_catalog_variants" ADD CONSTRAINT "quote_catalog_variants_catalog_item_id_fkey" FOREIGN KEY ("catalog_item_id") REFERENCES "quote_catalog_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quote_catalog_variants" ADD CONSTRAINT "quote_catalog_variants_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quote_catalog_variant_values" ADD CONSTRAINT "quote_catalog_variant_values_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "quote_catalog_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quote_catalog_variant_values" ADD CONSTRAINT "quote_catalog_variant_values_option_value_id_fkey" FOREIGN KEY ("option_value_id") REFERENCES "quote_catalog_option_values"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 4: Generate client and apply**

Run: `npx prisma generate && npx prisma migrate deploy`

Expected: client includes the new models; migration applies without data loss (all new columns nullable/defaulted).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260813180000_catalog_variations
git commit -m "$(cat <<'EOF'
feat: add catalog option and variant tables

Parents keep shared copy; values and optional SKUs carry the bits that actually change per boiler size or alloy.
EOF
)"
```

---

### Task 3: Server loaders and mutations

**Files:**
- Modify: `app/models/quotation.server.ts`

**Interfaces:**
- Consumes: Prisma models from Task 2; `variantKey` / `toCatalogProductInput` from Task 1
- Produces: `catalogItemDetailInclude`, `listCatalogItems` with options+variants, `getCatalogItemDetail`, `updateCatalogItem` (nameTemplate), `replaceCatalogOptions`, `replaceCatalogVariants`, `replaceQuotationLines` / `appendQuotationLine` accepting `catalogOptionValueIds: number[]`

- [ ] **Step 1: Shared include and list/get**

Add near the catalog helpers:

```ts
import { variantKey } from "~/utils/catalog-variation";

export const catalogItemDetailInclude = {
  Image: true,
  options: {
    orderBy: { sortOrder: "asc" as const },
    include: { values: { orderBy: { sortOrder: "asc" as const } } },
  },
  variants: {
    include: { Image: true, values: true },
  },
} as const;

export async function listCatalogItems() {
  return prisma.quoteCatalogItem.findMany({
    orderBy: { name: "asc" },
    include: catalogItemDetailInclude,
  });
}

export async function getCatalogItemDetail(id: number) {
  return prisma.quoteCatalogItem.findUnique({
    where: { id },
    include: catalogItemDetailInclude,
  });
}
```

Extend `createCatalogItem` / `updateCatalogItem` with optional `nameTemplate: string | null`.

- [ ] **Step 2: Replace options (full rewrite of one product's axes)**

```ts
export async function replaceCatalogOptions(
  catalogItemId: number,
  options: Array<{
    name: string;
    slug: string;
    sortOrder: number;
    values: Array<{ label: string; slug: string; descriptionLines: string[]; sortOrder: number }>;
  }>,
) {
  return prisma.$transaction(async (tx) => {
    await tx.quoteCatalogOption.deleteMany({ where: { catalogItemId } });
    for (const option of options) {
      await tx.quoteCatalogOption.create({
        data: {
          catalogItemId,
          name: option.name.trim(),
          slug: option.slug,
          sortOrder: option.sortOrder,
          values: {
            create: option.values.map((value) => ({
              label: value.label.trim(),
              slug: value.slug,
              descriptionLines: value.descriptionLines,
              sortOrder: value.sortOrder,
            })),
          },
        },
      });
    }
    return tx.quoteCatalogItem.findUniqueOrThrow({
      where: { id: catalogItemId },
      include: catalogItemDetailInclude,
    });
  });
}
```

Note: deleting options cascades variants. The catalog edit UI must save options first, then re-create variants against the new value ids (Task 4).

- [ ] **Step 3: Replace variants**

```ts
export async function replaceCatalogVariants(
  catalogItemId: number,
  variants: Array<{
    optionValueIds: number[];
    nameOverride?: string | null;
    descriptionLinesOverride?: string[] | null;
    unitPriceCents?: number | null;
    imageId?: number | null;
  }>,
) {
  return prisma.$transaction(async (tx) => {
    await tx.quoteCatalogVariant.deleteMany({ where: { catalogItemId } });
    for (const variant of variants) {
      const key = variantKey(variant.optionValueIds);
      await tx.quoteCatalogVariant.create({
        data: {
          catalogItemId,
          key,
          nameOverride: variant.nameOverride?.trim() || null,
          descriptionLinesOverride: variant.descriptionLinesOverride ?? null,
          unitPriceCents: variant.unitPriceCents ?? null,
          imageId: variant.imageId ?? null,
          values: {
            create: variant.optionValueIds.map((optionValueId) => ({ optionValueId })),
          },
        },
      });
    }
    return tx.quoteCatalogItem.findUniqueOrThrow({
      where: { id: catalogItemId },
      include: catalogItemDetailInclude,
    });
  });
}
```

- [ ] **Step 4: Persist selection ids on quotation lines**

Add `catalogOptionValueIds?: number[]` to `replaceQuotationLines` and `appendQuotationLine` create payloads, default `[]`.

- [ ] **Step 5: Typecheck**

Run: `yarn typecheck`

Expected: PASS (call sites still compile; extra include fields are additive).

- [ ] **Step 6: Commit**

```bash
git add app/models/quotation.server.ts
git commit -m "$(cat <<'EOF'
feat: persist catalog options and quote selections

Admin can rewrite a product's axes; quote lines keep the chosen value ids next to the snapshot copy.
EOF
)"
```

---

### Task 4: Catalog admin edit UI

**Files:**
- Create: `app/routes/admin.catalog.$id.tsx`
- Modify: `app/routes/admin.catalog.tsx`

**Interfaces:**
- Consumes: `getCatalogItemDetail`, `updateCatalogItem`, `replaceCatalogOptions`, `replaceCatalogVariants`, `slugifyCatalog`
- Produces: `/admin/catalog/:id` editor; list rows link there and show “N variações” when `options.length > 0`

- [ ] **Step 1: List page — link + badge**

On each `<li>` in `admin.catalog.tsx`, wrap the name in `<Link to={`/admin/catalog/${item.id}`}>` and under the name render:

```tsx
{item.options.length > 0 ? (
  <p className="text-xs text-muted-foreground">
    {item.options.map((option) => option.name).join(" · ")}
  </p>
) : null}
```

- [ ] **Step 2: Edit route loader/action**

`admin.catalog.$id.tsx`:

- Loader: `requireAdmin` + `getCatalogItemDetail(id)` or 404.
- Action intents:
  - `save-product`: name, description lines, price, `nameTemplate`.
  - `save-options`: parse `optionCount`, each `option.{i}.name` / `.slug` (slugify from name if blank) / values as newline `label | bullet1 || bullet2` **or** simpler: one value row per `option.{i}.value.{j}.label` + `.description` textarea.
  - `save-variants`: optional. Each row is a selected value id per option + price + optional name override. Skip this form if the product has no options.

Keep the value editor explicit (label + description textarea per value). Do not invent a DSL.

After `save-options`, do **not** auto-rebuild variants (ids changed). Show a notice: “Combinações com preço foram limpas. Recadastre se necessário.” because `replaceCatalogOptions` deletes variants via cascade.

- [ ] **Step 3: Editor layout**

Sections, in order:

1. Produto — name, price, nameTemplate (`{name} {capacidade} {material}`), base description textarea.
2. Variações — add/remove option axes; each axis has name + list of values (label + description lines). Empty options = simple product.
3. Combinações (only if options exist) — table of explicit SKUs. Empty table = every combination is valid at quote time.
4. Imagem — reuse the existing upload pattern from the list page if the product already has an image; otherwise leave list-page upload as the image entry point for v1.

Portuguese labels:

- “Modelo do nome” helper: `Use {name} e o slug da opção, ex. {capacidade}.`
- “Descrição da variação” helper: `Uma linha por bullet. Entra na descrição do orçamento quando esta opção é escolhida.`

- [ ] **Step 4: Manual check**

1. Create a simple product on `/admin/catalog` — still works.
2. Open it, add Capacidade (400 / 600) and Material (304 / 316) with distinct bullets, save.
3. Reload: options persist; list shows the two axis names.

- [ ] **Step 5: Commit**

```bash
git add app/routes/admin.catalog.tsx app/routes/admin.catalog.$id.tsx
git commit -m "$(cat <<'EOF'
feat: edit catalog product options in admin

One boiler record can own capacity and material axes, each contributing its own quote bullets.
EOF
)"
```

---

### Task 5: Quote builder picker

**Files:**
- Create: `app/components/admin/CatalogVariationPicker.tsx`
- Modify: `app/routes/admin.quotations.$id.tsx`

**Interfaces:**
- Consumes: `resolveCatalogSelection`, `toCatalogProductInput` from Task 1; catalog payload from `listCatalogItems`
- Produces: adding a configurable product requires one value per option; line snapshot includes composed name/description/price/image and `catalogOptionValueIds`

- [ ] **Step 1: Picker component**

```tsx
import { useMemo, useState } from "react";
import { Label } from "~/components/ui/label";
import {
  resolveCatalogSelection,
  toCatalogProductInput,
  type ResolvedCatalogSelection,
} from "~/utils/catalog-variation";

type CatalogItem = Parameters<typeof toCatalogProductInput>[0] & { id: number };

const ERROR_COPY: Record<string, string> = {
  missing_option: "Selecione uma opção em cada variação.",
  duplicate_option: "Cada variação aceita só um valor.",
  unknown_value: "Opção inválida.",
  unknown_combination: "Essa combinação não está disponível.",
};

export function CatalogVariationPicker({
  item,
  onResolved,
}: {
  item: CatalogItem;
  onResolved: (resolved: ResolvedCatalogSelection) => void;
}) {
  const product = useMemo(() => toCatalogProductInput(item), [item]);
  const [selected, setSelected] = useState<Record<number, number>>({});

  const optionValueIds = product.options
    .map((option) => selected[option.id])
    .filter((id): id is number => Number.isFinite(id));

  const result = resolveCatalogSelection(product, optionValueIds);
  const canAdd = result.ok && optionValueIds.length === product.options.length;

  return (
    <div className="space-y-3 border border-border p-3">
      {product.options.map((option) => (
        <div key={option.id}>
          <Label htmlFor={`opt-${option.id}`}>{option.name}</Label>
          <select
            id={`opt-${option.id}`}
            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={selected[option.id] ?? ""}
            onChange={(e) =>
              setSelected((prev) => ({ ...prev, [option.id]: Number(e.target.value) }))
            }
          >
            <option value="" disabled>
              Selecionar…
            </option>
            {option.values.map((value) => (
              <option key={value.id} value={value.id}>
                {value.label}
              </option>
            ))}
          </select>
        </div>
      ))}
      {result.ok ? (
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{result.value.name}</p>
          <ul className="mt-1 list-disc pl-5">
            {result.value.descriptionLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : optionValueIds.length > 0 ? (
        <p className="text-sm text-destructive">{ERROR_COPY[result.error]}</p>
      ) : null}
      <button
        type="button"
        className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm text-primary-foreground disabled:opacity-50"
        disabled={!canAdd}
        onClick={() => {
          if (result.ok) onResolved(result.value);
        }}
      >
        Adicionar
      </button>
    </div>
  );
}
```

Use the existing `Button` component instead of a raw `<button>` if class names differ; match `admin.quotations.$id.tsx` styling.

- [ ] **Step 2: Wire into the quote builder**

In `addFromCatalog`:

- If `item.options.length === 0`, keep current behavior (copy name/description/price/image, `catalogOptionValueIds: []`).
- If options exist, do **not** add immediately. Set `pendingCatalogId` state and render `CatalogVariationPicker`. On resolve, push the draft line with composed fields and `catalogOptionValueIds: resolved.optionValueIds`, then clear pending.

Extend `DraftLine` and `parseLinesFromForm` / hidden inputs:

```ts
catalogOptionValueIds: number[];
```

Hidden field: `line.${i}.optionValueIds` as comma-separated ids. Parse with `split("|")` or `split(",")` → numbers. Persist through `replaceQuotationLines`.

- [ ] **Step 3: Manual check**

1. Add a simple catalog item to a quote — unchanged.
2. Add the boiler: pickers appear; preview updates; Adicionar disabled until both axes chosen.
3. Save, reload, print: line shows composed name + bullets, not the parent name alone.
4. Change the catalog product description later: already-saved quote line does **not** change.

- [ ] **Step 4: Typecheck + tests**

Run:

```
yarn test
yarn typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/components/admin/CatalogVariationPicker.tsx app/routes/admin.quotations.$id.tsx
git commit -m "$(cat <<'EOF'
feat: pick catalog variations when adding quote lines

Quote lines snapshot the composed boiler copy so later catalog edits cannot rewrite issued quotes.
EOF
)"
```

---

## Out of scope (do not do in this plan)

- Marketing site product pages.
- Auto-grouping existing “Boiler 400L 304” rows from Canva JSON.
- Shared global option library (AISI 304 reused across products).
- Additive price deltas.
- Re-resolving descriptions on print.
- Parser / seed format changes.

After this ships, grouping today’s duplicates is a **manual** admin task: create one parent, copy shared bullets onto it, move size/alloy bullets onto values, then hide or delete the old flat rows. A merge wizard can be a follow-up plan if the leftover list is painful.

---

## Self-review

1. **Spec coverage:** one parent product, option axes, value-dependent description, quote snapshot, simple products unchanged, no marketing-site change — Tasks 1–5.
2. **Placeholders:** none; resolver, schema, SQL, and picker are specified.
3. **Type consistency:** `variantKey` is `id|id`; `resolveCatalogSelection` result uses `optionValueIds` (sorted by option order); Prisma `key` stores that string; quotation line stores the same ids as JSON.
