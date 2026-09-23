# Local quotation extraction data

Extracted from Canva folder **budgets** (`FAFOUXOmKmU`).

**Do not commit generated files.** Catalog JSON, client data, and `raw/` stay local through the root `.gitignore`. Marketing products in `app/data/products.ts` are separate and are not generated from these files.

## Local files

| Path | Purpose |
| --- | --- |
| `raw/designs.json` | Canva design IDs and titles in the folder. |
| `raw/contents/{id}.txt` | Raw `get-design-content` dumps. Sensitive. |
| `catalog.products.json` | Parsed flat quotation-catalog products. |
| `catalog.clients.json` | Parsed clients. Contains personal data. |
| `catalog.meta.json` | Extraction metadata. |

Skip `Contrato *` designs.

## From Canva to the catalog

```bash
node scripts/canva-catalog/fetch-contents.mjs
yarn catalogParse
```

The committed catalog source is `data/catalog/products.json`. To rebuild the catalog from it, follow "Catalog import" in [`docs/database.md`](../../docs/database.md).

Clients are not imported. Register them in `/admin/clients`.

## Notes

- Canva content API output is flat text only. Field order is fragile and images are not included.
- Payment totals can differ from product-list totals and are not catalog fields.
