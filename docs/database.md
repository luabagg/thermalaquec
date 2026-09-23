# Database

The app uses one PostgreSQL database on Supabase (project `thermalaquec`, region `sa-east-1`). There is no staging database. Prisma owns the `public` schema. Supabase Auth and Storage live in other schemas.

## Safety rules

On 2026-09-23 a Prisma command reset the `public` schema and deleted all data. The free plan had no backup. Obey these rules:

- Do not run `prisma migrate dev`, `prisma migrate reset` or `prisma db push` against Supabase. They can reset the database.
- Do not give the Supabase URL to `--shadow-database-url`, `--from-migrations` or `--to-migrations`. Prisma resets a shadow database.
- Make migration SQL offline: `prisma migrate diff --from-schema-datamodel <old.prisma> --to-schema-datamodel prisma/schema.prisma --script`.
- Apply migrations only with `yarn dbDeploy` (`prisma migrate deploy`). Check first with `yarn dbStatus`.
- Before a command that takes a database URL, print the host and make sure it is the one you want.

## Model

| Table | Holds |
| --- | --- |
| `clients` | Clients. Only `name`, `city` and `state` are required. `document` (CPF or CNPJ, also the 2026 alphanumeric CNPJ) is unique. |
| `catalog_categories` | Picker categories, from `scripts/catalog/categories.mjs`. |
| `catalog_products` | A product line of one brand. |
| `catalog_variants` | What a quotation line uses. Every product has at least one. `name` is the printed name. `attributes` is `[{ name, value }]` for search and display. |
| `quotations` | Owned by one admin user (`owner_user_id`). |
| `quotation_lines` | Copies name, bullets, price and image. `catalog_variant_id` is only a link and becomes null when the variant is deleted. |
| `quotation_payment_options` | Payment choices printed on the quotation. |
| `images` | Uploaded files in Supabase Storage. |

## Catalog import

`scripts/catalog/apply.ts` writes `data/catalog/families.json` into the catalog. It never touches clients or quotations. It refuses to replace an existing catalog unless you pass `--replace`.

```bash
yarn catalogBuildFamilies   # products.json -> families.json
yarn catalogApply           # families.json -> database
```

Each product line needs a category in `scripts/catalog/categories.mjs`. A test fails when a line has none.

## Local database for development and tests

Use a disposable local PostgreSQL. Set both URLs on the command, so `.env` does not apply:

```bash
export LOCAL=postgresql://postgres@127.0.0.1:55432/thermal
POSTGRES_PRISMA_URL=$LOCAL POSTGRES_URL_NON_POOLING=$LOCAL yarn dbDeploy
POSTGRES_PRISMA_URL=$LOCAL POSTGRES_URL_NON_POOLING=$LOCAL yarn catalogApply
TEST_DATABASE_URL=$LOCAL yarn test app/models/models.db.test.ts
```

The persistence tests truncate the tables. They refuse a `TEST_DATABASE_URL` that is not on localhost.
