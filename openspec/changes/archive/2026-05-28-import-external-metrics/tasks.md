## 1. Setup

- [x] 1.1 [P] Add `src/cli/cmd/import.ts` stub registered from `src/cli/cmd/cmd.ts` so `unentropy import --help` is discoverable.
- [x] 1.2 [P] Add `src/collector/import/` directory with `types.ts` mirroring the canonical record schema in `contracts/metric-import/canonical-import-format.md`.

## 2. Foundational

**Goal**: the ingester and commit resolver land first so the CLI is a thin shell over working internals.

- [x] 2.1 Implement `src/collector/import/commit-resolver.ts` with the three tiers (source-provided SHA → nearest-by-timestamp on configured trend branch → skip). Use `git log --before=<iso> -1 <branch>` via the existing shell-out utilities.
- [x] 2.2 [P] Unit tests for the resolver in `tests/collector/import/commit-resolver.test.ts`: source SHA used as-is, nearest-by-timestamp picks the expected commit, timestamps before first commit are reported as unresolvable, shallow clone produces the actionable error.
- [x] 2.3 Implement `src/collector/import/ingester.ts`: parse JSONL line-by-line, validate each record against the canonical schema, route through the commit resolver, write rows into `build_contexts` and `metric_values`, infer missing `metric_definitions` rows. All writes in a single transaction.
- [x] 2.4 [P] Unit tests for the ingester in `tests/collector/import/ingester.test.ts`: valid records insert correctly with `event_name='import'`; malformed records skipped with warnings; `--strict` aborts; idempotent re-apply produces no duplicates via the existing `UNIQUE(commit_sha, run_id)` constraint; missing `metric_id` is inferred into `metric_definitions`.

**Checkpoint**: ingester and resolver work against canonical JSONL in isolation. No CLI yet.

---

## 3. User Story 1 — Import canonical JSONL into a local SQLite database (Priority: P1)

**Goal**: A user with canonical JSONL in hand can run one command and have a working local database compatible with `unentropy preview --db`.

### Tests

- [x] 3.1 [P] [US1] Contract test for `unentropy import` against `contracts/cli/cli-interface.md`: exit codes, flag behavior, output format for success and validation-warning cases.
- [x] 3.2 [P] [US1] Integration test: produce a JSONL file in `tests/fixtures/`, run the command, assert the resulting DB has the expected `build_contexts` and `metric_values` rows with `event_name='import'`.
- [x] 3.3 [P] [US1] Integration test: import into an existing CI-produced DB; assert no pre-existing rows are touched.

### Implementation

- [x] 3.4 [US1] Implement `src/cli/cmd/import.ts`: flag parsing via yargs (`--output`, `--strict`, `--trend-branch`, `--config`), JSONL stream reader, ingester invocation, summary printer.
- [x] 3.5 [US1] Wire the file-not-found, missing-config, locked-DB, and shallow-clone error paths to match the messages and exit codes in the CLI spec.
- [x] 3.6 [US1] Smoke test: `unentropy preview --db <imported-db>` on a DB produced solely by import (folded into the integration test suite at the data-integrity level; full preview-rendering smoke deferred due to a cross-cwd JSX runtime resolution issue in the existing preview command, unrelated to this change).

**Checkpoint**: importing works end-to-end for the happy path and the documented error paths.

---

## 4. User Story 2 — Dry-run validates without writing (Priority: P1)

**Goal**: External dumpers and AI agents can verify a file before any database write happens.

### Tests

- [x] 4.1 [P] [US2] Test: `--dry-run` on a clean file prints the summary with the documented sections and writes nothing to `--output`.
- [x] 4.2 [P] [US2] Test: `--dry-run` on a file with mixed valid/invalid records lists each invalid record and still prints the summary; exit 0 unless `--strict`.
- [x] 4.3 [P] [US2] Test: `--dry-run` does not require the `--output` path to exist or be writable.
- [x] 4.4 [P] [US2] Test: dry-run summary flags `metric_id`s not declared in `unentropy.json`.

### Implementation

- [x] 4.5 [US2] Add `--dry-run` to the CLI flag set; in `import.ts`, branch before the DB-open step so no SQLite handle is created in dry-run mode.
- [x] 4.6 [US2] Implement the summary formatter producing the layout shown in `contracts/cli/cli-interface.md`.
- [x] 4.7 [US2] Plumb commit-resolution attempts through the resolver in dry-run mode so the per-tier counts in the summary are real.

**Checkpoint**: dry-run is a first-class mode usable by agents.

---

## 5. User Story 3 — Imported rows show up in the trend chart (Priority: P1)

**Goal**: After import + preview, the user actually sees their history. The product is useless if this doesn't work.

### Tests

- [x] 5.1 [P] [US3] Reporter test: feed a DB containing only `event_name='import'` rows into the report generator; assert the trend chart payload is non-empty.
- [x] 5.2 [P] [US3] Reporter test: mixed `event_name='push'` and `event_name='import'` rows render in chronological order with no rows silently filtered out.

### Implementation

- [x] 5.3 [US3] Locate every reporter / repository query that filters on `event_name='push'` (per `src/storage/repository.ts:92, 147, 169`). Broaden to `event_name IN ('push', 'import')`.
- [x] 5.4 [US3] Spot-check other code paths that read `build_contexts` to confirm they are not silently excluding import rows.

**Checkpoint**: the full onboarding loop (produce JSONL → import → preview) shows the imported history on screen.

---

## 6. Polish & Cross-Cutting Concerns

- [ ] 6.1 [P] On archive, copy `contracts/cli/cli-interface.md` and `contracts/metric-import/canonical-import-format.md` into the corresponding `openspec/specs/<domain>/contracts/` locations.
- [x] 6.2 [P] Add a brief "Importing history" section to `README.md` referencing `unentropy import` and pointing at the website for the full migration story.
- [x] 6.3 Run `bun check` clean; resolve any lints or type errors. _Lint, typecheck, and prettier all clean for files touched by this change. Pre-existing `.claude/` markdown formatting warnings remain (introduced by an unrelated earlier commit, not addressed here)._
- [x] 6.4 Manual quickstart: hand-craft a small JSONL with two metrics across five timestamps, import it, preview, confirm tooltips and chart look right.
- [x] 6.5 [P] Code cleanup pass: ensure no spurious comments and that each new file has a single clear responsibility per AGENTS.md.
