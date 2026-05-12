# Configuration Schema: Quality Gate Block

**Domain**: quality-gates

## Overview

This contract defines the `qualityGate` block within `unentropy.json`. It controls per-metric thresholds, gate mode, baseline selection, and pull request comment behaviour. This is the quality-gates-domain slice of the full configuration schema.

## Schema Definition

### Root Configuration Object (Quality Gate Block)

```typescript
interface UnentropyConfig {
  metrics: Record<string, MetricConfig>; // Existing (defined in metrics domain)
  storage?: StorageConfig; // Existing (defined in storage domain)
  qualityGate?: QualityGateConfig; // Quality gate configuration
}

interface QualityGateConfig {
  mode?: "off" | "soft" | "hard";
  enablePullRequestComment?: boolean;
  maxCommentMetrics?: number;
  maxCommentCharacters?: number;
  baseline?: BaselineConfig;
  thresholds?: MetricThresholdConfig[];
}

interface BaselineConfig {
  referenceBranch?: string;
  maxAgeDays?: number;
}

interface MetricThresholdConfig {
  metric: string;
  mode: "no-regression" | "min" | "max" | "delta-max-drop";
  target?: number;
  tolerance?: number;
  maxDropPercent?: number;
  severity?: "warning" | "blocker";
}
```

## Field Specifications

### qualityGate (root-level, optional)

| Field                      | Type    | Required | Default   | Constraints               | Description                                                                                                                          |
| -------------------------- | ------- | -------- | --------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `mode`                     | enum    | No       | `soft`    | `off` \| `soft` \| `hard` | Overall gate behaviour. `off` disables evaluation; `soft` reports failures without failing jobs; `hard` allows failures to block CI. |
| `enablePullRequestComment` | boolean | No       | `false`   |                           | When true, the system posts or updates a single PR comment summarising metric deltas and gate status.                                |
| `maxCommentMetrics`        | number  | No       | `30`      | `1`–`100`                 | Maximum number of metrics to render explicitly in the PR comment.                                                                    |
| `maxCommentCharacters`     | number  | No       | `8000`    | `>0` and `<=20000`        | Approximate upper bound for the comment body size.                                                                                   |
| `baseline`                 | object  | No       | See below |                           | Baseline selection rules for comparing metrics.                                                                                      |
| `thresholds`               | array   | No       | `[]`      |                           | Per-metric threshold rules.                                                                                                          |

### baseline (within qualityGate, optional)

| Field             | Type   | Required | Default             | Constraints      | Description                                                                |
| ----------------- | ------ | -------- | ------------------- | ---------------- | -------------------------------------------------------------------------- |
| `referenceBranch` | string | No       | default repo branch | Non-empty string | Branch used as baseline for comparisons (commonly `main`).                 |
| `maxAgeDays`      | number | No       | `90`                | `>0`             | Maximum age of baseline build in days. If older, no baseline is available. |

### thresholds[*] (within qualityGate, optional)

| Field            | Type   | Required    | Constraints                                           | Description                                                           |
| ---------------- | ------ | ----------- | ----------------------------------------------------- | --------------------------------------------------------------------- |
| `metric`         | string | Yes         | Must match a key in the `metrics` object              | Key of the metric this threshold applies to.                          |
| `mode`           | enum   | Yes         | `no-regression` \| `min` \| `max` \| `delta-max-drop` | How the threshold is interpreted.                                     |
| `target`         | number | Conditional | Required when `mode` is `min` or `max`                | Absolute target threshold value.                                      |
| `tolerance`      | number | No          | `>=0`                                                 | Allowed regression band for `no-regression` rules.                    |
| `maxDropPercent` | number | Conditional | Required when `mode` is `delta-max-drop`; `>0`        | Maximum allowed percentage drop.                                      |
| `severity`       | enum   | No          | `warning` \| `blocker` (default `blocker`)            | Whether violations are blocking in hard mode or reported as warnings. |

## Validation Rules

- If `qualityGate` is omitted entirely, the quality gate is disabled and existing metrics behaviour is unchanged.
- If `qualityGate.mode` is `hard` and `thresholds` is empty, configuration SHOULD be rejected with a clear error message.
- Each `thresholds[].metric` MUST correspond to an existing key in the `metrics` object.
- Thresholds MUST only be defined for numeric metrics; label metrics MUST be ignored or produce validation errors.
- Invalid or contradictory threshold configurations (e.g., negative `maxDropPercent`) MUST be rejected early with clear error messages.

## Example Configurations

### Soft quality gate with PR comment

```json
{
  "metrics": {
    "coverage": {
      "type": "numeric",
      "command": "npm run coverage -- --json | jq -r '.total.lines.pct'",
      "unit": "%"
    },
    "size": {
      "type": "numeric",
      "command": "du -k dist/bundle.js | cut -f1",
      "unit": "KB"
    }
  },
  "qualityGate": {
    "mode": "soft",
    "enablePullRequestComment": true,
    "thresholds": [
      { "metric": "coverage", "mode": "no-regression", "tolerance": 0.5 },
      { "metric": "size", "mode": "delta-max-drop", "maxDropPercent": 5 }
    ]
  }
}
```

### Hard gate with explicit minima

```json
{
  "metrics": {
    "coverage": {
      "type": "numeric",
      "command": "npm run coverage -- --json | jq -r '.total.lines.pct'",
      "unit": "%"
    }
  },
  "qualityGate": {
    "mode": "hard",
    "baseline": {
      "referenceBranch": "main",
      "maxAgeDays": 90
    },
    "thresholds": [{ "metric": "coverage", "mode": "min", "target": 80, "severity": "blocker" }]
  }
}
```

### Observe-only thresholds

```json
{
  "metrics": {
    "perf-score": {
      "type": "numeric",
      "command": "./scripts/measure-perf-score.sh"
    }
  },
  "qualityGate": {
    "mode": "soft",
    "thresholds": [
      { "metric": "perf-score", "mode": "no-regression", "tolerance": 1, "severity": "warning" }
    ]
  }
}
```
