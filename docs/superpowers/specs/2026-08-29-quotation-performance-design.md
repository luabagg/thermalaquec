# Quotation Performance & Save Semantics Design Spec

## Goal

Make quotation editing, saving, image handling, and print readiness predictable under rapid user interaction and slower devices, without widening the app surface area.

## Architecture

### 1) Single atomic quotation save path

Introduce one ownership-checked `saveQuotation` Prisma transaction as the only persistence path for quotation editor submits.

**Responsibilities inside one `$transaction`:**
- verify quotation ownership (`quotation.id + ownerUserId`)
- update quotation metadata
- update client fields tied to the quotation
- replace lines atomically
- replace payment options atomically
- return only a minimal save result

**Return shape:**
- `ok`
- `quotationId`
- `revision` or equivalent monotonic save token
- optional `redirectTo` for save-and-print

**Rule:** no partial saves, no multi-step “save meta then lines then payments” outside the transaction.

### 2) JSON save flow + scoped revalidation

Use JSON responses for normal save and autosave. The Remix route should use `shouldRevalidate` narrowly so unrelated loaders do not refetch on every autosave.

**Save modes:**
- normal save → JSON success, client remains on editor
- save-and-print → JSON success with target print URL, then one client navigation
- autosave → JSON success only

**Navigation rule:** save-and-print must not cause a redirect plus a second client navigation; it should be exactly one transition after the server response.

### 3) Client revision safety and concurrency guards

Track a local edit revision / request token so stale server responses cannot clear newer dirty state.

**Concurrency rules:**
- do not overlap save, autosave, and upload for the same quotation state
- ignore stale completion events
- only clear dirty state when the response matches the current in-flight revision
- uploads remain independent per line, but must not overwrite newer line edits

### 4) Rendering performance for line/payment editors

Optimize editor rendering for frequent typing and list edits.

**Required tactics:**
- memoize line rows and payment rows
- keep row keys stable (`clientKey`, not array index)
- keep callbacks stable with `useCallback`
- replace the artificial `120ms` preview delay with `useDeferredValue`
- render mobile preview only when the user explicitly asks for it
- cache `Intl.NumberFormat` / formatter instances with `useMemo`

### 5) Concurrent loader strategy

Load quotation data and catalog data concurrently.

**Loader rule:**
- `quotation` and `catalog` should be fetched in parallel
- catalog query must use a narrow `select` with only fields needed by the editor add-from-catalog flow

### 6) Sharp image pipeline

Normalize all uploaded quotation/catalog images through Sharp.

**Output contract:**
- print asset: max `1600x1600`, WebP
- thumbnail asset: max `320x320`, WebP
- reject GIF uploads explicitly
- one-year immutable caching on generated image objects

**DB contract:**
- add nullable thumbnail field in the image table via migration
- existing rows remain valid
- UI must use `thumbnail ?? originalUrl` fallback

### 7) Unified print readiness

Manual print and autoprint must share one readiness gate.

**Readiness gate:**
- wait for image decode / load completion
- wait for fonts
- bound the wait with a timeout
- show a visible “preparing” state while waiting
- tolerate image failure and continue to print rather than blocking forever

### 8) Regression testing strategy

Add Vitest-focused regression coverage for:
- atomic save behavior
- stale response / dirty-state guards
- preview memoization helpers and formatter caching
- loader select shape and parallelization assumptions
- Sharp upload validation and fallback behavior
- print readiness timeout + failure tolerance

Also keep `typecheck`, `lint`, and `build` as required validation commands.

## Data Flow

### Editor save path
1. User edits title, client, lines, or payments.
2. Client state marks the form dirty and assigns a revision/token.
3. Save/autosave submits JSON.
4. Server validates ownership and performs one atomic transaction.
5. Client applies the response only if the revision matches the current in-flight save.
6. Save-and-print returns a print target; client navigates once.

### Load path
1. Route loader starts quotation and catalog fetches together.
2. Catalog payload contains only what the editor needs.
3. Client renders editor and preview from memoized derived state.

### Image path
1. Upload accepts an image file.
2. Server rejects GIF and oversize/invalid payloads.
3. Sharp generates print + thumbnail WebP derivatives.
4. DB stores the thumbnail URL when available.
5. UI falls back to the original URL if thumbnail is missing.

### Print path
1. User clicks print or autoprint starts.
2. Client enters a preparing state.
3. Shared readiness helper waits for images and fonts up to timeout.
4. Print proceeds even if a non-critical image fails.

## Error Handling

- Ownership failure → `404` or not-found JSON, no mutation.
- Validation failure → `400` JSON with field-safe messages.
- Stale response → ignored, no dirty-state reset.
- Overlapping operation → queued/blocked by client guards.
- Image decode/load failure → logged and tolerated during print readiness.
- Print readiness timeout → proceed and surface a visible warning state if needed.

## Compatibility / Migration

- Add the thumbnail column with a nullable migration; do not backfill existing rows aggressively.
- Existing image URLs must continue to work.
- Legacy records without thumbnails must render via original URL fallback.
- Keep current route URLs stable.
- Preserve current draft/final quotation semantics.

## Explicit Non-Goals

- No redesign of quotation business rules or pricing math.
- No new queue/background job system.
- No full PDF generation rewrite.
- No catalog UX expansion beyond the editor add-from-catalog path.
- No GIF support.
- No broad Remix loader revalidation changes outside the quotation routes.

## Success Criteria

- A save cannot partially persist metadata, client, lines, or payments.
- Autosave and save-and-print do not cause stale UI rollback.
- Rapid typing stays responsive on mobile.
- Preview work is deferred, not artificially delayed.
- Image uploads are normalized and cacheable.
- Printing no longer waits forever on slow or broken assets.
- Vitest regression tests cover the fragile paths.
- `typecheck`, `lint`, and `build` pass.

## Self-Review

- **Placeholders:** none.
- **Contradictions:** none found.
- **Ambiguity:** thumbnail fallback resolved as `thumbnail ?? originalUrl`.
- **Scope check:** limited to quotation editing, saving, loading, image upload, and print readiness; no unrelated file changes are implied.
