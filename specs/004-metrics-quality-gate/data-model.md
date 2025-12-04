# Data Model: Metrics Quality Gate

**Feature**: 004-metrics-quality-gate  
**Date**: 2025-11-19  
**Status**: Draft

## Overview

This document defines the configuration extensions and logical entities used by the Metrics Quality Gate feature. The quality gate reuses the existing Unentropy metrics storage schema (metric definitions, build contexts, and metric values) and adds configuration and in-memory evaluation structures for per-metric thresholds, baseline selection, and pull request feedback. No new persisted tables are required for the initial version; all evaluation results can be derived on demand from the existing SQLite database plus the new configuration.

## Configuration Entities (unentropy.json)

### 1. MetricThresholdConfig

Represents per-metric threshold rules configured in `unentropy.json`.

```typescript
interface MetricThresholdConfig {
  // Identifier of the metric this rule applies to (matches MetricDefinition.name)
  metric: string;

  // How the threshold is interpreted
  // - "no-regression": PR value may not be worse than baseline beyond tolerance
  // - "min": PR value must be >= target
  // - "max": PR value must be <= target
  // - "delta-max-drop": PR value may not drop by more than `maxDropPercent`
  mode: 'no-regression' | 'min' | 'max' | 'delta-max-drop';

  // Optional absolute target for min/max rules (for numeric metrics)
  target?: number;

  // Allowed regression band for no-regression rules (e.g., 0.5 means allow 0.5% drop)
  tolerance?: number;

  // Allowed maximum percentage drop for delta-max-drop rules (e.g., 5 means 5% drop)
  maxDropPercent?: number;

  // Severity of violations for this metric
  // - "warning": contributes to soft gate failures only
  // - "blocker": can cause the overall gate to fail in hard mode
  severity?: 'warning' | 'blocker';
}
```

**Validation Rules**:
- `metric` must match an existing metric name from configuration (`metrics[].name`).
- `mode` must be one of the supported values.
- `target` is required when `mode` is `min` or `max`.
- `tolerance` is optional and defaults to a small, sensible value (for example, 0.5 for 0.5 units or percent) when omitted.
- `maxDropPercent` is required when `mode` is `delta-max-drop` and must be positive.
- `severity` defaults to `blocker` if omitted.

---

### 2. QualityGateConfig

Represents global quality gate configuration and behaviour switches.

```typescript
interface QualityGateConfig {
  // Overall gate mode for this repository or workflow
  // - "off": gate not evaluated
  // - "soft": gate evaluated but never fails the job
  // - "hard": gate may fail the job when rules are violated
  mode: 'off' | 'soft' | 'hard';

  // Whether to post or update a summary comment on pull requests
  enablePullRequestComment?: boolean;

  // Maximum number of metrics to render explicitly in the PR comment
  // Remaining metrics are summarised (e.g., "+N additional metrics OK/failed")
  maxCommentMetrics?: number; // default ~30

  // Maximum number of characters to target for the comment body
  // Used to decide when to collapse details or summarise
  maxCommentCharacters?: number; // default ~8000

  // Baseline selection configuration
  baseline?: BaselineConfig;

  // Per-metric threshold rules
  thresholds?: MetricThresholdConfig[];
}

interface BaselineConfig {
  // Reference branch name (defaults to main branch if omitted)
  referenceBranch?: string;

  // Maximum age of baseline build (in days)
  // If the most recent build is older than this, no baseline is available
  maxAgeDays?: number; // default 90
}
```

**Validation Rules**:
- `mode` must be one of `off`, `soft`, or `hard`.
- When `mode` is `hard`, at least one threshold rule must be present.
- `maxCommentMetrics` must be a positive integer within a safe bound (for example, 1–100).
- `maxCommentCharacters` must be positive and lower than typical GitHub limits (for example, ≤20000).
- `baseline.maxAgeDays` must be positive.

---

### 3. Extended UnentropyConfig View

For this feature, the effective configuration can be viewed as the base metrics configuration plus an optional quality gate block.

```typescript
interface UnentropyConfigWithQualityGate {
  metrics: MetricConfig[];          // From the core metrics spec
  storage?: StorageConfig;          // From storage-related specs
  qualityGate?: QualityGateConfig;  // NEW: quality gate configuration
}
```

## Evaluation Entities (in-memory)

**Location**: These types are defined in `src/quality-gate/types.ts` and re-exported from `src/quality-gate/index.ts`.

### 4. MetricSample

Logical view of a metric's values used for quality gate evaluation.

```typescript
// src/quality-gate/types.ts
interface MetricSample {
  name: string;          // MetricDefinition.name
  unit?: string;         // MetricDefinition.unit
  type: 'numeric' | 'label';

  // Baseline value from the most recent successful build on the reference branch
  baselineValue?: number; // undefined if no baseline available; numeric-only metrics

  // Current metric value for the pull request build being evaluated
  pullRequestValue?: number; // undefined if metric not present in PR run
}
```

**Notes**:
- Quality gate evaluation applies only to numeric metrics; label metrics are ignored for thresholds but may still be displayed.
- The `baselineValue` is the metric value from the most recent successful push build on the reference branch within the configured `maxAgeDays` window.
- Sample building logic is in `src/quality-gate/samples.ts`.

---

### 5. MetricEvaluationResult

Represents the outcome of evaluating a single metric against its threshold rule.

```typescript
// src/quality-gate/types.ts
type MetricGateStatus = 'pass' | 'fail' | 'unknown';

interface MetricEvaluationResult {
  metric: string;                // Metric name
  unit?: string;

  baseline?: number;             // Value from most recent build on reference branch (if available)
  pullRequestValue?: number;     // Current value on PR

  // Signed difference and relative change, when both values are present
  absoluteDelta?: number;        // pullRequestValue - baseline
  relativeDeltaPercent?: number; // (pullRequestValue - baseline) / baseline * 100

  // Applied threshold rule (resolved from configuration)
  threshold?: MetricThresholdConfig;

  // Final status for this metric
  status: MetricGateStatus;      // 'pass', 'fail', or 'unknown' (e.g., missing baseline)

  // Human-readable explanation for logs/comments
  message?: string;

  // Whether this failure is blocking when gate mode is 'hard'
  isBlocking?: boolean;
}
```

**Evaluation Rules (high level)**:
- If no threshold is configured for a metric, `status` is `unknown` (or treated as `pass` for overall gate, depending on configuration).
- If there is no baseline data or no PR value, `status` is `unknown` and the message should explain the missing data.
- For `no-regression` mode, `fail` when the PR value is worse than the baseline beyond the configured tolerance band.
- For `min` or `max` modes, `fail` when the PR value is outside the allowed range.
- For `delta-max-drop` mode, `fail` when the relative drop exceeds `maxDropPercent`.

**Implementation**: Evaluation logic is in `src/quality-gate/evaluator.ts` (`evaluateThreshold` function).

---

### 6. QualityGateResult

Represents the aggregated outcome of the quality gate for a single evaluation run (typically a pull request build).

```typescript
// src/quality-gate/types.ts
type QualityGateOverallStatus = 'pass' | 'fail' | 'unknown';

interface QualityGateResult {
  // Overall status after combining all metric evaluations and gate mode
  status: QualityGateOverallStatus;

  // Whether the gate is configured to be hard-failing for this run
  mode: 'off' | 'soft' | 'hard';

  // Metric-level results (may include both configured and unconfigured metrics)
  metrics: MetricEvaluationResult[];

  // Metrics that actually contributed to a failure (for display and logging)
  failingMetrics: MetricEvaluationResult[];

  // Optional summary statistics
  summary: {
    totalMetrics: number;
    evaluatedMetrics: number;  // metrics with thresholds applied
    passed: number;
    failed: number;
    unknown: number;
  };

  // Notes about baseline and configuration used (for debugging and transparency)
  baselineInfo: {
    referenceBranch: string;
    maxAgeDays: number;
  };
}
```

**Aggregation Rules (high level)**:
- When `mode` is `off`, `status` is always `unknown` and no failures should affect the CI result.
- When `mode` is `soft`, `status` can be `pass` or `fail`, but failures are informational only; the CI job should not be failed solely because of the gate.
- When `mode` is `hard`, `status` is `fail` if any `MetricEvaluationResult` with `isBlocking=true` has `status='fail'`; otherwise `pass` (or `unknown` if all metrics are `unknown`).

**Implementation**: Aggregation logic is in `src/quality-gate/evaluator.ts` (`evaluateQualityGate` function).

## Pull Request Feedback Entity

### 7. PullRequestFeedbackPayload

Represents the structured data used to render the pull request comment or job summary.

```typescript
interface PullRequestFeedbackPayload {
  // Overall gate result
  overallStatus: QualityGateOverallStatus; // 'pass' | 'fail' | 'unknown'
  mode: 'off' | 'soft' | 'hard';

  // Compact list of metrics chosen for display (respecting maxCommentMetrics)
  displayedMetrics: MetricEvaluationResult[];

  // Counts and summaries for metrics not shown in detail
  hiddenMetricsSummary?: {
    totalHidden: number;
    hiddenPassing: number;
    hiddenFailing: number;
    hiddenUnknown: number;
  };

  // Text fragments or structured sections used to build the comment body
  summaryLine: string;    // e.g., "✅ Metrics quality gate passed (0 blocking failures, 2 warnings)."
  tableRows: string[][];  // e.g., [ ["metric", "baseline", "PR", "Δ", "status"], ... ]

  // Metadata to help locate and update the canonical comment
  commentMarker: string;  // e.g., "<!-- unentropy-metrics-quality-gate -->"
}
```

**Notes**:
- This entity is not persisted; it is constructed at runtime from `QualityGateResult` and `QualityGateConfig`.
- The same payload can be used to generate either a GitHub PR comment or a job summary section.

## Relationship to Existing Storage

The Metrics Quality Gate feature does **not** change the underlying SQLite schema defined in the MVP metrics tracking spec. Instead, it relies on existing tables:

- `metric_definitions` for metric identity and metadata.
- `build_contexts` for associating metric values with commits, branches, and runs.
- `metric_values` for numeric values used in baseline and pull request comparisons.

These tables are queried to:
- Fetch the most recent successful builds on the reference branch that fall within the configured baseline window.
- Retrieve the corresponding metric values for those builds and for the current pull request build.

Any future need to persist gate results (for example, long-term auditability of gate decisions) can be modelled as a separate `quality_gate_evaluations` table referencing `build_contexts`, but this is out of scope for the initial implementation and not required by the current specification.