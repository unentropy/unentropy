## Overview

Adds the `unentropy import` command to the CLI. The command ingests canonical JSONL into a local SQLite database. It does not move data to remote storage, does not connect to external sources, and does not have subcommands.

## ADDED Requirements

### Requirement: Import Command

As a user with canonical JSONL containing historical metric measurements, I want a single command that turns it into a local SQLite database, so that the iteration loop (run → preview → tweak → re-run) is fast and reversible.

The system SHALL provide `unentropy import <jsonl-path>` which validates and ingests the file into the SQLite database at `--output`, creating the database if it does not exist. The command SHALL operate purely on local files and SHALL NOT make any network calls.

#### Scenario: Import into a new database

- **GIVEN** a valid JSONL file and a non-existent `--output` path
- **WHEN** the user runs `unentropy import ./data.jsonl --output ./scratch.db`
- **THEN** the database is created with the current schema, the records are inserted, and the command exits 0

#### Scenario: Import into an existing database

- **GIVEN** an existing SQLite database (CI-produced or from a prior import)
- **WHEN** the user runs the import command with `--output` pointing at it
- **THEN** the new records are inserted alongside existing rows; nothing pre-existing is modified

#### Scenario: Dry-run validates without writing

- **GIVEN** a JSONL file
- **WHEN** the user runs `unentropy import ./data.jsonl --output ./scratch.db --dry-run`
- **THEN** the system performs full validation and commit-resolution, prints a summary (record count, metric ids, date range, per-source counts, per-tier resolution counts), and writes nothing to the database

#### Scenario: Strict mode aborts on first invalid record

- **GIVEN** a JSONL file containing any invalid record
- **WHEN** the user passes `--strict`
- **THEN** the command exits 1 with the file/line/reason of the failure and writes no records

#### Scenario: Custom trend branch for commit resolution

- **GIVEN** a repository whose integration branch is `develop`
- **WHEN** the user runs the import command with `--trend-branch develop`
- **THEN** the commit resolver uses `develop` for nearest-by-timestamp lookups instead of the default `main`

#### Scenario: Validation errors with file/line context

- **GIVEN** a JSONL file containing one malformed line
- **WHEN** the user runs the command without `--strict`
- **THEN** the system prints the path, line number, and reason; skips that record; continues; and exits 0

---

### Requirement: Import Command Error Handling

The system SHALL exit with appropriate codes and clear messages for error conditions in the import command, in line with the conventions used by other CLI commands.

#### Scenario: Config file not found

- **GIVEN** no `unentropy.json` exists in the current directory and the user has not passed `--config`
- **WHEN** the user runs the import command
- **THEN** the system prints "Error: Config file not found: unentropy.json" with a suggestion to run init and exits with code 1

#### Scenario: JSONL file missing

- **GIVEN** the JSONL path passed as the positional argument does not exist
- **WHEN** the import command runs
- **THEN** the system prints "Error: JSONL file not found: <path>" and exits with code 1

#### Scenario: Database write conflicts with locked file

- **GIVEN** another process holds a write lock on the target SQLite database
- **WHEN** the import command attempts to write
- **THEN** the system reports the lock and exits with code 1 without producing a partial database

#### Scenario: Shallow clone error

- **GIVEN** the local repository was cloned without full history and the JSONL has records that need nearest-by-timestamp resolution
- **WHEN** the import command runs
- **THEN** the system prints a single error explaining the requirement (`git fetch --unshallow`, or `fetch-depth: 0` in CI) and exits with code 1 before writing any records
