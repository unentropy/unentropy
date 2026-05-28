# metric-import Specification

## Purpose
Define unentropy's metric import pipeline: how external historical metric data enters a local SQLite database via a documented canonical JSONL format. The capability covers only the ingestion side — validation, commit-SHA resolution, and dry-run reporting. Producing the JSONL (from SonarQube or any other source) and moving the resulting database into remote storage are out of scope and handled by external tooling.

## Requirements
### Requirement: Canonical Import Format Ingestion

The system SHALL accept a canonical JSONL stream where each line describes one historical metric measurement and insert the corresponding rows into a SQLite database. The system SHALL treat this stream as the single entry point for any imported data; no other ingestion path exists.

#### Scenario: Apply a canonical JSONL file to a new database

- **GIVEN** a JSONL file with valid measurement records and a target database path that does not yet exist
- **WHEN** the user runs the import command pointing at the file and target
- **THEN** the system creates the database with the current schema, inserts each record as a `build_contexts` row with `event_name='import'` and a deterministic `run_id` (default `import:<source>:<commit_sha>`), and inserts the metric values

#### Scenario: Apply to an existing database

- **GIVEN** an existing SQLite database (e.g., one already populated by CI runs) and a JSONL file
- **WHEN** the user runs the import command with `--output` pointing at it
- **THEN** the records are inserted alongside existing rows; nothing pre-existing is modified

#### Scenario: Malformed JSONL record

- **GIVEN** a JSONL file where one line is missing a required field
- **WHEN** the user runs the import command without `--strict`
- **THEN** the system reports the file, line number, and reason; skips that record; and continues with the remaining lines

#### Scenario: Strict validation aborts on first error

- **GIVEN** the user passes `--strict` and a JSONL file with at least one invalid record
- **WHEN** the import command runs
- **THEN** the system reports the failure and aborts without writing any records from that file

#### Scenario: Re-running the same file is idempotent

- **GIVEN** a JSONL file that has already been applied to a database
- **WHEN** the user runs the import command again with the same file and target
- **THEN** no duplicate `build_contexts` or `metric_values` rows are created; records sharing `(commit_sha, run_id)` with existing rows are skipped, enforced by the existing unique constraint

#### Scenario: Inferred metric definition

- **GIVEN** a JSONL record whose `metric_id` does not yet exist in `metric_definitions`
- **WHEN** the system ingests the record
- **THEN** the system creates the `metric_definitions` row, inferring `type` as `'numeric'` if `value_numeric` is set or `'label'` otherwise; `unit` and `description` remain NULL until the user defines the metric in `unentropy.json`

---

### Requirement: Commit SHA Resolution for Imported Rows

The system SHALL resolve a `commit_sha` for every imported row using a documented tiered strategy and SHALL skip rows for which no commit can be resolved.

#### Scenario: Source-provided revision is used directly

- **GIVEN** a JSONL record whose `commit_sha` is set and is 40 hex characters
- **WHEN** the system ingests the record
- **THEN** the row is stored with that exact `commit_sha`, regardless of whether it is currently reachable in the local repository

#### Scenario: Fall back to nearest commit by timestamp

- **GIVEN** a JSONL record with no `commit_sha` but a `timestamp`, and the import is configured with a trend branch (default `main`)
- **WHEN** the system ingests the record
- **THEN** the system finds the most recent commit on the configured branch with author date at or before the timestamp and uses that SHA

#### Scenario: Unresolvable commit is skipped with a warning

- **GIVEN** a JSONL record whose timestamp predates the repository's first commit on the trend branch
- **WHEN** the system ingests the record
- **THEN** the system emits a warning identifying the record and skips it; the command exits successfully unless `--strict` is set

#### Scenario: Shallow clone produces an actionable error

- **GIVEN** the local repository was cloned without full history
- **WHEN** the system needs nearest-commit resolution for any record
- **THEN** the system emits a single error explaining that full history is required (`git fetch --unshallow` locally, `fetch-depth: 0` in CI) and aborts before writing any records

---

### Requirement: Dry-Run Validation

The system SHALL provide a `--dry-run` mode that performs the full validation and commit-resolution pipeline but skips all database writes, and SHALL emit a summary suitable for both human reading and machine parsing.

#### Scenario: Dry-run on a clean file

- **GIVEN** a JSONL file with all valid records
- **WHEN** the user runs the import command with `--dry-run`
- **THEN** the system reports the total record count, distinct `metric_id`s encountered (flagging any not declared in `unentropy.json`), date range, per-source counts, and per-tier commit-resolution counts (source-provided, nearest-by-timestamp, skipped) — and writes nothing to the database

#### Scenario: Dry-run surfaces validation failures

- **GIVEN** a JSONL file with mixed valid and invalid records
- **WHEN** the user runs the import command with `--dry-run`
- **THEN** the system lists each invalid record with file/line/reason alongside the summary; exit code is 0 unless `--strict` is also passed, in which case it is 1

#### Scenario: Dry-run does not require a writable database

- **GIVEN** the `--output` path points at a non-existent file or a read-only location
- **WHEN** `--dry-run` is set
- **THEN** the system does not attempt to create or open the file and the run completes successfully if the JSONL is valid

---

### Requirement: Local-Only Operation

The system SHALL produce a SQLite database at the local path given by `--output` and SHALL NOT make any network calls, upload any data, or modify any remote system as part of its operation.

#### Scenario: No network during ingestion

- **GIVEN** any valid invocation of the import command
- **WHEN** the command runs
- **THEN** the only side effects are reads from the JSONL file, reads from the local git repository for commit resolution, and writes to the `--output` database

#### Scenario: Throw away and retry

- **GIVEN** the user does not like the imported result
- **WHEN** they delete the `--output` database, adjust their JSONL file, and rerun
- **THEN** a fresh database is produced with no residue from the previous attempt

#### Scenario: Output to the canonical local DB path

- **GIVEN** the user wants the import to become their canonical local database
- **WHEN** they pass `--output ./unentropy.db` (or whichever path their `unentropy.json` storage block expects)
- **THEN** the resulting file is directly consumable by `unentropy preview --db` and by subsequent CI runs that read from the same location

---

### Requirement: Imported Rows Appear in Reports

The reporter SHALL include rows with `event_name='import'` in its trend-chart query alongside rows with `event_name='push'`.

#### Scenario: Trend chart includes imported history

- **GIVEN** a database containing only `event_name='import'` rows
- **WHEN** the user runs `unentropy preview --db` against it
- **THEN** the trend charts render the imported rows in chronological order

#### Scenario: Mixed history renders continuously

- **GIVEN** a database with `event_name='push'` rows and `event_name='import'` rows
- **WHEN** the report is generated
- **THEN** all rows appear in a single timeline; no rows are silently filtered out because of their `event_name`

---

## Key Entities

- **Canonical JSONL record**: One newline-delimited JSON object describing a single historical metric measurement (metric id, value, timestamp, optional commit SHA, optional source, optional run id).
- **Commit resolver**: Component that picks a `commit_sha` for each imported record using the tiered strategy.
- **Trend branch**: The branch (default `main`) whose commit history is used when resolving SHAs for timestamp-only records.

## Related

- `cli/` — surfaces this capability as the `unentropy import` command.
- `storage/` — defines the SQLite schema this capability writes through, unchanged.
- `reporting/` — broadens its trend-chart query to include `event_name='import'`.
