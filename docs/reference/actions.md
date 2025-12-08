---
title: GitHub Actions
description: Complete reference for Unentropy GitHub Actions
sidebar:
  order: 3
unentropy_docs:
  generated: 2025-12-08T14:32:00Z
  sources:
    - specs/003-unified-s3-action/contracts/action-interface.md
    - specs/004-metrics-quality-gate/contracts/action-interface.md
  scope: all
---

Unentropy provides two GitHub Actions for automated metrics tracking and quality enforcement.

## Actions Overview

| Action            | Purpose                        | Context            |
| ----------------- | ------------------------------ | ------------------ |
| **track-metrics** | Collect and store metrics      | Main branch pushes |
| **quality-gate**  | Evaluate PR against thresholds | Pull requests      |

## track-metrics

Collects metrics, updates the database, and generates reports. Runs on main branch to build historical data.

### Basic Usage

```yaml
name: Track Metrics
on:
  push:
    branches: [main]

jobs:
  metrics:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: unentropy/track-metrics-action@v1
```

### Inputs

#### `storage-type`

**Type**: string  
**Default**: `sqlite-local`  
**Values**: `sqlite-local`, `sqlite-artifact`, `sqlite-s3`

Storage backend for the metrics database.

```yaml
- uses: unentropy/track-metrics-action@v1
  with:
    storage-type: sqlite-artifact
```

#### S3 Configuration

Required when `storage-type` is `sqlite-s3`:

##### `s3-endpoint`

**Type**: string  
**Required**: Yes (for S3)

S3-compatible endpoint URL.

```yaml
s3-endpoint: https://s3.amazonaws.com
s3-endpoint: https://<account-id>.r2.cloudflarestorage.com
```

##### `s3-bucket`

**Type**: string  
**Required**: Yes (for S3)

S3 bucket name.

```yaml
s3-bucket: my-metrics-bucket
```

##### `s3-region`

**Type**: string  
**Required**: Yes (for S3)

S3 region.

```yaml
s3-region: us-east-1
s3-region: auto  # Cloudflare R2
```

##### `s3-access-key-id`

**Type**: string  
**Required**: Yes (for S3)

S3 access key ID from GitHub Secrets.

```yaml
s3-access-key-id: ${{ secrets.S3_ACCESS_KEY_ID }}
```

##### `s3-secret-access-key`

**Type**: string  
**Required**: Yes (for S3)

S3 secret access key from GitHub Secrets.

```yaml
s3-secret-access-key: ${{ secrets.S3_SECRET_ACCESS_KEY }}
```

#### Artifact Configuration

Used when `storage-type` is `sqlite-artifact`:

##### `artifact-name`

**Type**: string  
**Default**: `unentropy-metrics`

Name of the database artifact.

```yaml
artifact-name: my-project-metrics
```

##### `artifact-branch-filter`

**Type**: string  
**Default**: `${{ github.ref_name }}`

Branch to search for previous artifacts.

```yaml
artifact-branch-filter: main
```

#### Other Inputs

##### `config-file`

**Type**: string  
**Default**: `unentropy.json`

Path to configuration file.

```yaml
config-file: custom-config.json
```

##### `database-key`

**Type**: string  
**Default**: `unentropy-metrics.db`

Database file key in storage.

```yaml
database-key: production/metrics.db
```

##### `report-name`

**Type**: string  
**Default**: `index.html`

Generated report filename.

```yaml
report-name: metrics-report.html
```

### Outputs

#### `success`

**Type**: boolean

Whether workflow completed successfully.

```yaml
- name: Check success
  if: steps.metrics.outputs.success == 'true'
  run: echo "Metrics collected"
```

#### `storage-type`

**Type**: string

Storage backend type used.

#### `database-location`

**Type**: string

Database storage location identifier.

#### `database-size`

**Type**: string

Database file size in bytes.

#### `metrics-collected`

**Type**: number

Number of metrics collected.

#### `duration`

**Type**: number

Total workflow duration in milliseconds.

#### `source-run-id`

**Type**: string  
**Available**: Artifact storage only

Workflow run ID where previous artifact was found.

#### `artifact-id`

**Type**: string  
**Available**: Artifact storage only

ID of uploaded database artifact.

### Examples

#### GitHub Artifacts Storage

```yaml
name: Track Metrics
on:
  push:
    branches: [main]

jobs:
  metrics:
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
    steps:
      - uses: actions/checkout@v4

      - name: Run tests with coverage
        run: bun test --coverage

      - name: Track metrics
        uses: unentropy/track-metrics-action@v1
        with:
          storage-type: sqlite-artifact

      - name: Upload report
        uses: actions/upload-artifact@v4
        with:
          name: metrics-report
          path: index.html
```

#### S3 Storage

```yaml
name: Track Metrics
on:
  push:
    branches: [main]

jobs:
  metrics:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run tests with coverage
        run: bun test --coverage

      - name: Track metrics
        uses: unentropy/track-metrics-action@v1
        with:
          storage-type: sqlite-s3
          s3-endpoint: ${{ secrets.S3_ENDPOINT }}
          s3-bucket: ${{ secrets.S3_BUCKET }}
          s3-region: ${{ secrets.S3_REGION }}
          s3-access-key-id: ${{ secrets.S3_ACCESS_KEY_ID }}
          s3-secret-access-key: ${{ secrets.S3_SECRET_ACCESS_KEY }}

      - name: Upload report
        uses: actions/upload-artifact@v4
        with:
          name: metrics-report
          path: index.html
```

## quality-gate

Evaluates PR metrics against baseline thresholds and posts results. Runs on pull requests.

### Basic Usage

```yaml
name: Quality Gate
on:
  pull_request:

jobs:
  gate:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: unentropy/quality-gate-action@v1
```

### Inputs

#### `storage-type`

**Type**: string  
**Default**: `sqlite-s3`  
**Values**: `sqlite-local`, `sqlite-artifact`, `sqlite-s3`

Storage backend where baseline database is stored. Must match the storage used by `track-metrics`.

```yaml
- uses: unentropy/quality-gate-action@v1
  with:
    storage-type: sqlite-s3
```

#### S3 Configuration

Same as `track-metrics` action. Required when `storage-type` is `sqlite-s3`.

See [track-metrics S3 inputs](#s3-configuration).

#### `config-file`

**Type**: string  
**Default**: `unentropy.json`

Path to configuration file.

```yaml
config-file: custom-config.json
```

#### `database-key`

**Type**: string  
**Default**: `unentropy.db`

Database file key in storage. Must match the key used by `track-metrics`.

```yaml
database-key: production/metrics.db
```

#### `quality-gate-mode`

**Type**: string  
**Values**: `off`, `soft`, `hard`

Override quality gate mode from config file:

- `off`: Skip evaluation
- `soft`: Evaluate and comment, don't fail build
- `hard`: Fail build on threshold violations

```yaml
quality-gate-mode: soft
```

#### `enable-pr-comment`

**Type**: boolean  
**Default**: `true`

Post/update PR comment with results.

```yaml
enable-pr-comment: true
```

#### `pr-comment-marker`

**Type**: string  
**Default**: `<!-- unentropy-quality-gate -->`

HTML marker to identify quality gate comment.

```yaml
pr-comment-marker: <!-- my-custom-marker -->
```

#### `max-pr-comment-metrics`

**Type**: number  
**Default**: `30`

Maximum metrics to show in PR comment.

```yaml
max-pr-comment-metrics: 50
```

### Outputs

#### `quality-gate-status`

**Type**: string  
**Values**: `pass`, `fail`, `unknown`

Overall gate status.

```yaml
- name: Check gate
  if: steps.gate.outputs.quality-gate-status == 'fail'
  run: echo "Quality gate failed"
```

#### `quality-gate-mode`

**Type**: string

Gate mode used.

#### `quality-gate-failing-metrics`

**Type**: string

Comma-separated list of failing metric names.

```yaml
- name: Log failures
  if: steps.gate.outputs.quality-gate-status == 'fail'
  run: echo "Failed: ${{ steps.gate.outputs.quality-gate-failing-metrics }}"
```

#### `quality-gate-comment-url`

**Type**: string

URL of the PR comment (if created).

#### `metrics-collected`

**Type**: number

Number of metrics collected from PR.

#### `baseline-builds-considered`

**Type**: number

Number of baseline builds used for comparison.

#### `baseline-reference-branch`

**Type**: string

Reference branch used for baseline.

### Examples

#### Basic Quality Gate

```yaml
name: Quality Gate
on:
  pull_request:

jobs:
  gate:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - uses: actions/checkout@v4

      - name: Run tests with coverage
        run: bun test --coverage

      - name: Quality gate
        uses: unentropy/quality-gate-action@v1
        with:
          storage-type: sqlite-s3
          quality-gate-mode: soft
          s3-endpoint: ${{ secrets.S3_ENDPOINT }}
          s3-bucket: ${{ secrets.S3_BUCKET }}
          s3-region: ${{ secrets.S3_REGION }}
          s3-access-key-id: ${{ secrets.S3_ACCESS_KEY_ID }}
          s3-secret-access-key: ${{ secrets.S3_SECRET_ACCESS_KEY }}
```

#### Hard Mode with Artifact Storage

```yaml
name: Quality Gate
on:
  pull_request:

jobs:
  gate:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
      actions: read
    steps:
      - uses: actions/checkout@v4

      - name: Run tests with coverage
        run: bun test --coverage

      - name: Quality gate
        uses: unentropy/quality-gate-action@v1
        with:
          storage-type: sqlite-artifact
          quality-gate-mode: hard
```

## Required Permissions

### For Artifact Storage

Both actions need:

```yaml
permissions:
  actions: read # Download artifacts
  contents: read # Checkout repository
```

Quality gate also needs:

```yaml
permissions:
  pull-requests: write # Post PR comments
```

### For S3 Storage

```yaml
permissions:
  contents: read # Checkout repository
```

Quality gate also needs:

```yaml
permissions:
  pull-requests: write # Post PR comments
```

S3 access is controlled via credentials, not GitHub permissions.

## Complete Workflow Example

Main branch + PR workflows together:

```yaml
# .github/workflows/metrics.yml
name: Metrics
on:
  push:
    branches: [main]

jobs:
  track-metrics:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: bun test --coverage
      - uses: unentropy/track-metrics-action@v1
        with:
          storage-type: sqlite-s3
          s3-endpoint: ${{ secrets.S3_ENDPOINT }}
          s3-bucket: ${{ secrets.S3_BUCKET }}
          s3-region: ${{ secrets.S3_REGION }}
          s3-access-key-id: ${{ secrets.S3_ACCESS_KEY_ID }}
          s3-secret-access-key: ${{ secrets.S3_SECRET_ACCESS_KEY }}
```

```yaml
# .github/workflows/quality-gate.yml
name: Quality Gate
on:
  pull_request:

jobs:
  quality-gate:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: bun test --coverage
      - uses: unentropy/quality-gate-action@v1
        with:
          storage-type: sqlite-s3
          quality-gate-mode: soft
          s3-endpoint: ${{ secrets.S3_ENDPOINT }}
          s3-bucket: ${{ secrets.S3_BUCKET }}
          s3-region: ${{ secrets.S3_REGION }}
          s3-access-key-id: ${{ secrets.S3_ACCESS_KEY_ID }}
          s3-secret-access-key: ${{ secrets.S3_SECRET_ACCESS_KEY }}
```

## Security Notes

- All S3 credentials must come from GitHub Secrets
- Credentials are never logged or exposed in error messages
- `GITHUB_TOKEN` is auto-detected for artifact operations
- PR comments contain only metric values, no sensitive data

## Related Resources

- [Storage Guide](../guides/storage.md) - Storage configuration
- [Quality Gates Guide](../guides/quality-gates.md) - Threshold setup
- [Configuration Reference](config.md) - Config file options
