## Why

Teams adopting unentropy start with an empty history — every trend chart begins on day one. Users coming from SonarQube, Codacy, CodeClimate, or in-house dashboards have months or years of relevant metric data that becomes invisible at the moment they switch tools. The friction of "lose everything to migrate" blocks adoption.

This change introduces a way to seed an unentropy SQLite database with historical metric values from a documented canonical format, keeping the product surface minimal: external tooling and agent skills are responsible for producing that format and for moving the resulting database into remote storage.

## What Changes

- New CLI command `unentropy import <jsonl-file>` that reads a canonical JSONL stream and writes the resulting rows into a local SQLite database specified by `--output`. The same path the user passes to `unentropy preview --db` later.
- A documented **canonical import format** (JSONL) that is the contract for any data entering through this command. External dumpers, AI harnesses, and hand-edited files all target this format.
- Tiered commit-SHA resolution during import: prefer source-provided SHA, fall back to nearest-by-timestamp on a configurable trend branch (default `main`), otherwise skip with a warning.
- A `--dry-run` mode that validates the JSONL stream and reports what would be written without touching the database.
- A one-line update to the reporter's trend-chart query so that rows with `event_name='import'` are included alongside `event_name='push'`.

## Capabilities

### New Capabilities

- `metric-import`: canonical-format ingestion pipeline with commit-SHA resolution and a dry-run validator.

### Modified Capabilities

- `cli`: adds the `unentropy import` command.

## Impact

- **Code:** new modules under `src/cli/cmd/import.ts` and `src/collector/import/` (ingester + commit resolver). One small change to the reporter query.
- **Database:** no schema changes. Imported rows use the existing schema with `run_id = "import:<source>:<commit_sha>"` and `event_name = "import"`, which keeps the existing `UNIQUE(commit_sha, run_id)` constraint doing idempotency work for free.
- **Dependencies:** none beyond what is already in the project.
- **Out of scope for the product (handled separately):** publishing the resulting database to S3, GitHub Actions artifacts, or any other remote backend; converting data from specific tools like SonarQube into canonical JSONL. These are covered by agent skills and website documentation.

### Documentation Impact

- [ ] No user-facing doc changes
- [x] Contracts affect: README (brief note that import exists; full migration story lives on the website), CLI reference, and the canonical import format spec used by external dumpers and agent skills.

## Non-goals

- Publishing the resulting database to remote storage. The command writes a local SQLite file; moving it to S3 or artifact storage is the responsibility of agent skills wrapping the command.
- Built-in connectors for SonarQube, Codacy, or any other source. The canonical format is the contract; producing it is out of the product's scope.
- Live, incremental syncing from external sources. Importing is one-shot onboarding.
- Schema migrations or new columns. Imported rows ride on existing fields by convention.
- Modification of the source system. Import is read-only with respect to whatever produced the JSONL.
