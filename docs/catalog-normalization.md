# Quotation catalog normalization runbook

## Current delivery state

The normalized catalog, validator, transactional apply/revert services, Catalog editor, lazy quotation picker, and signed quotation snapshots are implemented in code.

**That does not mean an existing remote catalog has been normalized.** Database duplication remains until an operator deliberately:

1. deploys the Prisma migration chain to the intended database;
2. exports that database's current flat quotation catalog;
3. produces and validates a proposal for that exact export; and
4. explicitly applies the resulting validated run ID.

`data/catalog-normalization/validation.json` is only a local command result. An `ok: true` result means a `VALIDATED` run was recorded; it does **not** mean the run is `APPLIED`. The committed file currently records missing local inputs and proves nothing about a remote database.

This is a fresh, undeployed application. The legacy Prisma marketing domain was removed directly. There is no legacy row-count preflight, acknowledgement flag, audit compatibility path, or legacy import fallback. Public marketing products remain separate in `app/data/products.ts`.

## Safety rules

- Confirm the target database and take a restorable backup before migration deployment, normalization apply, or any manual data correction.
- Rehearse migrations and normalization against an explicitly disposable `TEST_DATABASE_URL` before using a shared environment.
- Never substitute a configured development/production database when a disposable test URL is absent.
- Keep `source.json`, `proposal.json`, and customer quotation extracts local. They are ignored by Git.
- Never edit a recorded run or source-map ledger manually.
- Apply only the run ID printed by the successful validation command for the current export.

## Environment and migration setup

Required database variables are `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING`. Quotation selection signing also requires a strong, private `CATALOG_SELECTION_SECRET`; production fails closed when it is absent. Supabase remains responsible for Auth and Storage, not relational catalog access.

Non-destructive code checks:

```bash
npx prisma validate
npx prisma generate
npx prisma migrate status
```

After checking the target, backup, and migration SQL, migration deployment is a separate deliberate operator action:

```bash
npx prisma migrate deploy
```

Do not run that command merely because this runbook exists. The migration chain contains:

- `20260829170000_normalized_quote_catalog`, which adds normalized quotation-catalog tables and snapshots; and
- `20260829190000_remove_legacy_products`, which directly drops the unused `Product`, `ProductSpec`, `Brand`, `Category`, `Showcase`, and `ShowcaseProduct` tables.

The latter is intentionally unconditional under the fresh-app ruling. It does not touch `app/data/products.ts`, but it is still destructive SQL and must only be deployed to the intended fresh environment after backup/review.

## Artifacts and digest binding

Local workspace:

| Path | Meaning |
| --- | --- |
| `data/catalog-normalization/source.json` | Active flat `QuoteCatalogItem` rows exported from the target database. |
| `data/catalog-normalization/proposal.json` | Agent-authored canonical families, options, values, variants, aliases, and source mappings. |
| `data/catalog-normalization/validation.json` | Last validator result and, on success, the recorded run ID/status. Not proof of apply. |

The export has `schemaVersion` and source rows. The proposal must use the supported schema version, provide a non-empty `algorithmVersion`, and copy the SHA-256 `sourceSnapshotDigest` printed for that exact export. The digest excludes the export timestamp but binds all sorted exported source fields. A changed, missing, or archived exported source row causes apply to return `stale_source` rather than normalize different source data. A newly added unrelated flat row is not part of that recorded run; export again before apply if complete current-catalog coverage is required.

## Export → proposal → validate → apply

### 1. Export the target catalog

```bash
yarn catalogNormalizeExport
```

The command exports active catalog rows that have no option axes and prints the digest and item count. Review the target and count before continuing.

### 2. Produce the proposal

An autonomous agent reads `data/catalog-normalization/source.json` and writes `data/catalog-normalization/proposal.json`. It must:

- map every exported source ID exactly once and no unknown ID;
- preserve each source name as its proposed alias;
- define stable unique family/option/value keys and slugs;
- select exactly one value per option for each source and explicit variant;
- model unavailable combinations by omitting them when explicit variants exist or by marking variants inactive;
- identify parent price and image source IDs;
- represent every differing price/image as `VARIANT`, or explicitly choose `USE_PARENT_FALLBACK`;
- use `PARENT_SOURCE` only for the declared parent source;
- keep prices as non-negative integer cents or `null`;
- set a new `algorithmVersion` when deliberately producing a new run after a failed/reverted attempt.

The agent may consolidate aggressively, but it must not invent source IDs or omit a row.

### 3. Validate and record

```bash
yarn catalogNormalizeValidate
cat data/catalog-normalization/validation.json
```

Validation checks the digest, full source coverage, uniqueness, nesting, complete selections, combination validity, field bounds, and price/image dispositions. On success it records or reuses a database run and prints a `runId` with status `VALIDATED`.

Interpret failures by `errors[].code` and `errors[].path`:

- `missing_input` / `invalid_json`: create or repair the local source/proposal file;
- `stale_source_digest`: re-export and regenerate the proposal—never copy a new digest onto an old proposal;
- duplicate/unknown/missing-selection errors: correct the referenced family, option, value, variant, alias, or source mapping;
- disposition errors: explicitly model the source price/image difference;
- `validation_failed`: inspect connectivity/server logs without placing customer data in committed output.

Do not proceed while `ok` is false. Do not infer apply from `ok: true`.

### 4. Apply the validated run deliberately

After backup and review:

```bash
yarn catalogNormalizeApply --run <validated-run-id>
```

A successful result has `ok: true` and status `APPLIED`. In one serializable transaction the service creates canonical families/options/values/variants/aliases, records immutable source maps, remaps quotation-line catalog foreign keys, archives source rows, and stores the result summary. Existing quotation line names, descriptions, prices, images, and selection-snapshot bytes are not rewritten.

Applying an already applied run returns its recorded result. A run in another status is rejected.

## Confirming apply

After the command, verify all of the following against the same environment:

- the command result and `/admin/catalog/normalization/<run-id>` show `APPLIED`;
- `sourceCount` equals the export item count;
- each exported source has exactly one source-map ledger row;
- generated families and their option/value/variant counts match the proposal;
- source rows are archived;
- quotation-line `catalogItemId` values point to canonical families;
- quotation line display fields and snapshot JSON remain byte-equivalent to their pre-apply backup/checksum.

Until these checks and an `APPLIED` status exist, remote duplication is not considered removed.

## Safe revert

Check the run detail page or run:

```bash
yarn catalogNormalizeRevert --run <applied-run-id>
```

The command checks eligibility before mutation. Revert is allowed only while:

- generated families have not been edited;
- no new or changed quotation-line references make ownership ambiguous;
- original mapped lines still reference the expected canonical family; and
- archived source rows are still present.

A safe revert restores source rows and their recorded line references, removes generated-family aliases, archives generated families, and records `REVERTED`. Repeating a completed revert returns its recorded result.

Unsafe revert exits without mutation and reports counts. There is no force flag. Correct affected families/quotes manually, preserve the ledger, or restore the environment from backup after impact review.

## Catalog correction workflow

Administrators use `/admin/catalog` and `/admin/catalog/:id` to:

- search active or archived families;
- edit base name, slug, title template, description, price, and image;
- add, rename, reorder, or remove option axes and values;
- choose `TITLE` or `DESCRIPTION` placement;
- add/remove explicit combinations and edit availability, SKU, price, image, name, or description overrides;
- preview resolver output before save;
- inspect aliases and normalization provenance;
- archive or restore a family.

Aggregate saves use `updatedAt` optimistic concurrency. A stale second-tab submission is rejected in Portuguese; reload before reapplying the intended edit. Removing values/options used by variants requires explicit removal confirmation. Hard deletion is available only without quotation/provenance references.

Editing a generated family makes whole-run revert unsafe by design. Prefer targeted corrections once the catalog is in use.

## Quotation selection and signed snapshots

The quotation loader sends only compact active family summaries. Configurable details load lazily from authenticated `/admin/catalog/:id/resolve`; simple products use the same server resolver with an empty selection.

The server, not the browser:

1. loads the active family and ordered options/variants;
2. validates the selected value IDs and combination;
3. generates name, description, price, and trusted parent/variant image URLs;
4. creates a readable option/value snapshot; and
5. signs the catalog ID and snapshot in a seven-day HMAC token.

The user may edit generated line fields before save. For a new catalog line, save verifies the token and persists its snapshot. For an existing line ID owned by that quotation, save reuses the database snapshot and ignores replacement attempts. Historical lines never re-resolve after Catalog changes, so printing remains based on saved quotation fields.

Archive removes a family from new selection immediately without changing saved quotes.

## Imports and aliases in the fresh app

Normalization apply records aliases and source-map provenance. The current seed imports quotation products by exact stable slug using `QuoteCatalogItem.upsert`. It does **not** use alias or fuzzy fallback compatibility.

There is currently no general future-import alias-resolution pipeline. A future importer must be designed explicitly; it must not silently fuzzy-merge rows. Until then, use stable slugs or import unmatched rows as new flat families for a later export/proposal run.

## Recovery guide

### Proposal is stale

Do not edit only the digest. Re-run export, regenerate the full proposal against that source, validate, and use the newly printed run ID.

### Validation failed

No catalog apply occurred. Correct local artifacts from the structured errors and validate again. Confirm the resulting run status rather than relying on an old `validation.json`.

### Apply returned `stale_source`

No apply mutation committed. Determine who changed the source catalog, re-export, review the differences, and create a new proposal/run.

### Apply returned `apply_failed` or status `FAILED`

The transaction rolls back catalog/remap writes. Preserve logs and the run record. Do not reuse the failed run; fix the cause, re-export if necessary, choose a new `algorithmVersion`, validate a new run, and apply that run.

### Revert is unsafe

Do not force it or edit ledger rows. Inspect `postRunQuotationLineCount` and `editedFamilyCount`, then perform targeted Catalog corrections, manually review affected quotations, or restore from backup in an approved maintenance window.

### Selection token fails

New catalog lines require a server-issued token matching their catalog ID. Ensure `CATALOG_SELECTION_SECRET` is consistently configured, reselect the product if the token is older than seven days, and never manufacture snapshot JSON in the browser.

## Staging and acceptance checklist

On an explicitly disposable, migrated database:

1. seed representative flat boiler rows spanning at least two capacities and two materials, differing price/image values, one unavailable combination, and quotation lines referencing every source;
2. checksum quotation line name, description, price, image, and snapshot fields;
3. export, propose, validate, and apply;
4. verify source coverage, archive state, canonical remaps, dispositions, and unchanged checksums;
5. exercise Catalog correction, stale edit, archive/restore, simple/configurable quotation selection, unavailable combinations, save/print, catalog change, reload/print, and safe revert;
6. destroy the disposable environment after recording non-sensitive observations.

This repository verification did not perform that database rehearsal because no explicitly disposable `TEST_DATABASE_URL` was supplied. It also did not deploy migrations or apply/revert a normalization run against any remote database.
