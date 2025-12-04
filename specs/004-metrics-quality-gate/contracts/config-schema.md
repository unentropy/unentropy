# Configuration Schema Contract: Metrics Quality Gate

**Feature**: 004-metrics-quality-gate  
**File**: `unentropy.json`  
**Version**: 2.0.0  
**Last Updated**: 2025-12-06

## Overview

This document extends the base configuration schema contract defined in `/specs/001-mvp-metrics-tracking/contracts/config-schema.md` and the storage-related extensions from `/specs/003-unified-s3-action/contracts/config-schema.md` with a new `qualityGate` block. The quality gate configuration controls per-metric thresholds, gate mode, baseline selection, and pull request comment behaviour.

## Base Schema Reference

The base configuration schema is defined in the MVP metrics tracking spec and already covers:

- `metrics`: metric definitions and collection commands (object keyed by metric id).
- Optional `storage` configuration for database location and provider.

This feature adds:

1. An optional `qualityGate` configuration block.
2. A `thresholds` array describing per-metric rules.
3. Global options and defaults for gate mode, baseline selection, and PR comments.

## Extended Root Configuration Object

```typescript
interface UnentropyConfig {
  metrics: Record<string, MetricConfig>; // Existing metrics configuration (keyed by id)
  storage?: StorageConfig;               // Existing storage configuration
  qualityGate?: QualityGateConfig;       // NEW: Metrics Quality Gate configuration
}

interface QualityGateConfig {
  mode?: 'off' | 'soft' | 'hard';
  enablePullRequestComment?: boolean;
  maxCommentMetrics?: number;      // Default: 30
  maxCommentCharacters?: number;   // Default: 8000
  baseline?: BaselineConfig;
  thresholds?: MetricThresholdConfig[];
}

interface BaselineConfig {
  referenceBranch?: string;        // Defaults to repository default branch (e.g., main)
  maxAgeDays?: number;             // Default: 90
}

interface MetricThresholdConfig {
  metric: string;                  // Metric key (matches key in metrics object)
  mode: 'no-regression' | 'min' | 'max' | 'delta-max-drop';
  target?: number;                 // Required for 'min' / 'max'
  tolerance?: number;              // Optional, small band for 'no-regression'
  maxDropPercent?: number;         // Required for 'delta-max-drop'
  severity?: 'warning' | 'blocker'; // Default: 'blocker'
}
```

## Field Specifications

### qualityGate (root-level, optional)

| Field                    | Type      | Required | Default  | Constraints | Description |
|--------------------------|-----------|----------|----------|------------|-------------|
| `mode`                   | enum      | No       | `soft`   | `off` \| `soft` \| `hard` | Overall gate behaviour. `off` disables evaluation; `soft` reports failures without failing jobs; `hard` allows failures to block CI. |
| `enablePullRequestComment` | boolean | No       | `false`  |            | When true, the track-metrics action posts or updates a single PR comment summarising metric deltas and gate status for pull_request runs. |
| `maxCommentMetrics`      | number    | No       | `30`     | `1`–`100`  | Maximum number of metrics to render explicitly in the PR comment. |
| `maxCommentCharacters`   | number    | No       | `8000`   | `>0` and `<=20000` | Approximate upper bound for the comment body size used to decide when to collapse or summarise. |
| `baseline`               | object    | No       | See below |            | Baseline selection rules for comparing metrics. |
| `thresholds`             | array     | No       | `[]`     |            | Per-metric threshold rules. |

### baseline (within qualityGate, optional)

The baseline is always the most recent successful build on the reference branch. The `maxAgeDays` option controls how far back to look for a baseline build.

| Field           | Type   | Required | Default | Constraints               | Description |
|-----------------|--------|----------|---------|---------------------------|-------------|
| `referenceBranch` | string | No     | default repo branch | Non-empty string | Branch used as baseline for comparisons (commonly `main`). |
| `maxAgeDays`    | number | No       | `90`    | `>0`                      | Maximum age of baseline build in days. If the most recent build is older than this, no baseline is available. |

### thresholds[*] (within qualityGate, optional)

| Field            | Type    | Required | Constraints | Description |
|------------------|---------|----------|-------------|-------------|
| `metric`         | string  | Yes      | Must match a key in the `metrics` object | Key of the metric this threshold applies to. |
| `mode`           | enum    | Yes      | `no-regression` \| `min` \| `max` \| `delta-max-drop` | How the threshold is interpreted. |
| `target`         | number  | Cond.    | Required when `mode` is `min` or `max` | Absolute target threshold value. |
| `tolerance`      | number  | No       | `>=0`      | Allowed regression band for `no-regression` rules. |
| `maxDropPercent` | number  | Cond.    | Required when `mode` is `delta-max-drop`; `>0` | Maximum allowed percentage drop for the metric. |
| `severity`       | enum    | No       | `warning` \| `blocker` (default `blocker`) | Whether violations are blocking in hard mode or reported as warnings. |

## Extended JSON Schema (Illustrative)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["metrics"],
  "properties": {
    "metrics": {
      "type": "object",
      "minProperties": 1,
      "maxProperties": 50,
      "propertyNames": {
        "pattern": "^[a-z0-9-]+$",
        "minLength": 1,
        "maxLength": 64
      },
      "additionalProperties": {
        "$comment": "See spec 001 for MetricConfig schema"
      }
    },
    "storage": {
      "$comment": "See spec 003 for storage extension"
    },
    "qualityGate": {
      "type": "object",
      "properties": {
        "mode": {
          "type": "string",
          "enum": ["off", "soft", "hard"]
        },
        "enablePullRequestComment": {
          "type": "boolean"
        },
        "maxCommentMetrics": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100
        },
        "maxCommentCharacters": {
          "type": "integer",
          "minimum": 1,
          "maximum": 20000
        },
        "baseline": {
          "type": "object",
          "properties": {
            "referenceBranch": { "type": "string" },
            "maxAgeDays": {
              "type": "integer",
              "minimum": 1
            }
          }
        },
        "thresholds": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["metric", "mode"],
            "properties": {
              "metric": { "type": "string" },
              "mode": {
                "type": "string",
                "enum": ["no-regression", "min", "max", "delta-max-drop"]
              },
              "target": { "type": "number" },
              "tolerance": { "type": "number", "minimum": 0 },
              "maxDropPercent": { "type": "number", "minimum": 0 },
              "severity": {
                "type": "string",
                "enum": ["warning", "blocker"]
              }
            }
          }
        }
      }
    }
  }
}
```

## Validation Rules

- If `qualityGate` is omitted entirely, the Metrics Quality Gate is disabled and the existing metrics behaviour is unchanged.
- If `qualityGate.mode` is `hard` and `thresholds` is empty, configuration SHOULD be rejected with a clear error message.
- Each `thresholds[].metric` MUST correspond to an existing key in the `metrics` object.
- Thresholds MUST only be defined for numeric metrics; label metrics MUST be ignored or produce validation errors when used with numeric-only modes.
- Invalid or contradictory threshold configurations (for example, negative `maxDropPercent`) MUST be rejected early with clear, non-technical error messages for users.

## Versioning

**Version 2.0.0**:
- Updated to align with spec 001 v2.0.0 (metrics as object instead of array)
- Threshold `metric` field now references object keys instead of `metrics[].name`

**Version 1.0.0**:
- Initial quality gate configuration

## Backward Compatibility

- Existing configurations without a `qualityGate` block remain valid and behave as before.
- The addition of `qualityGate` is backward compatible with both the MVP metrics tracking and the unified storage extensions.
- Future versions may introduce additional threshold modes or baseline strategies; these SHOULD be additive and must not break existing valid configurations.

## Examples

### 1. Soft quality gate with PR comment

```json
{
  "metrics": {
    "coverage": {
      "type": "numeric",
      "command": "npm run coverage -- --json | jq -r '.total.lines.pct'",
      "unit": "%"
    },
    "bundle-size": {
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
      { "metric": "bundle-size", "mode": "delta-max-drop", "maxDropPercent": 5 }
    ]
  }
}
```

### 2. Hard gate on main with explicit minima

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
    "thresholds": [
      { "metric": "coverage", "mode": "min", "target": 80, "severity": "blocker" }
    ]
  }
}
```

### 3. Observe-only thresholds for new metrics

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
