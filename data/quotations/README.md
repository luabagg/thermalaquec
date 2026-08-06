# Quotation catalog (Phase 1)

Extracted from Canva folder **budgets** (`FAFOUXOmKmU`).

**Not committed.** Catalog JSON + `raw/` stay on disk only (see root `.gitignore`). Seed with `yarn prismaSeed` after regenerating locally.

## Files (local)

| Path | Purpose |
|------|---------|
| `raw/designs.json` | All design ids/titles in the folder |
| `raw/contents/{id}.txt` | Raw `get-design-content` dumps (sensitive) |
| `catalog.products.json` | Deduped quotation products |
| `catalog.clients.json` | Deduped clients (PII — do not push) |
| `catalog.meta.json` | Extraction metadata |

## Coverage

Full quote text dumps live in `raw/contents/`. Skip `Contrato *` designs (not orçamentos).

```bash
node scripts/canva-catalog/fetch-contents.mjs   # what's still missing
yarn catalogParse                              # rebuild products + clients
yarn prismaSeed                                # load into Supabase
```

After a full dump you should see ~253 content files (254 inventory − contrato(s)).

## Review checklist

- [ ] Spot-check product names vs Grupos de produtos
- [ ] Merge obvious aliases (Warma 100w / 110w, etc.) if desired
- [ ] Confirm or null unit prices
- [ ] Fill `imagePath` later via admin upload (Phase 2)

## Notes

- Canva content API returns flat text only — no images, fragile field order.
- Payment totals differ from list totals in Canva; not stored in catalog.
- Marketing site products (`app/data/products.ts`) stay separate.
