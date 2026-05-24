# GitHub Action Interface: Quality Gate

**Domain**: actions/quality-gate

## Overview

Defines the GitHub Action interface for the standalone `quality-gate` action that evaluates PR metrics against baseline thresholds. This is a separate action from `track-metrics`, designed to run in pull request contexts.

## Architecture

The quality gate feature is delivered as a **separate GitHub Action** from `track-metrics`:

### track-metrics Action

- **Context**: Main branch pushes
- **Purpose**: Build and maintain historical metrics database
- **Behavior**: Collect → Record → Report → Persist to storage
- **No changes for quality gate feature**

### quality-gate Action (NEW)

- **Context**: Pull request events
- **Purpose**: Evaluate PR metrics against baseline thresholds
- **Behavior**: Download baseline DB → Collect PR metrics → Evaluate → Comment → Pass/Fail

## Action Definition

### Action Metadata

```yaml
name: "Unentropy Quality Gate"
description: "Evaluate PR metrics against baseline thresholds and post results"
author: "Unentropy"
branding:
  icon: "shield"
  color: "green"
```

### Input Parameters

```yaml
inputs:
  # Storage Configuration (required to download baseline database)
  storage-type:
    description: "Storage backend type (sqlite-local, sqlite-s3, sqlite-artifact)"
    required: false
    default: "sqlite-s3"

  s3-endpoint:
    description: "S3-compatible endpoint URL"
    required: false

  s3-bucket:
    description: "S3 bucket name"
    required: false

  s3-region:
    description: "S3 region"
    required: false

  s3-access-key-id:
    description: "S3 access key ID (from GitHub Secrets)"
    required: false

  s3-secret-access-key:
    description: "S3 secret access key (from GitHub Secrets)"
    required: false

  database-key:
    description: "Database file key in storage"
    required: false
    default: "unentropy.db"

  # Quality Gate Configuration
  config-file:
    description: "Path to unentropy.json configuration file"
    required: false
    default: "unentropy.json"

  quality-gate-mode:
    description: "Gate mode: off, soft, or hard (overrides config file)"
    required: false

  enable-pr-comment:
    description: "Post/update PR comment with gate results"
    required: false
    default: "true"

  pr-comment-marker:
    description: "HTML marker to identify canonical gate comment"
    required: false
    default: "<!-- unentropy-quality-gate -->"

  max-pr-comment-metrics:
    description: "Maximum metrics to show in PR comment"
    required: false
    default: "30"

  output-file:
    description: "Path to write the structured JSON results file (relative to workspace)"
    required: false
    default: ".unentropy/quality-gate-results.json"
```

### Output Parameters

```yaml
outputs:
  quality-gate-status:
    description: "Overall gate status: pass, fail, or unknown"

  quality-gate-mode:
    description: "Gate mode used: off, soft, or hard"

  quality-gate-failing-metrics:
    description: "Comma-separated list of failing metric names"

  quality-gate-comment-url:
    description: "URL of the PR comment (if created)"

  metrics-collected:
    description: "Number of metrics collected from PR"

  baseline-builds-considered:
    description: "Number of baseline builds used for comparison"

  baseline-reference-branch:
    description: "Reference branch used for baseline"

  quality-gate-results-path:
    description: "Absolute path to the written JSON results file"

  quality-gate-results-json:
    description: "Full quality gate result as a JSON string (usable with fromJSON() in workflow expressions)"
```

## Behavioural Contract

### Baseline Database Access

- The action MUST download the baseline metrics database from the configured storage backend at the start of execution.
- If the baseline database does not exist (first-time setup), the action MUST:
  - Return `quality-gate-status` of `unknown`
  - Post a helpful PR comment explaining that no baseline data is available yet
  - Exit with code 0 (soft landing, does not fail the job)
- The action operates in **read-only mode** on the baseline database and MUST NOT persist any changes back to storage.

### Gate Evaluation Modes

- When `quality-gate-mode` (from inputs or configuration) is `off`, the action:
  - Skips threshold evaluation
  - Sets `quality-gate-status` to `unknown`
  - Does not affect the job result, even if thresholds are present

- When mode is `soft`:
  - Thresholds are evaluated and `quality-gate-status` is `pass` or `fail`
  - The job does **not** fail solely because the gate failed
  - Failing metrics are still exposed via `quality-gate-failing-metrics` and any PR comment or job summary

- When mode is `hard`:
  - Thresholds are evaluated as above
  - If any blocking metric fails its threshold, `quality-gate-status` is `fail` and the action MUST fail the job with a non-zero exit code
  - Missing baselines, configuration errors, or evaluation exceptions MUST result in an `unknown` status and exit code 0 (soft landing, does not block PRs)

### Pull Request Comment Behaviour

- The action posts or updates a PR comment when:
  - The workflow is running in a `pull_request` context, AND
  - `enable-pr-comment` is `true` (default)

- A single canonical comment is maintained per pull request:
  - The action locates an existing comment using the configured `pr-comment-marker` (or its default marker) and updates it in place
  - If no such comment exists, the action creates one
  - Comment update failures (e.g., due to permissions) MUST NOT cause the gate to hard-fail; results remain available in the job summary

- The comment content MUST:
  - Include a clear overall status badge (PASS, FAIL, UNKNOWN) and gate mode
  - Show a compact table of key metrics (up to `max-pr-comment-metrics`), including baseline value, PR value, delta, threshold, and pass/fail state
  - List any blocking violations clearly in a dedicated section
  - For first PRs with no baseline, show a helpful message explaining the situation

### JSON Output

- The action MUST write a JSON file to the path specified by the `output-file` input after evaluation completes
- If the `output-file` contains directory components that do not exist, the action MUST create them
- The action MUST set `quality-gate-results-path` to the absolute path of the written file
- The action MUST set `quality-gate-results-json` to a JSON-stringified representation of the full quality gate result
- The JSON output SHALL contain a timestamp, duration, collection stats (successful/failed/total), PR comment URL, and a `qualityGate` field containing the full `QualityGateResult`
- The JSON output MUST be written synchronously (flushed to disk) before the action sets its step outputs
- On hard failure, the JSON file MUST still be written with the results available before the error exit
- On unexpected errors before evaluation, the action MAY omit writing the JSON file entirely

## Security Considerations

- The action continues to rely on `GITHUB_TOKEN` and existing credentials; the quality gate feature MUST NOT introduce new secret types or log sensitive values
- PR comments and logs MUST contain only metric names, values, and gate-related messages; no secrets or raw configuration content
- When interacting with forks, the action MUST follow GitHub recommendations for safe use of `GITHUB_TOKEN` and avoid executing untrusted code with elevated permissions

## Usage Examples

### Pull Request Workflow (quality-gate)

```yaml
name: Quality Gate
on:
  pull_request:
jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/quality-gate
        with:
          storage-type: sqlite-s3
          quality-gate-mode: soft # Change to 'hard' when ready
          s3-endpoint: ${{ secrets.AWS_ENDPOINT_URL }}
          s3-bucket: ${{ secrets.AWS_BUCKET_NAME }}
          s3-region: ${{ secrets.AWS_REGION }}
          s3-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          s3-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          database-key: unentropy-metrics.db
```

### Main Branch + PR Quality Gate (Hybrid)

```yaml
name: Metrics and Quality Gate
on:
  push:
    branches: [main]
  pull_request:
jobs:
  track:
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/track-metrics
        with:
          storage-type: sqlite-s3
          s3-endpoint: ${{ secrets.AWS_ENDPOINT_URL }}
          s3-bucket: ${{ secrets.AWS_BUCKET_NAME }}
          s3-region: ${{ secrets.AWS_REGION }}
          s3-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          s3-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

  gate:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/quality-gate
        with:
          storage-type: sqlite-s3
          quality-gate-mode: soft
          s3-endpoint: ${{ secrets.AWS_ENDPOINT_URL }}
          s3-bucket: ${{ secrets.AWS_BUCKET_NAME }}
          s3-region: ${{ secrets.AWS_REGION }}
          s3-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          s3-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## Compatibility Notes

- The `track-metrics` action remains unchanged and continues to work as before
- The `quality-gate` action is a new, separate action specifically for pull requests
- Teams can adopt the quality gate incrementally by:
  1. Running `track-metrics` on main to build baseline data
  2. Adding `quality-gate` workflow with `mode: soft` to observe behavior
  3. Switching to `mode: hard` once thresholds are stable and validated
