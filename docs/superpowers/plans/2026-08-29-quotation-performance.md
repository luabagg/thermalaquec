# Quotation Performance & Save Semantics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` (or the closest equivalent in this runtime). Execute the tasks in order, keep scope bounded, and stop on the first red test that does not match the expected red/green step.

**Goal:** Make quotation editing, saving, image handling, and print readiness predictable under rapid user interaction and slower devices, without widening the app surface area.

**Architecture:**
- One atomic ownership-checked `saveQuotation` transaction owns all editor persistence: quotation meta, client fields, lines, and payment options.
- Normal save/autosave return JSON; save-and-print returns JSON with a redirect target, then the client performs exactly one navigation.
- The route loader fetches quotation + catalog in parallel and only selects the fields the editor actually needs.
- Client save handling uses a monotonic local revision/request token so stale responses cannot clear newer dirty state.
- Editor rows and preview rendering use memoized row components, stable keys, stable callbacks, deferred preview work, and cached formatters.
- Uploaded images are normalized through Sharp into immutable WebP derivatives with thumbnail fallback.
- Print readiness is one shared gate for manual print and autoprint: wait for images/fonts, bound the wait, show a preparing state, and continue on failure/timeout.

**Tech Stack:** Remix 2.17, React 18, Prisma 6, PostgreSQL, Sharp, Node 24. Add Vitest as the test runner because none exists yet; use the smallest extra dev deps needed for React/component tests only if a task requires them.

**Spec path:** `docs/superpowers/specs/2026-08-29-quotation-performance-design.md`

## Global Constraints

- Preserve current quotation URLs and draft/final semantics.
- Do **not** redesign pricing math, catalog UX, PDF generation, or add background jobs.
- Do **not** broaden loader revalidation outside the quotation routes.
- Keep save behavior strictly atomic; no partial save paths remain in the editor action.
- Preserve existing image URLs; thumbnail is additive and nullable.
- Use `thumbnail ?? location` fallback everywhere an image preview is rendered.
- Keep changes confined to quotation editing/saving/loading/image upload/print readiness.
- No unrelated refactors; prefer focused helpers and small extracted components only when they reduce overlap.

## Exact files / interfaces

| File | Planned responsibility |
|---|---|
| `package.json` | Add `test` script and any minimal test-related dev deps. |
| `vitest.config.ts` | New test config for Node-first unit tests; jsdom only where required. |
| `app/utils/quotation.ts` | Cache `Intl.NumberFormat` / formatter instances behind a pure helper; keep existing math helpers intact. |
| `app/utils/quotation.test.ts` | Unit coverage for formatter caching and any pure helper behavior added here. |
| `app/models/quotation.server.ts` | Add `saveQuotation` and a parallel editor loader helper; narrow catalog selects; keep ownership checks inside the transaction. |
| `app/routes/admin.quotations.$id.tsx` | Use JSON save flow, client revision tokens, `shouldRevalidate`, memoized callbacks, deferred preview, stable keys, and thumbnail fallback for editor preview. |
| `app/components/admin/QuotationDocument.tsx` | Use stable row keys from props instead of array indexes for preview/print lists. |
| `app/routes/admin.quotations.$id_.print.tsx` | Use the shared print-readiness gate and show a visible preparing state. |
| `app/utils/print-readiness.ts` | Shared wait helper for images/fonts with timeout + failure tolerance. |
| `app/models/image.server.ts` | Sharp normalization pipeline; reject GIF explicitly; return original + thumbnail URLs. |
| `app/libs/supabase/storage.server.ts` | Allow immutable cache-control on generated image uploads. |
| `app/routes/admin.uploads.tsx` | Pass through the new upload contract and return thumbnail data. |
| `app/routes/admin.catalog.tsx` | Render `thumbnail ?? location` for catalog previews. |
| `prisma/schema.prisma` | Add nullable `thumbnail` to `Image`. |
| `prisma/migrations/<timestamp>_image_thumbnail/` | Additive migration only. |

## Tasks

### Task 1 — Add test infrastructure + first pure helper coverage

**Files:** `package.json`, `vitest.config.ts`, `app/utils/quotation.ts`, `app/utils/quotation.test.ts`

**Interfaces:**
- `formatBRL(cents: number)` remains exported and becomes formatter-cached.
- Add a pure formatter helper if needed, but keep the public math API unchanged.

- [ ] Add Vitest scripts so tests can run locally and in CI (`test`, optionally `test:watch`).
- [ ] Add the minimum config needed for TypeScript path aliases and Node tests.
- [ ] Add unit tests that prove formatter caching and existing BRL formatting still behave identically.
- [ ] Keep this task pure: no route or Prisma changes yet.

**Red/green command:**
```bash
npm test
```
- **Red before:** fails because no test harness/script exists.
- **Green after:** runs the formatter suite and exits 0.

---

### Task 2 — Implement the atomic quotation save transaction + parallel editor loader helper

**Files:** `app/models/quotation.server.ts`

**Interfaces:**
- `type QuotationEditorSaveInput = { quotationId; ownerUserId; revision; intent; title; issuedAt; status; location; document; notes; lines; paymentOptions }`
- `type QuotationEditorSaveResult = { ok: true; quotationId: number; revision: number; redirectTo?: string } | { ok: false; status: number; error: string }`
- `async function saveQuotation(input: QuotationEditorSaveInput): Promise<QuotationEditorSaveResult>`
- `async function loadQuotationEditorData(ownerUserId: string, quotationId: number)` (or equivalent helper name) that fetches quotation and catalog in parallel with narrow selects.
- Narrow catalog select must include only editor-needed fields, including `Image.thumbnail`/`Image.location` if the editor needs them.

- [ ] Implement one ownership-checked `$transaction` that updates quotation meta, the owned client row, replaces lines, and replaces payment options in one shot.
- [ ] Return only the minimal save result; do not leak full Prisma records.
- [ ] Keep the client-facing revision/token echoed back so the route can ignore stale completions.
- [ ] Build the editor loader helper with `Promise.all` so quotation and catalog resolve concurrently.
- [ ] Use a narrow Prisma `select`/`include` shape, not `include: true`.

**Red/green command:**
```bash
npm test -- app/models/quotation.server.test.ts
```
- **Red before:** fails because the save helper/loader helper and coverage do not exist.
- **Green after:** atomic-save assertions pass, including no partial writes and parallel loader assumptions.

---

### Task 3 — Switch the editor route to JSON save/revision/revalidation semantics

**Files:** `app/routes/admin.quotations.$id.tsx`

**Interfaces:**
- Export `shouldRevalidate` for this route.
- Action returns JSON for save/autosave and only navigates once for save-and-print.
- Local state tracks a monotonic request revision/token.

- [ ] Replace the current multi-step action path with `saveQuotation`.
- [ ] Make normal save and autosave return JSON, not redirect.
- [ ] Make save-and-print return a JSON target (or equivalent) so the client performs one navigation only.
- [ ] Add `shouldRevalidate` so autosave/save JSON responses do not refetch the route loaders unnecessarily.
- [ ] Track an in-flight revision token and ignore stale save completions.
- [ ] Prevent overlapping save/autosave/upload for the same quotation state.
- [ ] Keep the current route URL and form semantics stable.

**Red/green command:**
```bash
npm test -- app/routes/admin.quotations.$id.test.tsx
```
- **Red before:** fails because the route still redirects / revalidates too broadly.
- **Green after:** save/autosave preserve editor state, stale responses are ignored, and save-and-print triggers one transition.

---

### Task 4 — Memoize editor rows, stable keys, and deferred preview work

**Files:** `app/routes/admin.quotations.$id.tsx`, `app/components/admin/QuotationDocument.tsx`, and if extraction is needed `app/components/admin/QuotationEditorRows.tsx`, `app/components/admin/QuotationPreview.tsx`

**Interfaces:**
- Editor row components are memoized (`React.memo` or equivalent).
- Row props carry stable keys (`clientKey` for editor state; never array index).
- Preview uses `useDeferredValue` instead of the fixed 120ms debounce.
- Formatter instances are reused via `useMemo` / shared cache.

- [ ] Extract only the minimal row components needed to stop unrelated rerenders.
- [ ] Convert editor callbacks to `useCallback` so memoized rows stay stable.
- [ ] Remove the artificial preview delay and replace it with deferred rendering.
- [ ] Change preview/document list keys to stable row keys instead of array indexes.
- [ ] Use `thumbnail ?? location` fallback in every editor/preview image render.
- [ ] Keep mobile preview hidden unless the user explicitly asks for it.

**Red/green command:**
```bash
npm test -- app/components/admin/quotation-editor.test.tsx
```
- **Red before:** fails because rows remount on edits and preview delay is still time-based.
- **Green after:** row renders remain stable, preview defers work, and no index-based keys remain in the editor preview path.

---

### Task 5 — Add the Sharp image pipeline, nullable thumbnail migration, and thumbnail fallback

**Files:** `app/models/image.server.ts`, `app/libs/supabase/storage.server.ts`, `app/routes/admin.uploads.tsx`, `app/routes/admin.catalog.tsx`, `app/routes/admin.quotations.$id.tsx`, `app/routes/admin.quotations.$id_.print.tsx`, `prisma/schema.prisma`, `prisma/migrations/<timestamp>_image_thumbnail/migration.sql`

**Interfaces:**
- `createImageFromUpload(file, folder)` now returns `{ id, location, thumbnail }` (or an equivalent shape with the same data).
- `putPublicObject(...)` accepts immutable cache-control for generated assets.
- `Image.thumbnail` is nullable in Prisma.

- [ ] Reject GIF uploads explicitly at the upload boundary.
- [ ] Convert uploads through Sharp into WebP derivatives for print/original and thumbnail outputs.
- [ ] Upload generated objects with one-year immutable caching.
- [ ] Add the nullable `thumbnail` column via additive migration only; do not backfill aggressively.
- [ ] Update catalog/editor/print image consumers to use `thumbnail ?? location`.
- [ ] Preserve existing image records and URLs.

**Red/green command:**
```bash
npm test -- app/models/image.server.test.ts
```
- **Red before:** fails because GIFs are still accepted and the thumbnail field does not exist.
- **Green after:** upload validation, dual-output generation, and thumbnail fallback all pass.

---

### Task 6 — Share a print-readiness gate for manual print and autoprint

**Files:** `app/utils/print-readiness.ts`, `app/routes/admin.quotations.$id_.print.tsx`

**Interfaces:**
- `waitForPrintReadiness(root: ParentNode | null, options?: { timeoutMs?: number }): Promise<{ timedOut: boolean }>` (or equivalent)
- One shared entry point handles both manual print and autoprint.

- [ ] Wait for image decode/load completion and fonts.
- [ ] Bound the wait with a timeout.
- [ ] Show a visible preparing state while the gate is running.
- [ ] Tolerate image failure and continue printing rather than blocking forever.
- [ ] Reuse the same helper for both button-triggered print and `autoprint=1`.

**Red/green command:**
```bash
npm test -- app/utils/print-readiness.test.ts
```
- **Red before:** fails because the gate is still unbounded and lacks timeout/failure tolerance.
- **Green after:** readiness resolves on success, timeout, and image error scenarios.

---

### Task 7 — Integration verification, regression sweep, and commit hygiene

**Files:** all files touched above; no new scope.

- [ ] Run the full typecheck, lint, build, and test suite.
- [ ] Confirm editor save/autosave does not refetch unrelated data.
- [ ] Confirm route print behavior still opens the correct URL and keeps the one-transition rule.
- [ ] Confirm all image previews use `thumbnail ?? location` with no broken fallbacks.
- [ ] Confirm no placeholder TODO/TBD text remains in the plan or code.
- [ ] Confirm only the intended files are staged before commit.

**Red/green commands:**
```bash
npm run typecheck
npm run lint
npm run build
npm test
```
- **Red before:** at least one command fails until all tasks are complete.
- **Green after:** all commands pass cleanly.

## Commit steps

- [ ] Stage **only** `docs/superpowers/plans/2026-08-29-quotation-performance.md`.
- [ ] Commit with a docs-only message, e.g. `docs: add quotation performance implementation plan`.
- [ ] Verify no unrelated files are staged.

## Self-review checklist

- [ ] No placeholders, TBDs, or ambiguous task names remain.
- [ ] Every task lists exact files and a concrete red/green command.
- [ ] Interfaces are consistent with Remix 2.17, React 18, and Prisma 6.
- [ ] Scope stays inside quotation editing, saving, image upload, and print readiness.
- [ ] Stable-key requirement is explicit and uses `clientKey` / non-index keys.
- [ ] Thumbnail fallback is explicit as `thumbnail ?? location`.
- [ ] Save-token behavior is explicit and does not require a new persisted revision column.
