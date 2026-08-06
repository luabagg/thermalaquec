# Admin setup — what's missing

Do this later when you want `/admin` to work locally. Public site does **not** need it.

## Current blocker

`.env` is missing in this worktree. Without it, `/admin` and `/admin/login` throw **500**:

`Your project's URL and Key are required to create a Supabase client!`

Auth code is already wired. Env values are not.

## Minimum to make login work

### 1. Create `.env`

```bash
yarn envPull
# or: cp .env-example .env
```

Required for auth:

| Variable | Where |
|---|---|
| `SUPABASE_URL` | Supabase → Project Settings → API |
| `SUPABASE_ANON_KEY` | same page (anon / public key) |

Optional later (Prisma / DB product CMS — not used by admin UI yet):

| Variable | Notes |
|---|---|
| `POSTGRES_PRISMA_URL` | Prisma `url`. Prefer Supabase **session** pooler (`:5432`) locally if transaction (`:6543`) fails with “Can't reach database server”. Vercel can keep transaction mode for serverless. |
| `POSTGRES_URL_NON_POOLING` | Prisma `directUrl` (migrate); session pooler or direct DB host |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only; not used by current admin routes |
| `SUPABASE_JWT_SECRET` | not used by current admin routes |

### 2. Restart dev server

```bash
# stop yarn dev, then:
yarn dev
```

### 3. Supabase Auth settings

In Supabase Dashboard → Authentication:

1. **Enable Email** provider (magic link / OTP).
2. **Redirect URLs** — allow local callback, e.g.:
   - `http://localhost:5173/admin/login/callback`
   - (add production URL too when deploying)
3. Add your admin email as a user (or allow signups if you want self-serve).

### 4. Smoke test

1. Open `/admin/login`
2. Submit email → check inbox for magic link
3. Link hits `/admin/login/callback` → redirects to `/admin`
4. Click **Sair** → `/admin/logout` → home

## What admin has today vs not

### Implemented

- `/admin/login` — email magic-link form (`signInWithOtp`)
- `/admin/login/callback` — exchanges `code` for session
- `/admin` — gated page (title + note + logout)
- `/admin/logout` — signs out, redirects home
- `noindex` meta on admin pages
- Production origin check on login action

### Not implemented yet

- Image upload for quotation line photos
- Role / allowlist beyond “any authenticated Supabase user”
- Marketing product CMS (Prisma `Product` — separate from quotation catalog)
- Server-side PDF library (print via browser Print → PDF)

## Quotation admin (Phase 2)

| Path | Role |
|---|---|
| `/admin` | Dashboard links |
| `/admin/quotations` | List orçamentos |
| `/admin/quotations/new` | Create (pick/create client) |
| `/admin/quotations/:id` | Interactive builder + live preview |
| `/admin/quotations/:id/print` | Printable A4 (browser Print → PDF) |
| `/admin/catalog` | Quotation catalog CRUD |
| `/admin/clients` | Quote clients CRUD |

### Database

Quotation models: `QuoteClient`, `QuoteCatalogItem`, `Quotation`, `QuotationLine`, `QuotationPaymentOption`.

```bash
# after .env has Postgres URLs:
yarn prismaMigrate   # or yarn prismaPush
yarn prismaSeed      # loads data/quotations/catalog.*.json
```

Catalog JSON lives in `data/quotations/` (from Canva Phase 1).

## Routes cheat sheet

| Path | Role |
|---|---|
| `/admin/login` | request magic link |
| `/admin/login/callback` | finish OAuth/OTP code exchange |
| `/admin` | dashboard (auth required) |
| `/admin/logout` | POST sign-out |
| `/admin/quotations` | orçamentos |
| `/admin/catalog` | catálogo |
| `/admin/clients` | clientes |

## Note on database

Login does **not** need your Prisma product tables. Supabase Auth has its own auth schema.

Prisma marketing models (`Product`, `Category`, `Brand`, …) remain for a future CMS step. Quotation models are separate and used by `/admin/quotations*`.

