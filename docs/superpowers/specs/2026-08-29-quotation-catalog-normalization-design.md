# Quotation Catalog Normalization and Variants Design

**Date:** 2026-08-29
**Status:** Proposed
**Supersedes:** `docs/superpowers/plans/2026-08-13-catalog-product-variations.md`

## Goal

Make `QuoteCatalogItem` the only database-backed product domain used by quotations. Consolidate duplicate flat catalog rows into canonical product families with selectable attributes, let an agent perform the initial categorization autonomously, and give administrators enough Catalog controls to correct the result afterward.

Marketing products in `app/data/products.ts` remain separate. The unused legacy Prisma product domain is removed.

## Current State

The application currently has three product representations:

1. `QuoteCatalogItem`, used by the quotation admin and copied into editable `QuotationLine` snapshots.
2. Legacy Prisma models (`Product`, `ProductSpec`, `Brand`, `Category`, `Showcase`, and `ShowcaseProduct`), referenced only by the otherwise-unused `app/models/product.server.ts`.
3. Static marketing products in `app/data/products.ts`, used by public product routes.

`QuoteCatalogItem` is flat. The import parser only merges names that are nearly identical after case and accent normalization. The Catalog page can create products and upload images but cannot edit, archive, restore, or manage options and combinations.

## Core Decisions

### Canonical relational catalog

Catalog families, option axes, option values, and concrete combinations use relational tables. JSONB is not the canonical attribute store because it would weaken uniqueness, referential integrity, combination validation, editing, and querying.

JSONB remains appropriate for:

- immutable quotation selection snapshots;
- normalization run input/output snapshots;
- description-line arrays, which are presentation content rather than queryable identity.

### Attribute placement

Every option axis has one placement:

- `TITLE`: its selected value contributes to the generated line name;
- `DESCRIPTION`: its selected value contributes generated bullets to the line description.

Placement is configured once per axis, not per value. This keeps composition understandable in the Catalog editor.

For a `TITLE` option, the value label is appended by default; an optional `titleFragment` can provide different display text. For a `DESCRIPTION` option, `descriptionLines` are appended; when empty, the resolver generates `<Option name>: <Value label>`.

The base product description is included before generated attribute bullets. Duplicate bullets are removed by normalized exact comparison while preserving order.

### Optional explicit variants

An option selection is not itself stored as a duplicated product. `QuoteCatalogVariant` exists only when a combination needs identity or overrides such as SKU, price, image, availability, name, or description.

- If a family has no explicit variants, every complete option combination is valid.
- If it has explicit variants, only listed active combinations are selectable.
- Variant name and description overrides replace the composed values; otherwise the resolver composes them.
- Price and image fall back from variant to the parent catalog item.

### Editable quotation snapshots

Selecting a catalog family and its values produces a draft quotation line. Its generated name, description, price, and image load into the existing editable fields. Salespeople may change them before saving.

`QuotationLine` stores both:

- the final editable fields already used for printing;
- `catalogSelectionSnapshot`, a JSON array containing option/value slugs and labels as selected at that time.

The snapshot stores readable values rather than only foreign-key IDs. Issued and historical quotations never re-resolve catalog content, so later catalog edits cannot change them.

## Data Model

### Changes to `QuoteCatalogItem`

Add:

- `updatedAt`;
- `archivedAt` nullable;
- `nameTemplate` nullable, for advanced title order when simple append order is insufficient;
- relations to options, variants, aliases, and normalization provenance.

The existing slug stays unique and stable. Archived items are excluded from the quote picker but remain visible through a Catalog filter.

### New models

`QuoteCatalogOption`

- parent catalog item;
- unique slug within the parent;
- name;
- placement (`TITLE` or `DESCRIPTION`);
- sort order.

`QuoteCatalogOptionValue`

- parent option;
- unique slug within the option;
- label;
- optional title fragment;
- description lines JSON;
- sort order.

`QuoteCatalogVariant`

- parent catalog item;
- deterministic combination key;
- optional unique SKU;
- active flag;
- optional absolute price, image, name override, and description override;
- many-to-many links to selected option values.

`QuoteCatalogVariantValue`

- composite primary key joining a variant to its selected values.

`QuoteCatalogAlias`

- canonical catalog item;
- original source name;
- normalized alias key;
- optional source slug and source metadata;
- unique normalized alias key to make future imports converge on the same family.

`CatalogNormalizationRun`

- status and algorithm/prompt version;
- source snapshot JSON;
- validated proposal JSON;
- result summary JSON;
- timestamps, including an optional reverted timestamp.

`QuotationLine`

- add `catalogSelectionSnapshot Json @default("[]")`.

## Autonomous Normalization

Normalization is an explicit local/admin operation, not a runtime dependency on an LLM and not part of normal page requests.

### Export

A command exports active flat `QuoteCatalogItem` rows with IDs, slugs, names, descriptions, prices, and image references. It contains no client or quotation data.

### Agent categorization

The implementing agent classifies the entire export without a mandatory human review gate. It may radically consolidate duplicates by:

1. normalizing case, accents, whitespace, punctuation, units, and known synonyms;
2. extracting attributes such as capacity, material, voltage, power, dimensions, and model;
3. identifying the shared family name and base description;
4. assigning differing attributes to `TITLE` or `DESCRIPTION` axes;
5. creating explicit variants where prices, images, SKUs, availability, or valid combinations differ;
6. preserving every original row as an alias and source mapping.

The agent writes an ignored local proposal artifact. The repository contains its JSON Schema and deterministic validator, but not customer data or the generated catalog dump.

### Validation

Before application, the validator rejects a proposal unless:

- every source catalog item appears exactly once;
- no unknown source ID is present;
- family, option, value, alias, and SKU uniqueness constraints hold;
- each explicit variant selects exactly one value from every option axis;
- selected values belong to the same family;
- prices are non-negative integers or null;
- names, slugs, descriptions, and templates satisfy length and placeholder rules;
- every source price/image difference is either represented by a variant or explicitly accepted as a parent fallback.

Validation is deterministic even though categorization is agent-driven.

### Transactional apply and rollback

Application runs in one database transaction:

1. record the normalization run and source snapshot;
2. create canonical families, options, values, variants, and aliases;
3. remap existing `QuotationLine.catalogItemId` references to the canonical family without changing line snapshots;
4. archive replaced flat rows rather than hard-delete them;
5. record the result summary.

A run can be reverted while its archived source rows still exist. Reversion restores source rows and their quotation-line references and archives the generated families. This provides a coarse recovery path for a badly categorized batch; individual mistakes are corrected in Catalog.

Future imports first resolve exact alias keys, then create unmatched flat products for a later normalization run. They must not silently fuzzy-merge into existing families.

## Catalog Administration

### Catalog list

`/admin/catalog` becomes a searchable management view with:

- active/archived filters;
- family name, image, price, option axes, variant count, and alias count;
- links to edit each family;
- create-product action;
- archive and restore actions;
- normalization-run status and rollback access.

### Product editor

`/admin/catalog/:id` manages:

1. base name, slug, description, default price, image, and title template;
2. option axes, placement, order, and values;
3. explicit combinations with SKU, active state, price/image/name/description overrides;
4. aliases and normalization provenance;
5. live composition preview using the same resolver as the quote picker.

Option and variant changes are submitted as a validated aggregate and replaced transactionally. IDs of unchanged records should be retained where practical; destructive rewrites that could invalidate variant links are not performed implicitly.

### Correcting agent mistakes

Administrators can:

- rename a family or value;
- change attribute placement;
- add, remove, or reorder options and values;
- add or remove explicit variants;
- edit variant overrides and availability;
- create a replacement family and archive an incorrect one;
- restore archived source rows or revert the whole normalization run.

Hard deletion is allowed only for records with no quotation-line references and no normalization provenance. Otherwise the UI archives them.

## Quotation Builder

The catalog loader returns active families with ordered options, values, variants, and images. To avoid payload growth, the picker initially lists compact family summaries and loads full configuration when a configurable family is selected.

Simple products continue to add immediately. Configurable products open an option picker. The shared pure resolver validates completeness and combination availability and produces the editable draft line.

The save action accepts the selection snapshot alongside the existing line fields. Server-side code revalidates catalog selections when adding them, but subsequent manual edits to the generated line remain valid and do not cause catalog re-resolution.

## Legacy Product Removal

Remove from Prisma:

- `Product`;
- `ProductSpec`;
- `Brand`;
- `Category`;
- `Showcase`;
- `ShowcaseProduct`;
- their obsolete relations from `Image`.

Also remove `app/models/product.server.ts` and regenerate Prisma Client and Supabase database types.

Before dropping production tables, a migration preflight reports row counts. The destructive migration aborts when legacy rows exist unless an explicit operator override confirms that they are obsolete. Static marketing products are unaffected.

## Error Handling and Safety

- Catalog aggregate mutations use database transactions.
- Uniqueness and invalid-combination errors return field-level Portuguese messages.
- Concurrent Catalog edits use `updatedAt` optimistic concurrency and reject stale submissions.
- Archiving a family immediately removes it from new quote selection but does not alter open or historical quotation lines.
- Normalization apply and revert are idempotent by run ID.
- Agent output is never applied without schema and semantic validation.
- Existing user changes and the quotation performance work remain outside this feature except where the catalog loader contract must be extended.

## Testing

### Unit tests

- name and description composition;
- title templates and fragments;
- generated description fallback;
- bullet deduplication;
- complete, missing, duplicate, and unknown selections;
- explicit valid/invalid combinations;
- parent and variant fallback/override behavior;
- normalization canonicalization and proposal validation.

### Model and route tests

- transactional option/variant replacement;
- optimistic concurrency;
- archive, restore, and hard-delete rules;
- apply and revert normalization runs;
- quotation reference remapping without snapshot changes;
- compact catalog list and lazy detail loading;
- server-side selection validation;
- editable quotation snapshots surviving later catalog edits.

### Migration checks

- additive catalog migration against a database containing flat products and quotation lines;
- normalization and rollback on representative duplicate families;
- legacy-table preflight with both empty and non-empty tables;
- Prisma migration deployment and generated-client compatibility.

### Manual acceptance

1. Normalize a duplicate family such as boilers with capacity and material differences.
2. Confirm the agent maps every source item and aliases every original name.
3. Correct one deliberately wrong classification through Catalog.
4. Add a configured product to a quotation and edit its generated description.
5. Change the catalog afterward and confirm the saved quotation and print output remain unchanged.
6. Archive and restore a family.
7. Revert a normalization run and confirm source products return.

## Delivery Boundaries

Included:

- normalized quotation catalog;
- autonomous one-time/batch categorization workflow;
- validation, transactional apply, and rollback;
- complete Catalog editing and lifecycle controls;
- configurable quote picker and editable snapshots;
- legacy database product removal.

Excluded:

- merging static marketing products into the quotation catalog;
- background or per-request LLM calls;
- automatic fuzzy merges during future imports;
- changing existing printed quotation content;
- global option libraries shared across unrelated families.
