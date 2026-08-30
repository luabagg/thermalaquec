# Quotation Catalog Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace duplicate flat quotation catalog rows with agent-normalized product families, selectable attributes, optional concrete variants, editable quotation snapshots, complete Catalog management, and a guarded removal of the unused legacy product domain.

**Architecture:** Keep the canonical catalog relational (`QuoteCatalogItem` → options → values → optional variants) and use JSON only for immutable quotation and normalization snapshots. A local agent produces a versioned proposal bound to a source digest; deterministic validators and transactional apply/revert services protect the database. Catalog routes provide correction and lifecycle controls, while quotation selection is resolved on the server and copied into editable historical line fields.

**Tech Stack:** Remix 2, React 18, Prisma 6, PostgreSQL, TypeScript 5, Vitest, Node 24, `tsx` as a development-only CLI runner.

**Spec:** `docs/superpowers/specs/2026-08-29-quotation-catalog-normalization-design.md`

## Global Constraints

- `QuoteCatalogItem` is the only database-backed quotation product domain; static marketing products remain separate.
- No runtime LLM call, background agent, or fuzzy merge is added to application requests.
- Canonical options, values, and variants are relational; JSON is limited to snapshots and description arrays.
- Option placement is configured once per axis as `TITLE` or `DESCRIPTION`.
- Existing quotation name, description, price, and image fields remain the authoritative printable snapshot and stay editable.
- Never re-resolve an existing quotation line after Catalog changes.
- Initial quotation loader payload stays compact; configurable family details load lazily.
- Agent proposals are ignored local artifacts, schema-versioned, source-digest-bound, and deterministically validated before apply.
- Normalization apply/revert and Catalog aggregate writes are transactional and idempotent where specified.
- Ambiguous normalization reverts are blocked; there is no forced unsafe revert.
- Preserve unrelated `.tool-versions` and `app/styles/quotation-document.css` changes in the working tree.
- Do not execute or extend the superseded `docs/superpowers/plans/2026-08-13-catalog-product-variations.md`.

## File Map

| File | Responsibility |
|---|---|
| `app/utils/catalog-resolver.ts` | Pure option selection validation and draft-line composition. |
| `app/utils/catalog-resolver.test.ts` | Resolver composition, errors, availability, and override tests. |
| `app/utils/catalog-normalization-contract.ts` | Proposal types, canonicalization, source digest, and deterministic semantic validation. |
| `app/utils/catalog-normalization-contract.test.ts` | Proposal coverage, uniqueness, digest, combination, and disposition tests. |
| `app/models/catalog.server.ts` | Compact list, lazy detail, transactional aggregate CRUD, lifecycle, and concurrency. |
| `app/models/catalog.server.test.ts` | Catalog model query and mutation tests. |
| `app/models/catalog-normalization.server.ts` | Export, validate, apply, eligibility, revert, and future exact-alias import resolution. |
| `app/models/catalog-normalization.server.test.ts` | Transaction, idempotency, remapping, rollback, and import tests. |
| `app/routes/admin.catalog.tsx` | Searchable active/archived Catalog list, create, archive, and restore. |
| `app/routes/admin.catalog.test.tsx` | Catalog list/action route tests. |
| `app/routes/admin.catalog.$id.tsx` | Aggregate family editor, variants, aliases, provenance, preview, and conflicts. |
| `app/routes/admin.catalog.$id.test.tsx` | Editor validation, authorization, stale edit, and destructive-change tests. |
| `app/routes/admin.catalog.normalization.$runId.tsx` | Normalization run detail, eligibility, and safe revert action. |
| `app/routes/admin.catalog.$id_.resolve.ts` | Authenticated lazy family detail and server resolution of one simple/configurable selection. |
| `app/utils/catalog-selection-token.server.ts` | Sign and verify trusted seven-day catalog selection snapshots. |
| `app/components/admin/CatalogVariationPicker.tsx` | Lazy option picker and generated draft preview. |
| `app/components/admin/CatalogVariationPicker.test.tsx` | Picker completeness, invalid combination, and preview tests. |
| `app/routes/admin.quotations.$id.tsx` | Compact catalog summaries, resolved-line insertion, and snapshot form persistence. |
| `app/components/admin/QuotationEditorRows.tsx` | Hidden selection snapshot field alongside editable line inputs. |
| `app/models/quotation.server.ts` | Quotation selection snapshot read/write and compact catalog summary seam. |
| `app/models/quotation.server.test.ts` | Snapshot persistence and compact-loader tests. |
| `scripts/catalog-normalization/export.ts` | Export source rows to the ignored workspace. |
| `scripts/catalog-normalization/validate.ts` | Validate proposal schema/digest/semantics. |
| `scripts/catalog-normalization/apply.ts` | Apply one validated proposal by digest. |
| `scripts/catalog-normalization/revert.ts` | Check and perform one safe run revert. |
| `scripts/legacy-products/preflight.ts` | Count legacy rows and require explicit destructive acknowledgement. |
| `scripts/legacy-products/preflight.test.ts` | Empty/non-empty/acknowledged preflight tests. |
| `data/catalog-normalization/.gitkeep` | Documents the ignored local normalization workspace. |
| `.gitignore` | Ignore source, proposal, result, and operator-audit artifacts. |
| `.env-example` | Document the catalog selection signing secret. |
| `prisma/schema.prisma` | Normalized catalog schema and final legacy model removal. |
| `prisma/migrations/20260829170000_normalized_quote_catalog/migration.sql` | Additive catalog schema and line snapshot migration. |
| `prisma/migrations/20260829190000_remove_legacy_products/migration.sql` | Guarded legacy table removal. |
| `prisma/seed.js` | Exact alias-aware seed/import behavior. |
| `app/models/product.server.ts` | Delete after guarded legacy removal. |
| `app/libs/supabase/database.types.ts` | Regenerate after database schema changes. |
| `docs/catalog-normalization.md` | Operator export, agent, validate, apply, correction, and recovery runbook. |
| `package.json` / `yarn.lock` | CLI scripts and development-only `tsx` dependency. |

---

### Task 1: Pure Catalog Selection Resolver

**Files:**
- Create: `app/utils/catalog-resolver.ts`
- Create: `app/utils/catalog-resolver.test.ts`

**Interfaces:**
- Consumes: Plain serializable catalog family data; no Prisma types.
- Produces: `resolveCatalogSelection(family, selectedValueIds): CatalogResolutionResult`, `catalogVariantKey(valueIds): string`, and snapshot/draft types used by server and UI tasks.

- [ ] **Step 1: Write failing composition and validation tests**

```ts
import { describe, expect, it } from "vitest";
import {
  catalogVariantKey,
  resolveCatalogSelection,
  type CatalogFamilyInput,
} from "./catalog-resolver";

const boiler: CatalogFamilyInput = {
  id: 10,
  slug: "boiler",
  name: "Boiler",
  nameTemplate: "{name} {capacity} {material}",
  descriptionLines: ["Isolamento térmico", "Capacidade: 400 litros"],
  defaultUnitPriceCents: 800_000,
  imageId: 7,
  options: [
    {
      id: 1,
      name: "Capacity",
      slug: "capacity",
      placement: "TITLE",
      sortOrder: 0,
      values: [
        { id: 11, label: "400 L", slug: "400-l", titleFragment: null, descriptionLines: [], sortOrder: 0 },
      ],
    },
    {
      id: 2,
      name: "Material",
      slug: "material",
      placement: "TITLE",
      sortOrder: 1,
      values: [
        { id: 21, label: "AISI 316", slug: "aisi-316", titleFragment: "Inox 316", descriptionLines: [], sortOrder: 0 },
      ],
    },
    {
      id: 3,
      name: "Voltage",
      slug: "voltage",
      placement: "DESCRIPTION",
      sortOrder: 2,
      values: [
        { id: 31, label: "220 V", slug: "220-v", titleFragment: null, descriptionLines: [], sortOrder: 0 },
      ],
    },
  ],
  variants: [],
};

describe("resolveCatalogSelection", () => {
  it("composes title axes, description axes, and a readable snapshot", () => {
    const result = resolveCatalogSelection(boiler, [11, 21, 31]);
    expect(result).toEqual({
      ok: true,
      value: {
        name: "Boiler 400 L Inox 316",
        descriptionLines: ["Isolamento térmico", "Capacidade: 400 litros", "Voltage: 220 V"],
        unitPriceCents: 800_000,
        imageId: 7,
        variantId: null,
        selectionSnapshot: [
          { optionSlug: "capacity", optionLabel: "Capacity", valueSlug: "400-l", valueLabel: "400 L" },
          { optionSlug: "material", optionLabel: "Material", valueSlug: "aisi-316", valueLabel: "AISI 316" },
          { optionSlug: "voltage", optionLabel: "Voltage", valueSlug: "220-v", valueLabel: "220 V" },
        ],
      },
    });
  });

  it("rejects incomplete, duplicate-axis, unknown, and unavailable selections", () => {
    expect(resolveCatalogSelection(boiler, [11, 21])).toEqual({ ok: false, error: "missing_option" });
    expect(resolveCatalogSelection(boiler, [11, 11, 21, 31])).toEqual({ ok: false, error: "duplicate_option" });
    expect(resolveCatalogSelection(boiler, [11, 21, 999])).toEqual({ ok: false, error: "unknown_value" });
  });

  it("creates stable keys independent of submitted order", () => {
    expect(catalogVariantKey([31, 11, 21])).toBe("11|21|31");
  });
});
```

Add focused cases for explicit variants, inactive combinations, absolute variant overrides, malformed templates, title fragments, explicit description lines, and normalized duplicate bullet removal.

- [ ] **Step 2: Run the resolver tests and confirm failure**

Run: `yarn test app/utils/catalog-resolver.test.ts`

Expected: FAIL because `catalog-resolver.ts` does not exist.

- [ ] **Step 3: Implement the serializable resolver contract**

```ts
export type CatalogOptionPlacement = "TITLE" | "DESCRIPTION";

export type CatalogSelectionSnapshotEntry = {
  optionSlug: string;
  optionLabel: string;
  valueSlug: string;
  valueLabel: string;
};

export type CatalogOptionValueInput = {
  id: number;
  label: string;
  slug: string;
  titleFragment: string | null;
  descriptionLines: string[];
  sortOrder: number;
};

export type CatalogOptionInput = {
  id: number;
  name: string;
  slug: string;
  placement: CatalogOptionPlacement;
  sortOrder: number;
  values: CatalogOptionValueInput[];
};

export type CatalogVariantInput = {
  id: number;
  key: string;
  active: boolean;
  valueIds: number[];
  nameOverride: string | null;
  descriptionLinesOverride: string[] | null;
  unitPriceCents: number | null;
  imageId: number | null;
};

export type CatalogFamilyInput = {
  id: number;
  slug: string;
  name: string;
  nameTemplate: string | null;
  descriptionLines: string[];
  defaultUnitPriceCents: number | null;
  imageId: number | null;
  options: CatalogOptionInput[];
  variants: CatalogVariantInput[];
};

export type CatalogResolvedDraft = {
  name: string;
  descriptionLines: string[];
  unitPriceCents: number | null;
  imageId: number | null;
  variantId: number | null;
  selectionSnapshot: CatalogSelectionSnapshotEntry[];
};

export type CatalogResolutionError =
  | "missing_option"
  | "duplicate_option"
  | "unknown_value"
  | "unknown_combination"
  | "invalid_template";

export type CatalogResolutionResult =
  | { ok: true; value: CatalogResolvedDraft }
  | { ok: false; error: CatalogResolutionError };

export function catalogVariantKey(valueIds: number[]) {
  return [...valueIds].sort((a, b) => a - b).join("|");
}
```

Implement `resolveCatalogSelection` with ordered options, one selected value per axis, explicit-variant allowlisting, parent fallback, override replacement, `{name}` plus option-slug template expansion, and normalized exact bullet deduplication.

- [ ] **Step 4: Run resolver tests and typecheck**

Run: `yarn test app/utils/catalog-resolver.test.ts && yarn typecheck`

Expected: PASS.

- [ ] **Step 5: Commit the resolver**

```bash
git add app/utils/catalog-resolver.ts app/utils/catalog-resolver.test.ts
git commit -m "feat(catalog): resolve product selections"
```

---

### Task 2: Agent Proposal Contract and Deterministic Validation

**Files:**
- Create: `app/utils/catalog-normalization-contract.ts`
- Create: `app/utils/catalog-normalization-contract.test.ts`

**Interfaces:**
- Consumes: `CatalogNormalizationSourceSnapshot` and agent-produced `CatalogNormalizationProposal`.
- Produces: `digestCatalogSource`, `normalizeCatalogAlias`, `validateCatalogProposal`, version constant `CATALOG_NORMALIZATION_SCHEMA_VERSION = 1`, and structured validation errors.

- [ ] **Step 1: Write failing proposal validation tests**

```ts
import { describe, expect, it } from "vitest";
import {
  CATALOG_NORMALIZATION_SCHEMA_VERSION,
  digestCatalogSource,
  validateCatalogProposal,
  type CatalogNormalizationProposal,
  type CatalogNormalizationSourceSnapshot,
} from "./catalog-normalization-contract";

const source: CatalogNormalizationSourceSnapshot = {
  schemaVersion: 1,
  exportedAt: "2026-08-29T00:00:00.000Z",
  items: [
    { id: 1, slug: "boiler-400", name: "Boiler 400L", descriptionLines: [], defaultUnitPriceCents: 100, imageId: null },
    { id: 2, slug: "boiler-600", name: "Boiler 600 L", descriptionLines: [], defaultUnitPriceCents: 200, imageId: null },
  ],
};

function proposal(): CatalogNormalizationProposal {
  return {
    schemaVersion: CATALOG_NORMALIZATION_SCHEMA_VERSION,
    sourceSnapshotDigest: digestCatalogSource(source),
    algorithmVersion: "agent-v1",
    families: [
      {
        clientKey: "boiler",
        slug: "boiler",
        name: "Boiler",
        nameTemplate: "{name} {capacity}",
        descriptionLines: [],
        parentPriceSourceId: 1,
        parentImageSourceId: 1,
        options: [{ clientKey: "capacity", name: "Capacidade", slug: "capacity", placement: "TITLE", values: [
          { clientKey: "400-l", label: "400 L", slug: "400-l", titleFragment: null, descriptionLines: [] },
          { clientKey: "600-l", label: "600 L", slug: "600-l", titleFragment: null, descriptionLines: [] },
        ] }],
        variants: [
          { clientKey: "400", valueClientKeys: ["capacity:400-l"], sourceIds: [1], unitPriceCents: 100, imageSourceId: null },
          { clientKey: "600", valueClientKeys: ["capacity:600-l"], sourceIds: [2], unitPriceCents: 200, imageSourceId: null },
        ],
        sources: [
          { sourceId: 1, alias: "Boiler 400L", selectedValueClientKeys: ["capacity:400-l"], priceDisposition: "PARENT_SOURCE", imageDisposition: "PARENT_SOURCE" },
          { sourceId: 2, alias: "Boiler 600 L", selectedValueClientKeys: ["capacity:600-l"], priceDisposition: "VARIANT", imageDisposition: "USE_PARENT_FALLBACK" },
        ],
      },
    ],
  };
}

describe("validateCatalogProposal", () => {
  it("accepts complete digest-bound source coverage", () => {
    expect(validateCatalogProposal(source, proposal())).toEqual({ ok: true });
  });

  it("rejects stale digest, duplicate/missing sources, and undeclared price differences", () => {
    const stale = proposal();
    stale.sourceSnapshotDigest = "stale";
    expect(validateCatalogProposal(source, stale)).toMatchObject({ ok: false, errors: [{ code: "stale_source_digest" }] });

    const missing = proposal();
    missing.families[0].sources = [missing.families[0].sources[0]];
    expect(validateCatalogProposal(source, missing)).toMatchObject({ ok: false, errors: expect.arrayContaining([{ code: "missing_source", path: "source:2" }]) });
  });
});
```

Add tests for unique family/option/value/alias/SKU keys, cross-family value references, exactly one value per axis, non-negative prices, template placeholders, parent source membership, image disposition, and unknown source IDs.

- [ ] **Step 2: Run contract tests and confirm failure**

Run: `yarn test app/utils/catalog-normalization-contract.test.ts`

Expected: FAIL because the contract module does not exist.

- [ ] **Step 3: Implement the contract and stable digest**

```ts
import { createHash } from "node:crypto";

export const CATALOG_NORMALIZATION_SCHEMA_VERSION = 1 as const;
export type SourceDisposition = "PARENT_SOURCE" | "VARIANT" | "USE_PARENT_FALLBACK";
export type CatalogProposalError = { code: string; path: string; message: string };

export function normalizeCatalogAlias(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(litros?|lts?)\b/g, "l")
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function digestCatalogSource(source: CatalogNormalizationSourceSnapshot) {
  const stable = JSON.stringify({ schemaVersion: source.schemaVersion, items: [...source.items].sort((a, b) => a.id - b.id) });
  return createHash("sha256").update(stable).digest("hex");
}

export function validateCatalogProposal(
  source: CatalogNormalizationSourceSnapshot,
  proposal: CatalogNormalizationProposal,
): { ok: true } | { ok: false; errors: CatalogProposalError[] } {
  const errors: CatalogProposalError[] = [];
  // Accumulate every deterministic structural and semantic violation.
  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}
```

Define every proposal/source type in this module rather than importing Prisma-generated types. Keep validation pure so scripts, routes, and tests share it.

- [ ] **Step 4: Run contract and resolver tests**

Run: `yarn test app/utils/catalog-normalization-contract.test.ts app/utils/catalog-resolver.test.ts && yarn typecheck`

Expected: PASS.

- [ ] **Step 5: Commit the contract**

```bash
git add app/utils/catalog-normalization-contract.ts app/utils/catalog-normalization-contract.test.ts
git commit -m "feat(catalog): validate normalization proposals"
```

---

### Task 3: Additive Normalized Catalog Schema

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260829170000_normalized_quote_catalog/migration.sql`
- Modify: `app/libs/supabase/database.types.ts`

**Interfaces:**
- Consumes: Placement, variant, snapshot, run, and source-map contracts from Tasks 1–2.
- Produces: Prisma models `QuoteCatalogOption`, `QuoteCatalogOptionValue`, `QuoteCatalogVariant`, `QuoteCatalogVariantValue`, `QuoteCatalogAlias`, `CatalogNormalizationRun`, and `CatalogNormalizationSourceMap`.

- [ ] **Step 1: Add the Prisma schema models and constraints**

```prisma
enum CatalogOptionPlacement {
  TITLE
  DESCRIPTION
}

enum CatalogNormalizationStatus {
  VALIDATED
  APPLYING
  APPLIED
  REVERTING
  REVERTED
  FAILED
}

enum CatalogSourceDisposition {
  PARENT_SOURCE
  VARIANT
  USE_PARENT_FALLBACK
}

model QuoteCatalogItem {
  id                    Int                             @id @default(autoincrement())
  createdAt             DateTime                        @default(now()) @map("created_at")
  updatedAt             DateTime                        @updatedAt @map("updated_at")
  archivedAt            DateTime?                       @map("archived_at")
  slug                  String                          @unique @db.VarChar(100)
  name                  String                          @db.VarChar(200)
  nameTemplate          String?                         @map("name_template") @db.VarChar(300)
  descriptionLines      Json                            @default("[]") @map("description_lines")
  defaultUnitPriceCents Int?                            @map("default_unit_price_cents")
  imageId               Int?                            @map("image_id")
  Image                 Image?                          @relation(fields: [imageId], references: [id])
  QuotationLine         QuotationLine[]
  options               QuoteCatalogOption[]
  variants              QuoteCatalogVariant[]
  aliases               QuoteCatalogAlias[]
  sourceMaps            CatalogNormalizationSourceMap[] @relation("NormalizationSource")
  canonicalMaps         CatalogNormalizationSourceMap[] @relation("NormalizationCanonical")

  @@index([archivedAt, name])
  @@map("quote_catalog_items")
}

model QuoteCatalogOption {
  id            Int                       @id @default(autoincrement())
  catalogItemId Int                       @map("catalog_item_id")
  name          String                    @db.VarChar(100)
  slug          String                    @db.VarChar(80)
  placement     CatalogOptionPlacement
  sortOrder     Int                       @default(0) @map("sort_order")
  catalogItem   QuoteCatalogItem          @relation(fields: [catalogItemId], references: [id], onDelete: Cascade)
  values        QuoteCatalogOptionValue[]

  @@unique([catalogItemId, slug])
  @@index([catalogItemId, sortOrder])
  @@map("quote_catalog_options")
}

model QuoteCatalogOptionValue {
  id               Int                        @id @default(autoincrement())
  optionId         Int                        @map("option_id")
  label            String                     @db.VarChar(100)
  slug             String                     @db.VarChar(80)
  titleFragment    String?                    @map("title_fragment") @db.VarChar(150)
  descriptionLines Json                       @default("[]") @map("description_lines")
  sortOrder        Int                        @default(0) @map("sort_order")
  option           QuoteCatalogOption         @relation(fields: [optionId], references: [id], onDelete: Cascade)
  variantValues    QuoteCatalogVariantValue[]

  @@unique([optionId, slug])
  @@index([optionId, sortOrder])
  @@map("quote_catalog_option_values")
}

model QuoteCatalogVariant {
  id                       Int                        @id @default(autoincrement())
  catalogItemId            Int                        @map("catalog_item_id")
  key                      String                     @db.VarChar(300)
  sku                      String?                    @unique @db.VarChar(100)
  active                   Boolean                    @default(true)
  nameOverride             String?                    @map("name_override") @db.VarChar(300)
  descriptionLinesOverride Json?                      @map("description_lines_override")
  unitPriceCents           Int?                       @map("unit_price_cents")
  imageId                  Int?                       @map("image_id")
  catalogItem              QuoteCatalogItem           @relation(fields: [catalogItemId], references: [id], onDelete: Cascade)
  Image                    Image?                     @relation(fields: [imageId], references: [id])
  values                   QuoteCatalogVariantValue[]

  @@unique([catalogItemId, key])
  @@index([catalogItemId, active])
  @@map("quote_catalog_variants")
}

model QuoteCatalogVariantValue {
  variantId     Int                     @map("variant_id")
  optionValueId Int                     @map("option_value_id")
  variant       QuoteCatalogVariant     @relation(fields: [variantId], references: [id], onDelete: Cascade)
  optionValue   QuoteCatalogOptionValue @relation(fields: [optionValueId], references: [id], onDelete: Restrict)

  @@id([variantId, optionValueId])
  @@index([optionValueId])
  @@map("quote_catalog_variant_values")
}
```

Add the provenance models exactly:

```prisma
model QuoteCatalogAlias {
  id             Int              @id @default(autoincrement())
  catalogItemId  Int              @map("catalog_item_id")
  originalName   String           @map("original_name") @db.VarChar(300)
  normalizedKey  String           @unique @map("normalized_key") @db.VarChar(300)
  sourceSlug     String?          @map("source_slug") @db.VarChar(100)
  sourceMetadata Json?            @map("source_metadata")
  catalogItem    QuoteCatalogItem @relation(fields: [catalogItemId], references: [id], onDelete: Restrict)

  @@index([catalogItemId])
  @@map("quote_catalog_aliases")
}

model CatalogNormalizationRun {
  id                   Int                             @id @default(autoincrement())
  status               CatalogNormalizationStatus     @default(VALIDATED)
  schemaVersion        Int                             @map("schema_version")
  algorithmVersion     String                          @map("algorithm_version") @db.VarChar(100)
  sourceSnapshotDigest String                          @map("source_snapshot_digest") @db.VarChar(64)
  sourceSnapshot       Json                            @map("source_snapshot")
  proposal             Json
  result               Json?
  createdAt            DateTime                        @default(now()) @map("created_at")
  updatedAt            DateTime                        @updatedAt @map("updated_at")
  appliedAt            DateTime?                       @map("applied_at")
  revertedAt           DateTime?                       @map("reverted_at")
  sourceMaps           CatalogNormalizationSourceMap[]

  @@unique([sourceSnapshotDigest, algorithmVersion])
  @@map("catalog_normalization_runs")
}

model CatalogNormalizationSourceMap {
  id                       Int                      @id @default(autoincrement())
  runId                    Int                      @map("run_id")
  sourceCatalogItemId      Int                      @map("source_catalog_item_id")
  canonicalCatalogItemId   Int                      @map("canonical_catalog_item_id")
  sourceStateSnapshot      Json                     @map("source_state_snapshot")
  selectedValuesSnapshot   Json                     @map("selected_values_snapshot")
  originalQuotationLineIds Json                     @map("original_quotation_line_ids")
  priceDisposition         CatalogSourceDisposition @map("price_disposition")
  imageDisposition         CatalogSourceDisposition @map("image_disposition")
  canonicalUpdatedAt       DateTime                 @map("canonical_updated_at")
  createdAt                DateTime                 @default(now()) @map("created_at")
  run                      CatalogNormalizationRun  @relation(fields: [runId], references: [id], onDelete: Restrict)
  sourceCatalogItem        QuoteCatalogItem         @relation("NormalizationSource", fields: [sourceCatalogItemId], references: [id], onDelete: Restrict)
  canonicalCatalogItem     QuoteCatalogItem         @relation("NormalizationCanonical", fields: [canonicalCatalogItemId], references: [id], onDelete: Restrict)

  @@unique([runId, sourceCatalogItemId])
  @@index([canonicalCatalogItemId])
  @@map("catalog_normalization_source_maps")
}
```

Add `QuotationLine.catalogSelectionSnapshot Json @default("[]")`, `Image.QuoteCatalogVariant QuoteCatalogVariant[]`, and the corresponding relations shown on `QuoteCatalogItem`.

- [ ] **Step 2: Write the additive SQL migration**

Mirror Prisma names exactly. Add check constraints in SQL:

```sql
ALTER TABLE "quote_catalog_items"
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "archived_at" TIMESTAMP(3),
  ADD COLUMN "name_template" VARCHAR(300);

ALTER TABLE "quotation_lines"
  ADD COLUMN "catalog_selection_snapshot" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "quote_catalog_variants"
  ADD CONSTRAINT "quote_catalog_variants_price_nonnegative"
  CHECK ("unit_price_cents" IS NULL OR "unit_price_cents" >= 0);
```

Create all indexes and foreign keys explicitly. This migration is additive and must not drop or rewrite existing flat rows.

- [ ] **Step 3: Generate Prisma Client and inspect migration compatibility**

Run: `npx prisma format && npx prisma validate && npx prisma generate`

Expected: all commands exit 0.

- [ ] **Step 4: Regenerate Supabase types and run static checks**

Run: `yarn supabaseTypes && yarn typecheck && yarn test`

Expected: PASS. If the configured Supabase project is unavailable, record the command failure and generate types from an isolated migrated database before proceeding; do not hand-edit generated relation definitions.

- [ ] **Step 5: Commit the additive schema**

```bash
git add prisma/schema.prisma prisma/migrations/20260829170000_normalized_quote_catalog/migration.sql app/libs/supabase/database.types.ts
git commit -m "feat(catalog): add normalized catalog schema"
```

---

### Task 4: Transactional Catalog Aggregate Model

**Files:**
- Create: `app/models/catalog.server.ts`
- Create: `app/models/catalog.server.test.ts`
- Modify: `app/models/quotation.server.ts`

**Interfaces:**
- Consumes: Prisma models from Task 3 and resolver input types from Task 1.
- Produces: `listCatalogSummaries`, `getCatalogFamilyDetail`, `createCatalogFamily`, `updateCatalogFamilyAggregate`, `archiveCatalogFamily`, `restoreCatalogFamily`, `getCatalogDeletionEligibility`, and `deleteCatalogFamily`.

- [ ] **Step 1: Write failing model tests for summaries, conflicts, lifecycle, and aggregate integrity**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "~/libs/prisma/client.server";
import {
  archiveCatalogFamily,
  listCatalogSummaries,
  updateCatalogFamilyAggregate,
} from "./catalog.server";

vi.mock("~/libs/prisma/client.server", () => ({ default: {
  quoteCatalogItem: { findMany: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn() },
  $transaction: vi.fn(),
} }));

describe("catalog aggregate model", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists compact active summaries without option values or variants", async () => {
    vi.mocked(prisma.quoteCatalogItem.findMany).mockResolvedValueOnce([]);
    await listCatalogSummaries({ status: "active", search: "boiler" });
    expect(prisma.quoteCatalogItem.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { archivedAt: null, name: { contains: "boiler", mode: "insensitive" } },
      select: expect.not.objectContaining({ options: expect.anything(), variants: expect.anything() }),
    }));
  });

  it("returns stale when expectedUpdatedAt no longer matches", async () => {
    const result = await updateCatalogFamilyAggregate({
      id: 1,
      expectedUpdatedAt: "2026-08-29T00:00:00.000Z",
      family: { slug: "boiler", name: "Boiler", nameTemplate: null, descriptionLines: [], defaultUnitPriceCents: null, imageId: null },
      options: [],
      variants: [],
    });
    expect(result).toEqual({ ok: false, error: "stale" });
  });
});
```

Add tests proving unchanged option/value/variant IDs are updated rather than recreated, explicit removed variants permit value deletion, implicit orphaning is rejected, archive excludes picker results, restore works, and hard delete is blocked by quotation lines or normalization provenance.

- [ ] **Step 2: Run the focused model test and confirm failure**

Run: `yarn test app/models/catalog.server.test.ts`

Expected: FAIL because `catalog.server.ts` does not exist.

- [ ] **Step 3: Implement compact/detail queries and aggregate input types**

```ts
export type CatalogListStatus = "active" | "archived" | "all";

export type CatalogAggregateInput = {
  id: number;
  expectedUpdatedAt: string;
  family: {
    slug: string;
    name: string;
    nameTemplate: string | null;
    descriptionLines: string[];
    defaultUnitPriceCents: number | null;
    imageId: number | null;
  };
  options: Array<{
    id?: number;
    clientKey: string;
    name: string;
    slug: string;
    placement: "TITLE" | "DESCRIPTION";
    sortOrder: number;
    values: Array<{
      id?: number;
      clientKey: string;
      label: string;
      slug: string;
      titleFragment: string | null;
      descriptionLines: string[];
      sortOrder: number;
    }>;
  }>;
  variants: Array<{
    id?: number;
    clientKey: string;
    valueClientKeys: string[];
    sku: string | null;
    active: boolean;
    nameOverride: string | null;
    descriptionLinesOverride: string[] | null;
    unitPriceCents: number | null;
    imageId: number | null;
  }>;
};

export type CatalogMutationResult =
  | { ok: true; item: Awaited<ReturnType<typeof getCatalogFamilyDetail>> }
  | { ok: false; error: "not_found" | "stale" | "invalid" | "referenced"; fields?: Record<string, string> };
```

Move catalog-specific functions out of `quotation.server.ts`; retain re-exports only temporarily when needed to keep call sites compiling within this task.

- [ ] **Step 4: Implement transactional optimistic aggregate updates**

Inside one Prisma transaction:

1. claim the parent version using `updateMany({ where: { id, updatedAt: expected }, data: parentFields })`;
2. return `stale` when count is zero;
3. validate submitted child IDs belong to the family;
4. upsert submitted children while retaining IDs;
5. delete explicitly omitted variants first;
6. reject value/option removal while still referenced by retained variants;
7. delete explicitly omitted values/options;
8. reload ordered family detail.

Lifecycle mutations also require `expectedUpdatedAt`. Hard delete eligibility counts quotation references, source maps, aliases with provenance, and generated normalization families.

- [ ] **Step 5: Run focused and quotation model tests**

Run: `yarn test app/models/catalog.server.test.ts app/models/quotation.server.test.ts && yarn typecheck`

Expected: PASS.

- [ ] **Step 6: Commit the catalog model**

```bash
git add app/models/catalog.server.ts app/models/catalog.server.test.ts app/models/quotation.server.ts
git commit -m "feat(catalog): add transactional family management"
```

---

### Task 5: Normalization Export and CLI Validation

**Files:**
- Create: `scripts/catalog-normalization/export.ts`
- Create: `scripts/catalog-normalization/validate.ts`
- Create: `data/catalog-normalization/.gitkeep`
- Modify: `.gitignore`
- Modify: `package.json`
- Modify: `yarn.lock`
- Modify: `app/models/catalog-normalization.server.ts`
- Create: `app/models/catalog-normalization.server.test.ts`

**Interfaces:**
- Consumes: proposal contract from Task 2 and Prisma schema from Task 3.
- Produces: `exportCatalogNormalizationSource`, `validateAndRecordCatalogProposal`, CLI commands `catalogNormalizeExport` and `catalogNormalizeValidate`.

- [ ] **Step 1: Install the development-only TypeScript CLI runner and add ignored workspace rules**

Run: `yarn add -D tsx`

Add:

```gitignore
# Local agent catalog normalization artifacts
/data/catalog-normalization/*
!/data/catalog-normalization/.gitkeep
```

Add scripts:

```json
{
  "catalogNormalizeExport": "tsx scripts/catalog-normalization/export.ts",
  "catalogNormalizeValidate": "tsx scripts/catalog-normalization/validate.ts"
}
```

- [ ] **Step 2: Write failing export and validation service tests**

```ts
import { describe, expect, it, vi } from "vitest";
import prisma from "~/libs/prisma/client.server";
import { digestCatalogSource, type CatalogNormalizationProposal, type CatalogNormalizationSourceSnapshot } from "~/utils/catalog-normalization-contract";
import {
  exportCatalogNormalizationSource,
  validateAndRecordCatalogProposal,
} from "./catalog-normalization.server";

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
  it("exports only active catalog fields and no quotation/client data", async () => {
    vi.mocked(prisma.quoteCatalogItem.findMany).mockResolvedValueOnce([
      { id: 1, slug: "boiler", name: "Boiler", descriptionLines: [], defaultUnitPriceCents: 100, imageId: null },
    ] as never);
    const exported = await exportCatalogNormalizationSource();
    expect(exported.items[0]).toEqual({ id: 1, slug: "boiler", name: "Boiler", descriptionLines: [], defaultUnitPriceCents: 100, imageId: null });
    expect(JSON.stringify(exported)).not.toMatch(/client|quotation/i);
  });

  it("records only proposals matching the current source digest", async () => {
    const result = await validateAndRecordCatalogProposal({ source, proposal });
    expect(result).toMatchObject({ ok: true, runId: expect.any(Number) });
  });
});
```

Add stale digest, invalid semantic proposal, and repeated digest idempotency cases.

- [ ] **Step 3: Run the service tests and confirm failure**

Run: `yarn test app/models/catalog-normalization.server.test.ts`

Expected: FAIL because the service exports are absent.

- [ ] **Step 4: Implement export and validation recording**

```ts
export async function exportCatalogNormalizationSource(): Promise<CatalogNormalizationSourceSnapshot> {
  const items = await prisma.quoteCatalogItem.findMany({
    where: { archivedAt: null, options: { none: {} } },
    orderBy: { id: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      descriptionLines: true,
      defaultUnitPriceCents: true,
      imageId: true,
    },
  });
  return {
    schemaVersion: CATALOG_NORMALIZATION_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    items: items.map((item) => ({ ...item, descriptionLines: toStringArray(item.descriptionLines) })),
  };
}
```

`validateAndRecordCatalogProposal` reruns pure validation, inserts or returns the run identified by source digest, stores source/proposal snapshots, algorithm version, and `VALIDATED` status, and never mutates catalog rows.

CLI wrappers read/write only:

- `data/catalog-normalization/source.json`;
- `data/catalog-normalization/proposal.json`;
- `data/catalog-normalization/validation.json`.

They print digest, item/family/source counts, validation errors, and run ID without printing quotation or client data.

- [ ] **Step 5: Run tests and exercise CLI help/error behavior**

Run: `yarn test app/models/catalog-normalization.server.test.ts app/utils/catalog-normalization-contract.test.ts && yarn catalogNormalizeExport && yarn catalogNormalizeValidate`

Expected: tests pass; export writes `source.json`; validation either records a valid proposal or exits nonzero with exact structured errors when `proposal.json` is absent/invalid.

- [ ] **Step 6: Commit normalization preparation**

```bash
git add .gitignore package.json yarn.lock data/catalog-normalization/.gitkeep scripts/catalog-normalization app/models/catalog-normalization.server.ts app/models/catalog-normalization.server.test.ts
git commit -m "feat(catalog): export agent normalization inputs"
```

---

### Task 6: Transactional Apply, Eligibility, and Revert

**Files:**
- Modify: `app/models/catalog-normalization.server.ts`
- Modify: `app/models/catalog-normalization.server.test.ts`
- Create: `scripts/catalog-normalization/apply.ts`
- Create: `scripts/catalog-normalization/revert.ts`
- Modify: `package.json`
- Modify: `prisma/seed.js`

**Interfaces:**
- Consumes: validated run IDs and immutable source/proposal snapshots from Task 5.
- Produces: `applyCatalogNormalizationRun`, `getCatalogNormalizationRevertEligibility`, `revertCatalogNormalizationRun`, `resolveCatalogImportAlias`, and CLI commands.

- [ ] **Step 1: Write failing atomicity, idempotency, remapping, and revert tests**

```ts
it("applies a validated run atomically and preserves quotation line snapshots", async () => {
  const before = [{ id: 90, catalogItemId: 1, name: "Boiler 400L", descriptionLines: ["Original"], catalogSelectionSnapshot: [] }];
  const result = await applyCatalogNormalizationRun(validatedRunId);
  expect(result).toMatchObject({ ok: true, status: "APPLIED", remappedLineCount: 1 });
  expect(savedLines).toEqual([expect.objectContaining({
    id: 90,
    name: before[0].name,
    descriptionLines: before[0].descriptionLines,
    catalogSelectionSnapshot: before[0].catalogSelectionSnapshot,
  })]);
});

it("is idempotent and blocks ambiguous revert", async () => {
  const first = await applyCatalogNormalizationRun(validatedRunId);
  expect(await applyCatalogNormalizationRun(validatedRunId)).toEqual(first);
  await attachNewQuotationLineToGeneratedFamily();
  expect(await getCatalogNormalizationRevertEligibility(validatedRunId)).toEqual({
    eligible: false,
    postRunQuotationLineCount: 1,
    editedFamilyCount: 0,
  });
  expect(await revertCatalogNormalizationRun(validatedRunId)).toMatchObject({ ok: false, error: "unsafe_revert" });
});
```

Add atomic rollback on mid-apply error, one immutable map per source, source row archiving, exact original line ID recording, post-run family edit detection, safe restore, second revert idempotency, and exact alias import matching.

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `yarn test app/models/catalog-normalization.server.test.ts`

Expected: FAIL because apply/revert functions are absent.

- [ ] **Step 3: Implement the run state machine and apply transaction**

```ts
export type CatalogNormalizationApplyResult =
  | { ok: true; runId: number; status: "APPLIED"; familyCount: number; sourceCount: number; remappedLineCount: number }
  | { ok: false; error: "not_found" | "invalid_status" | "stale_source" | "apply_failed" };

export async function applyCatalogNormalizationRun(runId: number): Promise<CatalogNormalizationApplyResult> {
  return prisma.$transaction(async (tx) => {
    const run = await claimRun(tx, runId, "VALIDATED", "APPLYING");
    if (run.status === "APPLIED") return readRecordedApplyResult(run);
    assertCurrentSourceDigest(run);
    // Create canonical aggregate records, aliases, and immutable source maps.
    // Record source row state and exact quotation-line IDs before remapping.
    // Remap catalogItemId only; never update quotation snapshot fields.
    // Archive source rows, write result JSON, and mark APPLIED.
    return result;
  });
}
```

Use conditional status updates to lock one run. On transaction failure, persist a concise `FAILED` result in a separate transaction without partially applying catalog changes.

- [ ] **Step 4: Implement safe eligibility and revert**

Eligibility compares:

- generated family `updatedAt` with the apply result timestamp/version;
- quotation lines currently referencing generated families against the line IDs recorded in source maps;
- presence and archived state of every source row;
- run status.

`revertCatalogNormalizationRun` claims `APPLIED → REVERTING`, restores only recorded line IDs to their exact source item, restores source state, archives generated families, and marks `REVERTED`. It returns the recorded result on repeated calls. It never accepts a force flag.

- [ ] **Step 5: Implement exact alias import resolution and seed behavior**

```ts
export async function resolveCatalogImportAlias(name: string) {
  const normalizedKey = normalizeCatalogAlias(name);
  return prisma.quoteCatalogAlias.findUnique({
    where: { normalizedKey },
    select: { catalogItemId: true },
  });
}
```

Change `prisma/seed.js` so an exact slug wins, then exact normalized alias resolves to a canonical family, and unmatched rows create a flat product. Do not fuzzy-match.

- [ ] **Step 6: Add apply/revert CLI commands**

```json
{
  "catalogNormalizeApply": "tsx scripts/catalog-normalization/apply.ts",
  "catalogNormalizeRevert": "tsx scripts/catalog-normalization/revert.ts"
}
```

Require numeric `--run <id>`. `revert.ts` prints eligibility and exits nonzero without mutation when unsafe.

- [ ] **Step 7: Run normalization tests and static checks**

Run: `yarn test app/models/catalog-normalization.server.test.ts && yarn typecheck`

Expected: PASS.

- [ ] **Step 8: Commit apply/revert**

```bash
git add app/models/catalog-normalization.server.ts app/models/catalog-normalization.server.test.ts scripts/catalog-normalization package.json prisma/seed.js
git commit -m "feat(catalog): apply and revert normalization runs"
```

---

### Task 7: Catalog List, Aggregate Editor, and Correction UX

**Files:**
- Modify: `app/routes/admin.catalog.tsx`
- Create: `app/routes/admin.catalog.test.tsx`
- Create: `app/routes/admin.catalog.$id.tsx`
- Create: `app/routes/admin.catalog.$id.test.tsx`
- Create: `app/routes/admin.catalog.normalization.$runId.tsx`

**Interfaces:**
- Consumes: catalog model APIs from Task 4, resolver from Task 1, and normalization eligibility/revert from Task 6.
- Produces: full admin lifecycle and correction UI with Portuguese validation/conflict messages.

- [ ] **Step 1: Write failing list and lifecycle route tests**

```ts
it("loads searched archived summaries and requires admin", async () => {
  const request = new Request("https://thermal.test/admin/catalog?status=archived&q=boiler");
  await loader({ request, params: {}, context: {} });
  expect(requireAdmin).toHaveBeenCalledWith(request);
  expect(listCatalogSummaries).toHaveBeenCalledWith({ status: "archived", search: "boiler" });
});

it("archives with optimistic concurrency and reports stale edits", async () => {
  archiveCatalogFamily.mockResolvedValueOnce({ ok: false, error: "stale" });
  const response = await action(actionArgs({ intent: "archive", id: "1", expectedUpdatedAt: "2026-08-29T00:00:00.000Z" }));
  expect(response.status).toBe(409);
  await expect(response.json()).resolves.toEqual({ error: "Este produto foi alterado em outra aba. Recarregue e tente novamente." });
});
```

Add create, restore, referenced delete rejection, active/archived filter rendering, search retention, and normalization-run link tests.

- [ ] **Step 2: Write failing editor aggregate and correction tests**

Cover:

- admin authorization and 404;
- base/option/value/variant parsing;
- `expectedUpdatedAt` submission;
- field-level Portuguese errors;
- preview using `resolveCatalogSelection`;
- rejection when removing a value still used by a retained variant;
- explicit variant removal plus value removal succeeding;
- provenance and unsafe-revert warning rendering.

- [ ] **Step 3: Run route tests and confirm failure**

Run: `yarn test app/routes/admin.catalog.test.tsx app/routes/admin.catalog.\$id.test.tsx`

Expected: FAIL because tests/routes and intents are absent.

- [ ] **Step 4: Refactor the Catalog list route**

Loader input:

```ts
const url = new URL(request.url);
const status = parseCatalogStatus(url.searchParams.get("status"));
const search = url.searchParams.get("q")?.trim() ?? "";
return json({ items: await listCatalogSummaries({ status, search }), status, search });
```

Use explicit `create`, `archive`, `restore`, and `delete` intents. Preserve current upload behavior, but route image assignment through aggregate optimistic concurrency. Render searchable filters, option/variant/alias counts, edit links, archive/restore controls, and eligibility explanations.

- [ ] **Step 5: Implement the aggregate editor route**

Use separate sections for:

1. base family fields and image;
2. ordered axes with placement;
3. ordered values with title fragment or description lines according to placement;
4. explicit combination rows and overrides;
5. aliases/provenance;
6. live selection preview;
7. lifecycle controls.

Submit aggregate JSON in a hidden field generated from controlled state. Parse and validate it server-side; never trust client-only variant keys. Show a confirmation summary before removing values/options that affect variants.

- [ ] **Step 6: Implement normalization run detail and safe revert**

The loader returns run summary plus eligibility counts. The action accepts only `intent=revert`, calls `revertCatalogNormalizationRun`, and returns HTTP 409 with actionable Portuguese counts when unsafe.

- [ ] **Step 7: Run route tests, typecheck, and build**

Run: `yarn test app/routes/admin.catalog.test.tsx app/routes/admin.catalog.\$id.test.tsx && yarn typecheck && yarn build`

Expected: PASS.

- [ ] **Step 8: Commit Catalog management**

```bash
git add app/routes/admin.catalog.tsx app/routes/admin.catalog.test.tsx 'app/routes/admin.catalog.$id.tsx' 'app/routes/admin.catalog.$id.test.tsx' 'app/routes/admin.catalog.normalization.$runId.tsx'
git commit -m "feat(catalog): manage normalized product families"
```

---

### Task 8: Server-Validated Quotation Selection and Snapshot Persistence

**Files:**
- Create: `app/routes/admin.catalog.$id_.resolve.ts`
- Create: `app/utils/catalog-selection-token.server.ts`
- Create: `app/utils/catalog-selection-token.server.test.ts`
- Modify: `.env-example`
- Modify: `app/models/quotation.server.ts`
- Modify: `app/models/quotation.server.test.ts`
- Modify: `app/routes/admin.quotations.$id.tsx`
- Modify: `app/routes/admin.quotations.$id.test.tsx`
- Modify: `app/components/admin/QuotationEditorRows.tsx`
- Modify: `app/utils/quotation-editor-state.ts`

**Interfaces:**
- Consumes: `getCatalogFamilyDetail`, `resolveCatalogSelection`, and readable snapshot types.
- Produces: authenticated family-detail/resolve responses, signed `catalogResolutionToken`, and lossless trusted snapshot persistence.

- [ ] **Step 1: Write failing token integrity tests**

```ts
import { describe, expect, it } from "vitest";
import { createCatalogSelectionToken, verifyCatalogSelectionToken } from "./catalog-selection-token.server";

const payload = {
  version: 1 as const,
  catalogItemId: 10,
  issuedAt: "2026-08-29T00:00:00.000Z",
  selectionSnapshot: [
    { optionSlug: "capacity", optionLabel: "Capacidade", valueSlug: "400-l", valueLabel: "400 L" },
  ],
};

describe("catalog selection tokens", () => {
  it("round-trips a server snapshot", () => {
    const token = createCatalogSelectionToken(payload, "test-secret");
    expect(verifyCatalogSelectionToken(token, "test-secret", new Date("2026-08-30T00:00:00.000Z"))).toEqual(payload);
  });

  it("rejects tampering, wrong secrets, and tokens older than seven days", () => {
    const token = createCatalogSelectionToken(payload, "test-secret");
    expect(() => verifyCatalogSelectionToken(`${token}x`, "test-secret")).toThrow("invalid_catalog_selection_token");
    expect(() => verifyCatalogSelectionToken(token, "wrong-secret")).toThrow("invalid_catalog_selection_token");
    expect(() => verifyCatalogSelectionToken(token, "test-secret", new Date("2026-09-06T00:00:00.000Z"))).toThrow("expired_catalog_selection_token");
  });
});
```

- [ ] **Step 2: Write failing authenticated resolve route tests**

```ts
it("returns server-built fields, snapshot, and a signed resolution token", async () => {
  getCatalogFamilyDetail.mockResolvedValueOnce(configurableFamily);
  const request = new Request("https://thermal.test/admin/catalog/10/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ selectedValueIds: [11, 21] }),
  });
  const response = await action({ request, params: { id: "10" }, context: {} });
  expect(requireAdmin).toHaveBeenCalledWith(request);
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toMatchObject({
    draft: {
      name: expect.any(String),
      selectionSnapshot: expect.any(Array),
      catalogResolutionToken: expect.any(String),
    },
  });
});

it.each([
  ["missing_option", 400],
  ["unknown_value", 400],
  ["unknown_combination", 409],
])("maps %s to a safe response", async (error, status) => {
  resolveCatalogSelection.mockReturnValueOnce({ ok: false, error });
  expect((await action(resolveArgs)).status).toBe(status);
});
```

Also test authenticated GET returns ordered active family detail for the lazy picker, archived/missing family rejection, and simple product resolution with an empty selection.

- [ ] **Step 3: Write failing trusted snapshot round-trip tests**

Cover both save paths:

```ts
expect(createManyData[0]).toMatchObject({
  name: "Manually edited name",
  descriptionLines: ["Manually edited bullet"],
  catalogSelectionSnapshot: [
    { optionSlug: "capacity", optionLabel: "Capacidade", valueSlug: "400-l", valueLabel: "400 L" },
  ],
});
```

- Existing submitted line IDs reuse the snapshot loaded from the database and ignore any client snapshot/token replacement.
- New resolved lines verify `catalogResolutionToken` and persist its snapshot.
- New manual lines without a token persist `[]`.
- Tampered or expired tokens return HTTP 400.

Save once, alter the mocked Catalog family, save again, and assert snapshot/manual fields remain byte-equivalent without calling the resolver.

- [ ] **Step 4: Run focused tests and confirm failure**

Run: `yarn test app/utils/catalog-selection-token.server.test.ts app/models/quotation.server.test.ts app/routes/admin.quotations.\$id.test.tsx`

Expected: FAIL because signing, resolve route, and snapshot plumbing are absent.

- [ ] **Step 5: Implement signed token creation and verification**

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function createCatalogSelectionToken(payload: CatalogSelectionTokenPayload, secret: string) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verifyCatalogSelectionToken(token: string, secret: string, now = new Date()) {
  const [body, signature] = token.split(".");
  if (!body || !signature) throw new Error("invalid_catalog_selection_token");
  const expected = createHmac("sha256", secret).update(body).digest();
  const supplied = Buffer.from(signature, "base64url");
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) throw new Error("invalid_catalog_selection_token");
  const payload = parseCatalogSelectionTokenPayload(JSON.parse(Buffer.from(body, "base64url").toString("utf8")));
  if (now.getTime() - Date.parse(payload.issuedAt) > MAX_AGE_MS) throw new Error("expired_catalog_selection_token");
  return payload;
}
```

Add `CATALOG_SELECTION_SECRET=` to `.env-example`. Production startup/route use must fail closed with a clear server error when it is absent.

- [ ] **Step 6: Implement authenticated GET detail and POST resolve**

```ts
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  await requireAdmin(request);
  const item = await requireActiveCatalogFamily(params.id);
  return json({ family: toCatalogFamilyInput(item) });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  await requireAdmin(request);
  const item = await requireActiveCatalogFamily(params.id);
  const body = (await request.json()) as { selectedValueIds?: unknown };
  const result = resolveCatalogSelection(toCatalogFamilyInput(item), parseIntegerArray(body.selectedValueIds));
  if (!result.ok) return catalogResolutionErrorResponse(result.error);
  const tokenPayload = {
    version: 1 as const,
    catalogItemId: item.id,
    issuedAt: new Date().toISOString(),
    selectionSnapshot: result.value.selectionSnapshot,
  };
  return json({
    draft: {
      ...result.value,
      catalogResolutionToken: createCatalogSelectionToken(tokenPayload, requireCatalogSelectionSecret()),
    },
  });
};
```

The route never accepts client-provided names, descriptions, prices, images, or snapshots.

- [ ] **Step 7: Preserve trusted snapshots through quotation replacement saves**

Add `catalogSelectionSnapshot` to the database select/output type. Add `catalogResolutionToken` only to new client draft/save input.

Before deleting existing quotation lines, load their IDs and snapshots into a server map. While building replacement rows:

- submitted existing ID owned by the quotation → use the server map snapshot;
- new line with valid signed token → use token payload snapshot and require token catalog ID to equal submitted `catalogItemId`;
- new manual line without catalog ID/token → use `[]`;
- every other combination → reject with HTTP 400.

The hidden field contains only the signed token. Never accept raw client JSON as the authoritative snapshot.

- [ ] **Step 8: Run focused tests and static checks**

Run: `yarn test app/utils/catalog-selection-token.server.test.ts app/models/quotation.server.test.ts app/routes/admin.quotations.\$id.test.tsx app/components/admin/quotation-editor.test.tsx && yarn typecheck`

Expected: PASS.

- [ ] **Step 9: Commit server-validated snapshots**

```bash
git add .env-example 'app/routes/admin.catalog.$id_.resolve.ts' app/utils/catalog-selection-token.server.ts app/utils/catalog-selection-token.server.test.ts app/models/quotation.server.ts app/models/quotation.server.test.ts 'app/routes/admin.quotations.$id.tsx' 'app/routes/admin.quotations.$id.test.tsx' app/components/admin/QuotationEditorRows.tsx app/utils/quotation-editor-state.ts
git commit -m "feat(quotes): validate and snapshot catalog selections"
```

---

### Task 9: Compact Lazy Configurable Product Picker

**Files:**
- Create: `app/components/admin/CatalogVariationPicker.tsx`
- Create: `app/components/admin/CatalogVariationPicker.test.tsx`
- Modify: `app/routes/admin.quotations.$id.tsx`
- Modify: `app/routes/admin.quotations.$id.test.tsx`
- Modify: `app/models/catalog.server.ts`
- Modify: `app/models/catalog.server.test.ts`

**Interfaces:**
- Consumes: compact family summaries and `POST /admin/catalog/:id/resolve` from Task 8.
- Produces: one-click simple flow and lazy configurable selection flow with editable generated line insertion.

- [ ] **Step 1: Write failing compact loader and picker tests**

```ts
it("does not include option values or variants in quotation editor summaries", async () => {
  await loadQuotationEditorData("user-1", 42);
  expect(prisma.quoteCatalogItem.findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: { archivedAt: null },
    select: expect.not.objectContaining({ options: expect.anything(), variants: expect.anything() }),
  }));
});

it("waits for a valid configurable resolution before adding", async () => {
  render(<CatalogVariationPicker summary={configurableSummary} onAdd={onAdd} onCancel={() => {}} />);
  expect(screen.getByRole("button", { name: "Adicionar" })).toBeDisabled();
  await user.selectOptions(screen.getByLabelText("Capacidade"), "11");
  await user.click(screen.getByRole("button", { name: "Adicionar" }));
  expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ selectionSnapshot: expect.any(Array) }));
});
```

Add incomplete selection, unavailable combination, request failure, retry, cancel/change family, generated preview, simple immediate add, and archived-summary exclusion cases.

- [ ] **Step 2: Run picker tests and confirm failure**

Run: `yarn test app/components/admin/CatalogVariationPicker.test.tsx app/routes/admin.quotations.\$id.test.tsx`

Expected: FAIL because the picker does not exist and loader is still flat/eager.

- [ ] **Step 3: Make quotation loader summaries compact**

Summary fields are limited to:

```ts
{
  id: true,
  slug: true,
  name: true,
  defaultUnitPriceCents: true,
  imageId: true,
  Image: { select: { location: true, thumbnail: true } },
  _count: { select: { options: true, variants: true } },
}
```

Simple products (`_count.options === 0`) may resolve immediately through the same server endpoint. Do not copy even simple catalog fields directly in the browser.

- [ ] **Step 4: Implement lazy picker behavior**

When a configurable summary is selected:

1. fetch family detail through the route loader or a dedicated authenticated detail response;
2. render one select per ordered option;
3. submit selected value IDs to the resolve endpoint;
4. render server-generated preview/errors;
5. enable Add only after a successful resolution;
6. insert returned draft into existing editable line state;
7. clear picker state.

Use Portuguese error copy and preserve current quotation save/revision behavior.

- [ ] **Step 5: Run picker, quotation, build, and payload checks**

Run: `yarn test app/components/admin/CatalogVariationPicker.test.tsx app/routes/admin.quotations.\$id.test.tsx app/models/catalog.server.test.ts && yarn typecheck && yarn build`

Expected: PASS. Inspect the quotation loader test to confirm it does not request option/value/variant payloads.

- [ ] **Step 6: Commit the picker**

```bash
git add app/components/admin/CatalogVariationPicker.tsx app/components/admin/CatalogVariationPicker.test.tsx 'app/routes/admin.quotations.$id.tsx' 'app/routes/admin.quotations.$id.test.tsx' app/models/catalog.server.ts app/models/catalog.server.test.ts
git commit -m "feat(quotes): pick catalog product configurations"
```

---

### Task 10: Guarded Legacy Product Domain Removal

**Files:**
- Create: `scripts/legacy-products/preflight.ts`
- Create: `scripts/legacy-products/preflight.test.ts`
- Modify: `package.json`
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260829190000_remove_legacy_products/migration.sql`
- Delete: `app/models/product.server.ts`
- Modify: `app/libs/supabase/database.types.ts`

**Interfaces:**
- Consumes: operator acknowledgement and legacy table row counts.
- Produces: audited preflight command, empty-table-only destructive migration, and Prisma schema without legacy product models.

- [ ] **Step 1: Write failing preflight tests**

```ts
import { describe, expect, it } from "vitest";
import { evaluateLegacyProductPreflight } from "./preflight";

const nonempty = { Product: 2, ProductSpec: 3, Brand: 1, Category: 1, Showcase: 0, ShowcaseProduct: 0 };

describe("legacy product preflight", () => {
  it("allows empty tables without acknowledgement", () => {
    expect(evaluateLegacyProductPreflight({ Product: 0, ProductSpec: 0, Brand: 0, Category: 0, Showcase: 0, ShowcaseProduct: 0 }, false))
      .toEqual({ ok: true, clearRows: false });
  });

  it("blocks non-empty tables without exact acknowledgement", () => {
    expect(evaluateLegacyProductPreflight(nonempty, false)).toMatchObject({ ok: false, error: "legacy_rows_exist", counts: nonempty });
  });

  it("permits explicit destructive clearing and requires an audit artifact", () => {
    expect(evaluateLegacyProductPreflight(nonempty, true)).toEqual({ ok: true, clearRows: true });
  });
});
```

Also assert public product routes still import `app/data/products.ts`, not Prisma.

- [ ] **Step 2: Run preflight tests and confirm failure**

Run: `yarn test scripts/legacy-products/preflight.test.ts`

Expected: FAIL because the script does not exist.

- [ ] **Step 3: Implement counted explicit acknowledgement**

Command:

```json
{
  "legacyProductsPreflight": "tsx scripts/legacy-products/preflight.ts"
}
```

Behavior:

- query all six table counts;
- print counts;
- exit 0 when all are empty;
- exit nonzero when non-empty unless passed exact flag `--acknowledge-delete-legacy-products`;
- with acknowledgement, write ignored `data/catalog-normalization/legacy-product-deletion-<timestamp>.json`, then delete rows in FK-safe order inside one transaction;
- never drop tables itself.

Deletion order: `ShowcaseProduct`, `ProductSpec`, then `Showcase`, `Product`, `Brand`, and hierarchical `Category` rows.

- [ ] **Step 4: Write guarded legacy drop SQL**

Begin migration with a PostgreSQL block that raises if any legacy table contains rows:

```sql
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Product")
     OR EXISTS (SELECT 1 FROM "ProductSpec")
     OR EXISTS (SELECT 1 FROM "Brand")
     OR EXISTS (SELECT 1 FROM "Category")
     OR EXISTS (SELECT 1 FROM "Showcase")
     OR EXISTS (SELECT 1 FROM "ShowcaseProduct") THEN
    RAISE EXCEPTION 'Legacy product tables are not empty. Run yarn legacyProductsPreflight and review its audit artifact.';
  END IF;
END $$;
```

Drop tables in FK-safe order. The migration must fail closed if preflight was skipped on a non-empty production database.

- [ ] **Step 5: Remove legacy Prisma/runtime code**

Delete the six legacy models and obsolete `Image.Product` / `Image.Showcase` relations from `prisma/schema.prisma`. Delete `app/models/product.server.ts`. Keep static `app/data/products.ts` and marketing routes unchanged.

- [ ] **Step 6: Regenerate clients/types and run full validation**

Run: `npx prisma format && npx prisma validate && npx prisma generate && yarn supabaseTypes && yarn test && yarn typecheck && yarn build`

Expected: PASS and generated Supabase types contain none of the six removed legacy table definitions.

- [ ] **Step 7: Commit legacy removal**

```bash
git add scripts/legacy-products package.json prisma/schema.prisma prisma/migrations/20260829190000_remove_legacy_products/migration.sql app/libs/supabase/database.types.ts app/models/product.server.ts
git commit -m "chore(catalog): remove guarded legacy products"
```

---

### Task 11: Operator Runbook and End-to-End Verification

**Files:**
- Create: `docs/catalog-normalization.md`
- Modify: `data/quotations/README.md`
- Modify: `docs/superpowers/plans/2026-08-29-quotation-catalog-normalization.md` only to check completed boxes during execution.

**Interfaces:**
- Consumes: all commands and user flows from Tasks 1–10.
- Produces: operational procedure and recorded verification evidence.

Binding override: this is a fresh undeployed app. Task 10's legacy preflight, acknowledgement, audit, and compatibility requirements below are superseded by direct removal. Database rehearsal still requires an explicitly disposable `TEST_DATABASE_URL`.

- [x] **Step 1: Write the operator runbook with exact commands**

Document this safe sequence:

```bash
yarn catalogNormalizeExport
# Agent reads data/catalog-normalization/source.json and writes proposal.json.
yarn catalogNormalizeValidate
yarn catalogNormalizeApply --run <validated-run-id>
yarn catalogNormalizeRevert --run <applied-run-id> # eligibility checked first
```

Include:

- backup requirement before apply or legacy deletion;
- ignored artifact paths and schema/digest meaning;
- how the autonomous agent must map every source exactly once;
- validator failure interpretation;
- Catalog correction flows;
- why unsafe revert is blocked;
- staging rehearsal;
- exact alias behavior for future imports;
- `yarn legacyProductsPreflight` and the destructive acknowledgement spelling;
- recovery from failed apply, stale proposal, and unsafe revert.

- [ ] **Step 2: Add a representative disposable normalization fixture**

Use an isolated test database containing:

- two boiler capacities;
- two materials;
- one unavailable combination;
- differing prices/images;
- existing quotation lines referencing each flat source.

Export, validate, and apply a proposal. Verify all source IDs are mapped, old rows archived, line foreign keys remapped, and line name/description/price/image/snapshot bytes unchanged.

- [ ] **Step 3: Perform manual Catalog correction acceptance**

1. Search and open the generated boiler family.
2. Change one mistaken placement from `DESCRIPTION` to `TITLE`.
3. Remove one invalid variant explicitly.
4. Save and reload; verify option/value IDs remain stable.
5. Archive and restore the family.
6. Confirm stale second-tab submission returns the Portuguese conflict.

Record observations in the implementation handoff, not in committed client data.

- [ ] **Step 4: Perform quotation acceptance**

1. Add a simple product and confirm one-click behavior.
2. Add a configurable boiler and confirm lazy option loading.
3. Confirm incomplete/unavailable combinations cannot be added.
4. Edit generated name and description.
5. Save and print.
6. Change the Catalog family.
7. Reload and print again; confirm saved line fields and snapshot did not change.

- [x] **Step 5: Run the full verification suite**

Run:

```bash
yarn lint
yarn test
yarn typecheck
yarn build
npx prisma validate
```

Expected: every command exits 0.

- [ ] **Step 6: Verify migration behavior on disposable databases**

Run the additive migration against a database with flat products and quotation lines. Run the legacy migration once with empty legacy tables and once with non-empty legacy tables.

Expected:

- additive migration preserves all rows and references;
- empty legacy migration succeeds;
- non-empty legacy migration fails with the preflight instruction;
- after acknowledged preflight clears rows and writes an audit artifact, the legacy migration succeeds.

- [x] **Step 7: Commit documentation**

```bash
git add docs/catalog-normalization.md data/quotations/README.md docs/superpowers/plans/2026-08-29-quotation-catalog-normalization.md
git commit -m "docs(catalog): add normalization runbook"
```

## Final Acceptance Checklist

Binding fresh-app override: the legacy preflight/acknowledgement requirement is superseded. The direct legacy-table removal migration is implemented but has not been executed in this workflow. Code-level checks below are marked only where automated evidence exists; remote apply and disposable-database/manual checks remain open.

- [ ] Every original active flat catalog row maps exactly once in the applied run ledger. *(Requires a deliberate validated apply against the target database.)*
- [x] Agent proposals cannot apply against a stale source digest. *(Contract and model tests.)*
- [x] Price and image differences have machine-verifiable dispositions. *(Contract validation tests.)*
- [x] Catalog families, options, values, and variants are editable; aliases and immutable normalization provenance are displayed for review. *(Model and route tests.)*
- [x] Archived families disappear from new quote selection without changing saved quotes. *(Model/picker/snapshot tests.)*
- [x] Configurable details are absent from the initial quotation loader payload. *(Compact-query tests.)*
- [x] The server, not the browser, creates trusted selection snapshots. *(Resolve/token/quotation tests.)*
- [x] Existing quote lines remain editable and never re-resolve after Catalog changes. *(Trusted snapshot tests.)*
- [x] Apply and safe revert are idempotent; ambiguous revert is blocked. *(Normalization model tests; database rehearsal remains open.)*
- [ ] Legacy tables cannot be dropped while non-empty without explicit acknowledged clearing. *(Superseded by the binding fresh-app direct-removal ruling.)*
- [x] Static marketing products and public product routes remain unchanged. *(Static-route guard tests.)*
- [ ] Unit, route, model, migration, typecheck, lint, and build verification pass. *(Code verification may be checked after Task 11 commands; disposable migration rehearsal remains open.)*
