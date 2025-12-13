# CLI Interface Contract: `unentropy init` & `unentropy test`

**Feature Branch**: `008-init-scaffolding`
**Date**: 2025-01-06

---

# `unentropy init`

## Command Signature

```
bunx unentropy init [options]
```

## Options

| Option      | Alias | Type    | Default       | Values                              | Description               |
| ----------- | ----- | ------- | ------------- | ----------------------------------- | ------------------------- |
| `--type`    | `-t`  | string  | (auto-detect) | `javascript`, `php`, `go`, `python` | Force project type        |
| `--storage` | `-s`  | string  | `artifact`    | `artifact`, `s3`, `local`           | Storage backend type      |
| `--force`   | `-f`  | boolean | `false`       | -                                   | Overwrite existing config |
| `--dry-run` | -     | boolean | `false`       | -                                   | Preview without writing   |

## Exit Codes

| Code | Condition                                              |
| ---- | ------------------------------------------------------ |
| `0`  | Success - config created or previewed                  |
| `1`  | Error - file exists, detection failed, invalid options |

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

[workflow examples for PHP...]
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

[workflow examples...]
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

Creates `unentropy.json` in current working directory with structure conforming to `UnentropyConfigSchema` (see [config-schema.md](./config-schema.md)).

---

# `unentropy test`

## Command Signature

```
bunx unentropy test [options]
```

## Options

| Option      | Alias | Type   | Default          | Description                        |
| ----------- | ----- | ------ | ---------------- | ---------------------------------- |
| `--config`  | `-c`  | string | `unentropy.json` | Path to config file                |
| `--timeout` | -     | number | `30000`          | Per-metric timeout in milliseconds |

## Exit Codes

| Code | Condition                                               |
| ---- | ------------------------------------------------------- |
| `0`  | All metrics collected successfully                      |
| `1`  | Config validation failed (schema error, file not found) |
| `2`  | One or more metrics failed to collect                   |

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

Values are formatted using human-readable units consistent with reports and PR comments:

| Unit       | Format                          | Example            |
| ---------- | ------------------------------- | ------------------ |
| `integer`  | Thousands separator             | `4,521`            |
| `percent`  | One decimal place with % symbol | `87.3%`            |
| `bytes`    | Auto-scaled to B/KB/MB/GB       | `256 KB`, `1.5 MB` |
| `duration` | Auto-scaled to ms/s/m/h         | `45s`, `2m 15s`    |
| `decimal`  | Two decimal places              | `3.14`             |

### Column Alignment

- Metric name with unit type: Left-aligned as `name (unit)`, padded to longest combined length
- Tab separator between name+unit and value
- Value: Right-aligned, dynamically sized to fit formatted value
- Duration: Right-aligned, formatted as `X.Xs`

Example layout:

```
  ✓ metric-name (unit)	formatted-value	duration
  ✓ lines-of-code (integer)	4,521         0.8s
  ✓ test-coverage (percent)	87.3%         2.1s
```

---

# `unentropy preview`

## Command Signature

```
bunx unentropy preview [options]
```

## Options

| Option      | Alias | Type    | Default             | Description                            |
| ----------- | ----- | ------- | ------------------- | -------------------------------------- |
| `--config`  | `-c`  | string  | `unentropy.json`    | Path to config file                    |
| `--output`  | `-o`  | string  | `unentropy-preview` | Output directory for report            |
| `--no-open` | -     | boolean | `false`             | Don't open browser automatically       |
| `--force`   | `-f`  | boolean | `false`             | Overwrite existing non-empty directory |

## Exit Codes

| Code | Condition                                                             |
| ---- | --------------------------------------------------------------------- |
| `0`  | Success - report generated                                            |
| `1`  | Error - config invalid, directory exists, or report generation failed |

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

1. **Directory doesn't exist**: Create it and proceed
2. **Directory exists and is empty**: Proceed normally
3. **Directory exists and is not empty**:
   - Without `--force`: Exit with error (code 1)
   - With `--force`: Clear directory contents and proceed with warning
4. **Browser opening fails**: Continue silently (no error displayed)

## File Output

Creates `{output}/index.html` containing an HTML report with:

- All configured metrics listed by name
- Empty/no-data state for all metrics (no actual values)
- Same visual structure as reports with actual data
- Message indicating this is a preview with no collected data
