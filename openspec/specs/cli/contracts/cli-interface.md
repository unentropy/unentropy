**Domain**: cli

# `unentropy init`

## Command Signature

```
bunx unentropy init [options]
```

## Options

| Option | Alias | Type | Default | Values | Description |
|--------|-------|------|---------|--------|-------------|
| `--type` | `-t` | string | (auto-detect) | `javascript`, `php`, `go`, `python` | Force project type |
| `--storage` | `-s` | string | `artifact` | `artifact`, `s3`, `local` | Storage backend type |
| `--force` | `-f` | boolean | `false` | — | Overwrite existing config |
| `--dry-run` | — | boolean | `false` | — | Preview without writing |

## Exit Codes

| Code | Condition |
|------|-----------|
| `0` | Success — config created or previewed |
| `1` | Error — file exists, detection failed, invalid options |

## Console Output

### Success Output

```
Detected project type: javascript (found: package.json, tsconfig.json)

✓ Created unentropy.json with 3 metrics:
  - lines-of-code (Lines of Code)
  - test-coverage (Test Coverage)
  - size (Bundle Size)

Next steps:
  1. Preview report structure: bunx unentropy preview
  2. Run your tests with coverage: npm test -- --coverage
  3. Verify metrics collect: bunx unentropy test
  4. Add the workflows below to your CI

────────────────────────────────────────────────────────────
TRACK METRICS (add to your CI for main branch)
────────────────────────────────────────────────────────────

name: Metrics
on:
  push:
    branches: [main]

permissions:
  contents: read
  actions: read

jobs:
  metrics:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test -- --coverage
      - uses: unentropy/track-metrics@v1
        with:
          storage-type: sqlite-artifact

────────────────────────────────────────────────────────────
QUALITY GATE (add to your CI for pull requests)
────────────────────────────────────────────────────────────

name: CI
on: [pull_request]

permissions:
  contents: read
  pull-requests: write
  actions: read

jobs:
  quality-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test -- --coverage
      - uses: unentropy/quality-gate@v1
        with:
          storage-type: sqlite-artifact
          quality-gate-mode: soft
          enable-pr-comment: true

Documentation: https://github.com/unentropy/unentropy
```

### Forced Project Type Output

```
Using forced project type: php

✓ Created unentropy.json with 2 metrics:
  - lines-of-code (Lines of Code)
  - test-coverage (Test Coverage)

[workflow examples for PHP]
```

### Dry-Run Output

```
Detected project type: javascript (found: package.json)

Would create unentropy.json:

{
  "metrics": {
    "lines-of-code": {
      "$ref": "loc",
      ...
    }
  },
  ...
}

[workflow examples]
```

### Error Outputs

**Config exists:**
```
Error: unentropy.json already exists. Use --force to overwrite.
```

**Detection failed:**
```
Error: Could not detect project type.
Use --type to specify: javascript, php, go, or python
```

**Invalid type:**
```
Error: Invalid project type "invalid".
Valid types: javascript, php, go, python
```

## S3 Storage Additional Output

When `--storage s3` is specified, append:

```
────────────────────────────────────────────────────────────
S3 SECRETS REQUIRED
────────────────────────────────────────────────────────────

Add these secrets to your repository Settings > Secrets:
  - AWS_ENDPOINT_URL
  - AWS_BUCKET_NAME
  - AWS_REGION
  - AWS_ACCESS_KEY_ID
  - AWS_SECRET_ACCESS_KEY

Then update the workflow steps to include:
  s3-endpoint: ${{ secrets.AWS_ENDPOINT_URL }}
  s3-bucket: ${{ secrets.AWS_BUCKET_NAME }}
  s3-region: ${{ secrets.AWS_REGION }}
  s3-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
  s3-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## File Output

Creates `unentropy.json` in current working directory conforming to `UnentropyConfigSchema`.

---

# `unentropy test`

## Command Signature

```
bunx unentropy test [options]
```

## Options

| Option | Alias | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--config` | `-c` | string | `unentropy.json` | Path to config file |
| `--timeout` | — | number | `30000` | Per-metric timeout in milliseconds |

## Exit Codes

| Code | Condition |
|------|-----------|
| `0` | All metrics collected successfully |
| `1` | Config validation failed (schema error, file not found) |
| `2` | One or more metrics failed to collect |

## Console Output

### All Metrics Success

```
Checking unentropy.json...

✓ Config schema valid

Collecting metrics:

  ✓ lines-of-code (integer)	4,521         0.8s
  ✓ test-coverage (percent)	87.3%         2.1s
  ✓ size (bytes)	240 KB         0.2s

All 3 metrics collected successfully.
```

### Partial Failure

```
Checking unentropy.json...

✓ Config schema valid

Collecting metrics:

  ✓ lines-of-code (integer)	4,521         0.8s
  ✗ test-coverage (percent)	Error: File not found: coverage/lcov.info
  ✓ size (bytes)	240 KB         0.2s

1 of 3 metrics failed.
```

### Config Not Found

```
Error: Config file not found: unentropy.json
Run 'bunx unentropy init' to create one.
```

### Schema Validation Error

```
Checking unentropy.json...

✗ Config schema invalid:
  metrics.test-coverage: command cannot be empty

Fix the errors above and try again.
```

### Timeout Error

```
Collecting metrics:

  ✓ lines-of-code (integer)	4,521         0.8s
  ✗ test-coverage (percent)	Error: Command timed out after 30000ms
  ✓ size (bytes)	240 KB         0.2s

1 of 3 metrics failed.
```

## Output Formatting

### Value Formatting by Unit

| Unit | Format | Example |
|------|--------|---------|
| `integer` | Thousands separator | `4,521` |
| `percent` | One decimal place with % symbol | `87.3%` |
| `bytes` | Auto-scaled to B/KB/MB/GB | `256 KB`, `1.5 MB` |
| `duration` | Auto-scaled to ms/s/m/h | `45s`, `2m 15s` |
| `decimal` | Two decimal places | `3.14` |

### Column Alignment

- Metric name with unit type: Left-aligned as `name (unit)`, padded to longest combined length
- Tab separator between name+unit and value
- Value: Right-aligned, dynamically sized to fit formatted value
- Duration: Right-aligned, formatted as `X.Xs`

---

# `unentropy preview`

## Command Signature

```
bunx unentropy preview [options]
```

## Options

| Option | Alias | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--config` | `-c` | string | `unentropy.json` | Path to config file |
| `--output` | `-o` | string | `unentropy-preview` | Output directory for report |
| `--no-open` | — | boolean | `false` | Don't open browser automatically |
| `--force` | `-f` | boolean | `false` | Overwrite existing non-empty directory |

## Exit Codes

| Code | Condition |
|------|-----------|
| `0` | Success — report generated |
| `1` | Error — config invalid, directory exists, or report generation failed |

## Console Output

### Success Output

```
Checking unentropy.json...

✓ Config schema valid

Generating preview report with 3 metrics:
  - lines-of-code (Lines of Code)
  - test-coverage (Test Coverage)
  - size (Bundle Size)

✓ Preview report generated: unentropy-preview/index.html
🌐 Opening in browser...
```

### With --no-open Flag

```
Checking unentropy.json...

✓ Config schema valid

Generating preview report with 3 metrics:
  - lines-of-code (Lines of Code)
  - test-coverage (Test Coverage)
  - size (Bundle Size)

✓ Preview report generated: unentropy-preview/index.html

To view: open unentropy-preview/index.html
```

### With --force Flag (Overwriting)

```
Checking unentropy.json...

✓ Config schema valid

⚠️  Overwriting existing directory: unentropy-preview

Generating preview report with 3 metrics:
  - lines-of-code (Lines of Code)
  - test-coverage (Test Coverage)
  - size (Bundle Size)

✓ Preview report generated: unentropy-preview/index.html
🌐 Opening in browser...
```

### Error Outputs

**Config not found:**

```
Error: Config file not found: unentropy.json
Run 'bunx unentropy init' to create one.
```

**Schema validation error:**

```
Checking unentropy.json...

✗ Config schema invalid:
  metrics.test-coverage: command cannot be empty

Fix the errors above and try again.
```

**Output directory not empty:**

```
Error: Output directory 'unentropy-preview' is not empty.
Use --force to overwrite, or choose a different --output directory.
```

## Directory Handling Behavior

1. Directory doesn't exist: Create it and proceed
2. Directory exists and is empty: Proceed normally
3. Directory exists and is not empty:
   - Without `--force`: Exit with error (code 1)
   - With `--force`: Clear directory contents and proceed with warning
4. Browser opening fails: Continue silently (no error displayed)

## File Output

Creates `{output}/index.html` containing an HTML report with all configured metrics listed by name, empty/no-data state for all metrics, same visual structure as reports with actual data, and a message indicating this is a preview with no collected data.

---

# `unentropy verify`

## Command Signature

```
bunx unentropy verify [config]
```

## Arguments

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `config` | string | `unentropy.json` | Path to config file |

## Exit Codes

| Code | Condition |
|------|-----------|
| `0` | Configuration is valid |
| `1` | Configuration is invalid, file not found, or syntax error |

## Console Output

### Valid Configuration

```
✓ Configuration is valid
```

### Invalid Configuration

```
✗ Configuration is invalid:
  [specific, actionable error messages]
```

# `unentropy import`

## Overview

Adds a single command, `unentropy import`, that ingests a canonical JSONL file into a local SQLite database. The command has no subcommands and no remote-side effects.

## Command Signature

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
