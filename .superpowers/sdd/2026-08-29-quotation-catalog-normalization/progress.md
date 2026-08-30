# SDD ledger — plan: docs/superpowers/plans/2026-08-29-quotation-catalog-normalization.md

Workspace: /home/luabagg/development/dump/thermalaquec/.worktrees/catalog-normalization
Branch: feature/catalog-normalization
Merge base: cf432b1
Spec: docs/superpowers/specs/2026-08-29-quotation-catalog-normalization-design.md
Baseline: yarn test — 8 files, 22 tests passed

## Pre-flight task consistency

| Task | Internal agreement | Finding / ruling |
|---|---|---|
| 1 | Tests and resolver interfaces agree | Clean. |
| 2 | Proposal tests and pure validator interfaces agree | Clean. |
| 3 | Additive Prisma models match Tasks 1–2 contracts | Clean; generated Supabase types may require reachable configured project. |
| 4 | Model tests target the listed aggregate APIs | Clean; catalog code moves to catalog.server.ts and quotation.server.ts may temporarily re-export only. |
| 5 | Export/validation tests match digest-bound run API | Clean. |
| 6 | Apply/revert tests match immutable source-map ledger | Ruling: `assertCurrentSourceDigest` must rebuild the current source snapshot from recorded source rows before comparing the digest — stored JSON compared to itself would not detect drift — cost if wrong: stale rows could be normalized. |
| 7 | Routes consume Tasks 1, 4, and 6 | Clean. |
| 8 | Resolve route, signed token, and save tests agree | Ruling: existing line snapshots come only from DB; new resolved snapshots come only from verified tokens; raw hidden JSON is never authoritative — cost if wrong: historical provenance could be client-tampered. |
| 9 | Picker consumes Task 8 GET/POST route and compact summaries | Clean. |
| 10 | Preflight tests and empty-table-only migration agree | Ruling: implement and test destructive guards only; never run acknowledged deletion or the drop migration against the configured non-test database in this workflow — cost if wrong: legacy production data destruction. |
| 11 | Runbook and acceptance steps cover Tasks 1–10 | Ruling: database migration rehearsal requires an explicit disposable TEST_DATABASE_URL; absence is recorded as residual validation, never substituted with the configured database — cost if wrong: production could be used as a fixture. |

## Shared files and interfaces

| Tasks | Shared seam | Producer → consumer check |
|---|---|---|
| 3 → 10 | prisma/schema.prisma | Task 3 adds normalized catalog; Task 10 removes only legacy models and obsolete Image relations. Compatible. |
| 3 → 10 | app/libs/supabase/database.types.ts | Task 3 regenerates additive types; Task 10 regenerates after legacy removal. Sequential and compatible. |
| 4 → 8 | app/models/quotation.server.ts | Task 4 extracts catalog APIs; Task 8 extends quotation snapshot persistence. Compatible if temporary re-exports are removed only after call sites move. |
| 4 → 9 | app/models/catalog.server.ts and test | Task 4 establishes summary/detail APIs; Task 9 narrows picker summaries and extends tests. Compatible. |
| 5 → 6 | app/models/catalog-normalization.server.ts and test | Task 5 creates export/validate; Task 6 extends the same service with apply/revert. Compatible. |
| 5 → 6 → 10 | package.json | Each task adds distinct scripts; preserve all prior scripts and dependency changes. |
| 8 → 9 | quotation route and test | Task 8 adds trusted resolve/snapshot seam; Task 9 replaces picker UI while preserving persistence. Compatible. |
| 1 → 4,7,8 | resolver types/functions | Plain serializable contract is consumed by model, editor preview, and resolve route; no Prisma leakage. Compatible. |
| 2 → 3,5,6 | normalization contract | Schema names, source digest, proposal types, and dispositions remain authoritative across persistence and CLIs. Compatible. |
| 4,6 → 7 | model APIs | Catalog lifecycle and normalization eligibility feed admin routes; Portuguese errors are route-level translations. Compatible. |
| 8 → 9 | GET/POST /admin/catalog/:id/resolve | GET supplies ordered detail; POST supplies signed resolved draft. Compatible. |
| 1–10 → 11 | commands and user flows | Runbook must use exact implemented command names and state residual TEST_DATABASE_URL validation honestly. |

## Progress

Task 1: complete (commits cf432b1..12ae510, review clean)
- Controller resolved reviewer cannot-verify: implementer report contains RED failure, GREEN 7/7, typecheck, full-suite 29/29, and diff-check evidence; worktree handoff was clean.

Task 2: fix round 1/5 (2 addressed, 0 open — runtime disposition allowlist and regression coverage; commits 760c5e4..eed5e90)
Task 2: complete (commits 12ae510..eed5e90, review clean)

Task 3: Ruling: defer Supabase generated types to Task 10 — the binding spec requires regeneration after legacy removal, the current generated file already predates the quotation tables, no normalized-catalog code consumes Supabase Database table types, and neither CLI nor a migrated source is available; hand-authoring generated output is forbidden — cost if wrong: browser-side Database typings remain stale until Task 10 and could miss a future consumer.
Task 3: minor (deferred): preserve the legacy quote_catalog_items(name) index declaration in Prisma or intentionally drop it in a later migration; final review must triage schema/index parity.
Task 3: complete (commits eed5e90..05ba90e, 1 ruled external-generation deferral, 1 deferred minor)
- Controller resolved reviewer cannot-verify from the report: Prisma validate/generate, typecheck, 36 tests, and diff-check passed with inert placeholder datasource URLs; no database command ran.

Task 4: fix round 1/5 (7 addressed, 0 open — retained-option deletion, rollback safety, explicit provenance, full detail, placement validation, truthful counts, ordering tests; commits 8e25d81..4a32976)
Task 4: complete (commits 05ba90e..4a32976, review clean)

Task 5: minor (deferred): make VALIDATED-run reuse status-aware when Task 6 introduces APPLIED/REVERTED states.
Task 5: minor (deferred): preserve privacy-safe CLI errors while adding operator-debug detail/run logging in Task 6 or runbook.
Task 5: minor (deferred): add select/orderBy, P2002 retry, and CLI path coverage if Task 6 touches these seams.
Task 5: complete (commits 4a32976..f180c08, review clean)
- Controller resolved cannot-verify from report: focused 12, full 50, typecheck, lint, and missing-input CLI behavior passed; valid DB recording intentionally not run.

Task 6: Ruling: preserve @@unique([sourceSnapshotDigest, algorithmVersion]); validation reuses the existing run/status, APPLIED and REVERTED return recorded results idempotently, and FAILED/REVERTED cannot be re-applied without a new algorithmVersion — cost if wrong: operators must deliberately version a retry instead of reusing the same run.
Task 6: fix round 1/5 (4 addressed, 0 open — deleted-line revert safety, transactional alias removal, remap payload proof, FAILED-run documentation; commits bd69ff2..07cfdba)
Task 6: minor (deferred): seed.js duplicates the TypeScript alias normalizer; runbook/final review must call out synchronization risk.
Task 6: minor (deferred): PostgreSQL serializable transaction behavior and DateTime restore coercion remain unverified without an explicit disposable TEST_DATABASE_URL.
Task 6: complete (commits f180c08..07cfdba, review clean)


## Task 7 completion report

- Completed the searchable lifecycle list, aggregate family editor, resolver preview, destructive correction confirmation, provenance/revert links, and normalization detail.
- Normalization detail now loads and renders the persisted run status/result/timestamps together with safe-revert eligibility counts; unsafe revert remains HTTP 409 with actionable Portuguese counts.
- Coverage: catalog list/editor routes and normalization detail/action tests.

## Task 8 completion report

- Added authenticated active-family GET/POST resolution, strict positive-integer request parsing, malformed-JSON handling, canonical two-part HMAC tokens, bounded future clock skew, and seven-day expiration.
- Quotation picker lazily loads family options, resolves simple/configurable selections on the server, and retains the signed token on each new draft line. Archived families are excluded from summaries.
- Quotation saves validate all existing/server-owned or new/token-backed snapshots before mutating client, header, lines, or payments; invalid selections cannot partially commit. Removed unused flat-catalog compatibility APIs.
- Coverage: token integrity, resolve authentication/detail/error behavior, strict parsing, active-only catalog loading, trusted snapshot persistence/rejection, route token forwarding, and normalization summary.
