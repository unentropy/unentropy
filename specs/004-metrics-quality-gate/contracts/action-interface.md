# GitHub Action Interface: Metrics Quality Gate

**Feature**: 004-metrics-quality-gate  
**Date**: 2025-11-19  
**Updated**: 2025-12-02 (Split into separate action)
**Purpose**: Define the GitHub Action interface for the standalone `quality-gate` action that evaluates PR metrics against baseline thresholds.

## Architecture Overview

The quality gate feature is delivered as a **separate GitHub Action** from `track-metrics`:

### track-metrics Action
- **Context**: Main branch pushes
- **Purpose**: Build and maintain historical metrics database
- **Behavior**: Collect → Record → Report → Persist to S3
- **No changes for quality gate feature**

### quality-gate Action (NEW)
- **Context**: Pull request events  
- **Purpose**: Evaluate PR metrics against baseline thresholds
- **Behavior**: Download baseline DB → Collect PR metrics → Evaluate → Comment → Pass/Fail
- **This document defines this action**

## Quality Gate Action Definition

### Action Metadata

```yaml
name: 'Unentropy Quality Gate'
description: 'Evaluate PR metrics against baseline thresholds and post results'
author: 'Unentropy'
branding:
  icon: 'shield'
  color: 'green'
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
```

## Behavioural Contract

### Baseline Database Access

- The action MUST download the baseline metrics database from the configured storage backend at the start of execution.
- If the baseline database does not exist (first-time setup), the action MUST:
  - Return `quality-gate-status` of `unknown`
  - Post a helpful PR comment explaining that no baseline data is available yet
  - Exit with code 0 (soft landing, does not fail the job)
- The action operates in **read-only mode** on the baseline database and MUST NOT persist any changes back to storage.

### Gate Evaluation

- When `quality-gate-mode` (from inputs or configuration) is `off`, the action:
  - Skips threshold evaluation.
  - Sets `quality-gate-status` to `unknown`.
  - Does not affect the job result, even if thresholds are present.

- When mode is `soft`:
  - Thresholds are evaluated and `quality-gate-status` is `pass` or `fail`.
  - The job does **not** fail solely because the gate failed.
  - Failing metrics are still exposed via `quality-gate-failing-metrics` and
    any pull request comment or job summary.

- When mode is `hard`:
  - Thresholds are evaluated as above.
  - If any blocking metric fails its threshold, `quality-gate-status` is `fail`
    and the action MUST fail the job with a non-zero exit code.
  - Missing baselines, configuration errors, or evaluation exceptions MUST result in an
    `unknown` status and exit code 0 (soft landing, does not block PRs).

### Pull Request Comment Behaviour

- The action posts or updates a pull request comment when:
  - The workflow is running in a pull_request context, and
  - `enable-pr-comment` is `true` (default).

- A single canonical comment is maintained per pull request:
  - The action locates an existing comment using the configured `pr-comment-marker`
    (or its default marker) and updates it in place.
  - If no such comment exists, the action creates one.
  - Comment update failures (for example, due to permissions) must not cause
    the gate to hard-fail; results remain available in the job summary.

- The comment content MUST:
  - Include a clear overall status badge (✅ PASS, ❌ FAIL, ⚠️ UNKNOWN) and gate mode.
  - Show a compact table of key metrics (up to `max-pr-comment-metrics`),
    including baseline value, pull request value, delta, threshold, and pass/fail state.
  - List any blocking violations clearly in a dedicated section.
  - For first PRs with no baseline, show a helpful message explaining the situation.

## Security Considerations

- The action continues to rely on `GITHUB_TOKEN` and existing credentials
  described in previous specs; the quality gate feature MUST NOT introduce
  new secret types or log sensitive values.
- Pull request comments and logs MUST contain only metric names, values,
  and gate-related messages; no secrets or raw configuration content.
- When interacting with forks, the action must follow GitHub recommendations
  for safe use of `GITHUB_TOKEN` and avoid executing untrusted code with
  elevated permissions.

## Usage Examples

### Main Branch Workflow (track-metrics)
```yaml
name: Metrics
on:
  push:
    branches: [main]
jobs:
  metrics:
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
          database-key: unentropy-metrics.db
```

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
          quality-gate-mode: soft  # Change to 'hard' when ready
          s3-endpoint: ${{ secrets.AWS_ENDPOINT_URL }}
          s3-bucket: ${{ secrets.AWS_BUCKET_NAME }}
          s3-region: ${{ secrets.AWS_REGION }}
          s3-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          s3-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          database-key: unentropy-metrics.db
```

## Compatibility Notes

- The `track-metrics` action remains unchanged and continues to work as before.
- The `quality-gate` action is a new, separate action specifically for pull requests.
- Teams can adopt the quality gate incrementally by:
  - First: Running `track-metrics` on main to build baseline data
  - Second: Adding `quality-gate` workflow with `mode: soft` to observe behavior
  - Third: Switching to `mode: hard` once thresholds are stable and validated
