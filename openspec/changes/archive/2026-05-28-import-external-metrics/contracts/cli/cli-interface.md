# CLI Interface (Delta)

**Domain**: cli
**Extends**: `openspec/specs/cli/contracts/cli-interface.md`

## Overview

Adds a single command, `unentropy import`, that ingests a canonical JSONL file into a local SQLite database. The command has no subcommands and no remote-side effects.

## Command

```
unentropy import <jsonl-path>
  --output <db-path>           Target SQLite database (required). Created if missing.
  [--dry-run]                  Validate and report; do not write.
  [--strict]                   Abort on first invalid record (default: skip & continue).
  [--trend-branch <ref>]       Branch used for nearest-commit fallback (default: main).
  [--config <path>]            Path to unentropy.json (default: ./unentropy.json).
```

## Behavior

- The positional argument is the path to a canonical JSONL file (see `contracts/metric-import/canonical-import-format.md`).
- `--output` is required. If the file does not exist, it is created with the current schema. If it exists, records are appended; nothing pre-existing is modified.
- `--dry-run` runs the full validation and commit-resolution pipeline without opening the database for writes. The `--output` path is not required to exist or be writable when `--dry-run` is set, but the flag is still required so the dry-run accurately reflects what the real run would do (same code path up to the write boundary).
- `--strict` makes any invalid record fatal. Without it, invalid records are reported and skipped.
- `--trend-branch` controls the branch used for nearest-by-timestamp commit resolution. Default `main`.

## Exit Codes

| Code | Meaning                                                                                                         |
| ---- | --------------------------------------------------------------------------------------------------------------- |
| 0    | Success. Some records may have been skipped with warnings.                                                      |
| 1    | Invalid input (missing file, locked DB, shallow clone), strict-mode validation failure, or unrecoverable error. |

## Sample Output

**Successful import**:

```
imported 1,847 records from ./sonarqube.jsonl into ./scratch.db
  commits resolved: 1,712 from source SHA, 132 by nearest timestamp
  commits skipped: 3 (timestamp predates repo history)
  metrics: test-coverage (1,200), bugs (350), code-smells (297)
```

**Dry-run**:

```
dry-run summary for ./sonarqube.jsonl:
  records:       1,847 (1,847 valid, 0 invalid)
  sources:       sonarqube (1,847)
  metric ids:    test-coverage, bugs, code-smells
                 (note: 'code-smells' is not declared in unentropy.json)
  date range:    2022-04-15 → 2025-05-20
  commit resolution:
    source-provided    1,712
    nearest-timestamp    132
    skipped (unresolvable)  3
no database writes performed (--dry-run).
```

**Validation failure (non-strict)**:

```
warning: ./data.jsonl:42 — missing required field "timestamp" (record skipped)
warning: ./data.jsonl:117 — value_numeric and value_label both set (record skipped)
imported 1,845 records from ./data.jsonl into ./scratch.db
  ...
```

**Shallow-clone error**:

```
error: nearest-commit resolution requires full git history
       run `git fetch --unshallow` locally, or set `fetch-depth: 0` in your CI checkout step
       no records were written
```

## Common Behaviors

- The command reads `unentropy.json` for project context (currently only to validate metric ids against declared metrics for the dry-run report). Missing config produces the standard error: `Error: Config file not found: unentropy.json` (exit 1).
- All output uses the project's existing logger conventions: status lines to stderr, the summary block to stdout. The dry-run summary on stdout is plain text formatted for diffing and grep.
- No network calls. The command reads the JSONL file, reads the local git repository (for commit resolution), and writes the `--output` database. Nothing else.
