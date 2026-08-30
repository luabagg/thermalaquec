# Local quotation extraction data

Extracted from Canva folder **budgets** (`FAFOUXOmKmU`).

**Do not commit generated files.** Catalog JSON, client data, and `raw/` remain local through the root `.gitignore`. Marketing products in `app/data/products.ts` are separate and are not generated from these files.

## Local files

| Path | Purpose |
| --- | --- |
| `raw/designs.json` | Canva design IDs/titles in the folder. |
| `raw/contents/{id}.txt` | Raw `get-design-content` dumps; sensitive. |
| `catalog.products.json` | Parsed flat quotation-catalog products. |
| `catalog.clients.json` | Parsed clients; contains PII. |
| `catalog.meta.json` | Extraction metadata. |

Full quotation text dumps live in `raw/contents/`. Skip `Contrato *` designs. A full historical dump was approximately 253 content files, but treat that as an observation rather than a correctness guarantee.

## Parse and seed a fresh environment

Review the target database and deploy its migration chain deliberately before seeding. Never use local customer extracts against an unintended environment.

```bash
node scripts/canva-catalog/fetch-contents.mjs
yarn catalogParse
yarn prismaSeed
```

The seed upserts `QuoteCatalogItem` by exact stable slug and imports clients. It has no legacy Prisma-product, alias, or fuzzy fallback. Review product names and prices before seeding; images are assigned later through Catalog administration.

## Normalize flat quotation products

Seeding does not consolidate existing duplicate flat rows. Normalization is a separate explicit workflow:

```bash
yarn catalogNormalizeExport
# An agent reads data/catalog-normalization/source.json and writes proposal.json.
yarn catalogNormalizeValidate
yarn catalogNormalizeApply --run <validated-run-id>
```

`validation.json` is not proof of apply. Duplication is removed from active selection only after the validated run reports `APPLIED`. See [`docs/catalog-normalization.md`](../../docs/catalog-normalization.md) for backup, proposal, correction, revert, and recovery procedures.

## Review checklist

- [ ] Confirm the command target is an intended fresh/disposable environment.
- [ ] Spot-check parsed product names against source quotations.
- [ ] Confirm or clear unit prices.
- [ ] Keep client PII and source dumps uncommitted.
- [ ] Assign images through `/admin/catalog` after seed.
- [ ] Back up and review every normalization proposal before apply.

## Notes

- Canva content API output is flat text only; field order is fragile and images are not included.
- Payment totals can differ from product-list totals and are not catalog fields.
- Static public marketing routes continue to use `app/data/products.ts`.
