## Context

Unentropy treats SQLite as the source of truth for metric history, and every row in `build_contexts` today is the product of a CI run that observed a specific commit. New users arriving from SonarQube, Codacy, or in-house dashboards bring history that was never produced by a unentropy CI run — it's evidence of past state collected elsewhere. The current architecture has no way to ingest that evidence, so onboarding always starts from an empty chart.

This change introduces a small product surface that closes that gap: a single `unentropy import` command that reads a documented canonical JSONL format and writes the corresponding rows into a local SQLite database. The hard work of producing the JSONL (talking to SonarQube, Codacy, or any other source) and the chore of moving the resulting database into remote storage (S3, GitHub Actions artifacts) both live outside the product — handled by external dumpers and agent skills. That separation is deliberate: it preserves the project's "no servers, no external storage" promise without burdening the product with source APIs or backend-specific publish ceremonies.

The brainstorming process explored several axes (motivation, execution surface, connector model, commit mapping, schema delta, publish strategies) and progressively narrowed the product scope through a sequence of YAGNI decisions: no schema migration, no built-in connectors, no publish step, no example dumper inside the product. What ships is the smallest piece that genuinely belongs inside unentropy.

## Goals / Non-Goals

**Goals**

- Provide a single command that turns canonical JSONL into a local SQLite database compatible with `unentropy preview --db` and with subsequent CI runs.
- Document the canonical JSONL format precisely enough that external dumpers and AI harnesses can produce it correctly without reading our source code.
- Provide a `--dry-run` mode that validates a JSONL file end-to-end without touching the database, so external tooling and agents can verify before they commit to a write.
- Resolve `commit_sha` sensibly (source-provided, then nearest-by-timestamp, then skip) without inventing synthetic SHAs that would leak into the UI.
- Keep the schema unchanged.

**Non-Goals**

- Publishing the resulting database to S3, GitHub Actions artifacts, or any other remote backend. Handled by agent skills.
- Built-in connectors for SonarQube or any other source.
- Live, incremental syncing.
- Schema migrations or new columns.
- Modification of the source system.
- Bundled example dumpers inside the product.

## Decisions

### D1. Canonical JSONL is the single ingestion entry point.

Every record that enters via the import pipeline goes through a documented JSONL schema (see `contracts/metric-import/canonical-import-format.md`). The ingester is the only thing that writes import rows to SQLite.

**Why this over hardcoded source-specific ingesters**: it collapses the matrix of `sources × write-paths` into a single write path with `sources` worth of pure transformers hanging off it — and we own none of those transformers. New sources never need product code.

**Why JSONL over CSV or YAML**: JSONL streams cleanly, supports nested `metadata`, is what LLMs produce by default, and is what every command-line tool can pipe.

Alternatives considered:

- _Per-source ingesters inside the product_: rejected — couples the product to source APIs.
- _Plugin SDK_: rejected (for now) — premature given current adoption.

### D2. No schema migration; imported rows ride on existing columns by convention.

The existing `build_contexts` table accepts imported rows as-is. Convention:

- `event_name = "import"`
- `run_id` defaults to `import:<source>:<commit_sha>`; the JSONL record can override it for sources with multiple measurements per commit.
- `run_number` defaults to `0`.
- All other fields populated from the JSONL record.

**Why this over adding `origin` and `source` columns**: no current feature would consume those columns. Reports filter by `event_name`; the quality gate selects by timestamp on a branch; nothing case-splits on origin. Adding columns now would carry meaning that nothing reads. If a future feature genuinely needs to discriminate, the information is recoverable from the `run_id` prefix or `event_name='import'`, and the migration can ship then.

**Why `event_name='import'` over `event_name='push'`**: setting it to `'push'` would make imports appear in trends with zero code changes, but it would be a small semantic lie that closes off any future "exclude imports from X" feature. Choosing `'import'` costs us one line in the reporter query (`event_name IN ('push', 'import')`) and preserves separability for free.

Alternatives considered:

- _New `origin`/`source` columns_: rejected per YAGNI — nothing consumes them.
- _`event_name = "push"`, no reporter change_: rejected — loses easy separability for negligible savings.

### D3. Local-only operation; remote storage is someone else's problem.

The command writes to `--output <path>` and stops there. No upload, no commit, no GitHub API. Moving the database to S3 or to a GitHub Actions artifact lives in agent skills wrapping this command.

**Why this over bundling publish**: the publish step is backend-specific (especially the disposable-PR ceremony for the artifact backend) and is itself easier to orchestrate from an agent than from a CLI. Pulling it out leaves the product surface small and the agent-skill story coherent.

Alternatives considered:

- _Bundle publish in the CLI_: rejected — moves orchestration into a place where it doesn't fit.
- _Require S3 to use import_: rejected — breaks the artifact-backend promise of "no external storage required."

### D4. Commit SHA resolution is tiered, with skip rather than synthesize.

For each imported record: prefer the JSONL record's `commit_sha`; else nearest-by-timestamp on the trend branch; else skip with a warning. Shallow clones produce an actionable error before any DB writes happen.

**Why never synthesize**: a synthetic SHA inevitably ends up rendered in the UI (the reporter prints a 7-char truncation in tooltips). A skipped row with a warning is easier to explain and easier to recover from (re-run with full history).

**Why nearest-by-timestamp on a configurable branch**: external sources typically attach analyses to the integration branch, so nearest-on-main is usually correct. `--trend-branch` covers repos that use `develop`, `trunk`, etc.

### D5. The ingester infers `metric_definitions` if missing.

If a record references a `metric_id` that has no `metric_definitions` row, the ingester creates one with type inferred from `value_numeric` vs `value_label`. `unit` and `description` stay NULL until the user declares the metric in `unentropy.json`.

**Why this over "every metric must be pre-declared"**: requiring pre-declaration would make imports feel hostile. Inference makes the first-time path frictionless; users tune labels and units when they care.

### D6. `--dry-run` is a first-class mode, not a debug flag.

Dry-run runs the full pipeline up to the write boundary and emits a structured summary (record count, validation results, per-tier commit resolution counts, metric ids encountered with declared/undeclared markers, date range). It's the primary verification surface for external dumpers and AI harnesses.

**Why this over just "run it and see"**: with the dumper now external to the product, an upstream bug can produce a corrupt JSONL file. Dry-run lets an agent or human catch it before the file lands in a database the user cares about. The dry-run summary on stdout is plain text formatted for diff and grep so it composes with shell tooling.

## Risks / Trade-offs

- **Importing a metric the user later changes the type of (numeric ↔ label)** → existing imported rows for that metric stay valid but reports will show heterogeneous data. Mitigation: `unentropy verify` can learn to flag mixed-type history later; not in this change.
- **A user's repo lacks the history depth needed for nearest-commit resolution** → bulk of imports would be skipped. Mitigation: actionable error at the top of the run, not per-row noise; doc note in CLI help about `fetch-depth: 0` in CI and `git fetch --unshallow` locally.
- **Two dumpers picking the same `run_id` for the same `commit_sha`** → conflicting records collide on the unique constraint. Mitigation: the default `run_id = "import:<source>:<commit_sha>"` includes the source, so well-behaved dumpers don't collide. Custom `run_id`s in the JSONL are an opt-in for callers that know what they're doing.
- **Quality gate evaluates against imported baseline if the most recent value is an import** → could produce a one-time noisy verdict immediately after import. Mitigation: out of scope for this change; if it becomes a real complaint, add an `event_name`-aware baseline selector in a follow-up. Importantly, the JSONL record already encodes the information needed for any future filter.
- **Reporter query change is the only place imports become visible** → if we forget to update it, the import works silently but charts stay empty. Mitigation: include a test in the change that ingests an import-only DB and asserts the trend chart payload is non-empty.

## Contracts Referenced

- `contracts/cli/cli-interface.md` — the `unentropy import` command shape.
- `contracts/metric-import/canonical-import-format.md` — the authoritative JSONL record schema.

## File Changes

**New**

- `src/cli/cmd/import.ts` — the `unentropy import` command. Parses flags, opens the target DB (unless `--dry-run`), streams the JSONL through the ingester, prints the summary.
- `src/collector/import/ingester.ts` — canonical-format validator and SQLite writer. The single write path for imports.
- `src/collector/import/commit-resolver.ts` — tiered SHA resolution (source SHA → nearest-by-timestamp → skip), plus the shallow-clone error path.
- `src/collector/import/types.ts` — TypeScript types for the canonical record, mirrored from the JSON schema.
- `tests/cli/import.test.ts` — CLI contract tests (flags, exit codes, output format).
- `tests/collector/import/ingester.test.ts` — ingester unit tests.
- `tests/collector/import/commit-resolver.test.ts` — resolver unit tests.
- `tests/collector/import/dry-run.test.ts` — dry-run summary tests.
- `tests/reporter/import-rows-in-trends.test.ts` — reporter integration test asserting `event_name='import'` rows are included.

**Modified**

- `src/cli/cmd/cmd.ts` — register the `import` command.
- `src/reporter/<query>.ts` — broaden the `event_name='push'` filter to `event_name IN ('push', 'import')` in the trend-chart query. One-line change. Exact file determined during implementation (likely `src/storage/repository.ts:92` and similar lines).
- `README.md` — short note pointing at the import command; full migration story lives on the website.
