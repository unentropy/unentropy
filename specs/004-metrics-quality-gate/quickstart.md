# Quickstart Guide: Metrics Quality Gate

**Feature**: 004-metrics-quality-gate  
**Audience**: Developers implementing this feature  
**Last Updated**: 2025-12-02

## Overview

This guide outlines the concrete steps to implement the Metrics Quality Gate feature in the existing Unentropy codebase. It assumes the core metrics collection, storage, and reporting features are already in place.

**Architecture Decision**: The quality gate is delivered as a **standalone GitHub Action** separate from `track-metrics`:
- **`track-metrics` action**: Runs on main branch, builds historical database, persists to S3
- **`quality-gate` action** (NEW): Runs on PRs, downloads baseline, evaluates thresholds, posts comment

This separation provides clearer responsibilities, simpler testing, and database safety (PRs don't write to baseline).

## Implementation Phases

### Phase 1: Create Quality Gate Action Structure

**Goal**: Set up the new `quality-gate` action structure and baseline download capability.

**Components**:
1. `.github/actions/quality-gate/action.yml` – Create action definition with inputs/outputs
2. `src/actions/quality-gate.ts` – Extend with action entrypoint that:
   - Parses action inputs
   - Loads `unentropy.json` configuration
   - Downloads baseline database from S3 (read-only mode)
   - Initializes storage provider
3. `scripts/build-actions.ts` – Add quality-gate to build pipeline
4. `package.json` – Ensure build script includes new action

**Implementation Hints**:
- Reuse existing storage provider infrastructure (`Storage`, `sqlite-s3`)
- Open storage in read-only mode (no `persist()` call)
- Handle missing baseline database gracefully (soft landing for first PR)
- Log download progress and baseline DB size

### Phase 2: Metrics Collection and Sample Building

**Goal**: Collect metrics for the current PR and build `MetricSample` objects combining PR values with baseline values.

**Components**:
1. `src/actions/quality-gate.ts` – Implement:
   - Metrics collection for current PR using `collectMetrics()`
   - Helper function `buildMetricSamples()` that:
     - Iterates through collected metrics
     - Fetches baseline values from repository using `getBaselineMetricValues()`
     - Constructs `MetricSample` objects with both PR and baseline data
   - Reference branch detection logic (PR base → config → 'main')
2. `tests/unit/actions/quality-gate.test.ts` – Unit tests for helper functions (extend existing file)

**Implementation Hints**:
- Skip label metrics (quality gate only applies to numeric metrics)
- Handle failed metric collection gracefully (mark as unknown in gate result)
- Use baseline window configuration (maxBuilds, maxAgeDays) from config
- Calculate median of baseline values as comparison point

### Phase 3: Gate Evaluation and Comment Posting

**Goal**: Evaluate thresholds using the evaluation function and post PR comment with results.

**Components**:
1. `src/actions/quality-gate.ts` – Implement:
   - Call to `evaluateQualityGate()` with samples and configuration
   - PR comment generation with formatted results
   - Comment posting/updating using GitHub API
   - Output setting for all action outputs
2. Helper function `createQualityGateComment()` that:
   - Formats gate result as markdown
   - Shows status badge, threshold violations, metric table
   - Handles first-PR case with helpful message
3. `tests/integration/quality-gate.test.ts` – Integration tests for full flow

**Implementation Hints**:
- Reuse existing GitHub API patterns from track-metrics
- Format comment with status badge (✅ PASS, ❌ FAIL, ⚠️ UNKNOWN)
- Keep comment under max-pr-comment-metrics limit
- Handle comment API failures gracefully (non-blocking)

### Phase 4: Job Pass/Fail Logic and Mode Resolution

**Goal**: Implement mode resolution and job exit logic based on gate result and mode.

**Components**:
1. `src/actions/quality-gate.ts` – Implement:
   - Configuration resolution (input → config → default)
   - Function `determineJobOutcome()` that decides exit code based on mode and result
   - Exit with code 1 only in hard mode with blocking violations
   - Always exit 0 for unknown status (soft landing)
2. Error handling for infrastructure failures
3. Job summary output with gate results

**Implementation Hints**:
- Mode priority: action input > config file > default ('soft')
- Hard mode only fails on blocking violations (severity: 'blocker')
- Warnings (severity: 'warning') never fail job
- Infrastructure errors always result in unknown status + exit 0
- Set all outputs before potentially exiting with error

## Testing Strategy

- **Unit tests** (`tests/unit/actions/quality-gate.test.ts`):
  - Configuration resolution (mode, baseline config, comment settings)
  - `buildMetricSamples()` helper function
  - `determineJobOutcome()` exit logic
  - Reference branch detection
  - Builds considered calculation
  
- **Integration tests** (`tests/integration/quality-gate.test.ts`):
  - Happy path: PR with baseline, all thresholds pass
  - Blocking failure: PR with violations in hard mode
  - Soft failure: PR with violations in soft mode  
  - No baseline: First PR, unknown status, soft landing
  - Missing DB: Baseline doesn't exist yet
  - Mode: off - No evaluation performed
  - Comment posting and updating
  
- **Contract tests** (`tests/contract/quality-gate.test.ts`):
  - Action inputs parsed correctly
  - Action outputs match specification
  - Exit codes match documented behavior
  - PR comment format validates

## Build and CI Notes

- Add quality-gate to build pipeline:
  ```bash
  # In scripts/build-actions.ts
  { 
    input: 'src/actions/quality-gate.ts', 
    output: '.github/actions/quality-gate/dist/quality-gate.js' 
  }
  ```

- Create dist directory:
  ```bash
  mkdir -p .github/actions/quality-gate/dist
  ```

- Run build:
  ```bash
  bun run build:actions
  ```

- Test locally before committing:
  ```bash
  bun test
  bun run lint
  bun run typecheck
  ```

## Workflow Setup Examples

### Main Branch Workflow
**File**: `.github/workflows/metrics.yml`
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

### Pull Request Workflow (NEW)
**File**: `.github/workflows/quality-gate.yml`
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

## Reference Documents

- [Feature Specification](./spec.md)
- [Technical Plan](./plan.md)
- [Research & Decisions](./research.md)
- [Data Model](./data-model.md)
- [Contracts](./contracts/)
  - [Action Interface](./contracts/action-interface.md)
  - [Config Schema](./contracts/config-schema.md)
