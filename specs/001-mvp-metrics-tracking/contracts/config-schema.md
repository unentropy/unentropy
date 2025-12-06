# Configuration Schema Contract

**Feature**: 001-mvp-metrics-tracking  
**File**: `unentropy.json`  
**Version**: 2.0.0  
**Last Updated**: 2025-12-06

## Overview

This document defines the JSON schema for the `unentropy.json` configuration file. This contract ensures backward compatibility and provides validation rules for user configurations.

## Schema Definition

### Root Configuration Object

```typescript
interface UnentropyConfig {
  metrics: Record<string, MetricConfig>;
}
```

### MetricConfig

Defines a single metric to be tracked. The object key serves as the unique metric identifier.

```typescript
interface MetricConfig {
  name?: string;
  type: 'numeric' | 'label';
  description?: string;
  command: string;
  unit?: string;
}
```

**Field Specifications**:

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| *(key)* | string | Yes | Pattern: `^[a-z0-9-]+$`<br>Length: 1-64 chars | Object key serves as the unique metric identifier. Used in database, reports, and threshold references. |
| `name` | string | No | Max 256 characters | Optional display name for reports and charts. Defaults to the object key if omitted. |
| `type` | enum | Yes | Either `'numeric'` or `'label'` | Determines how values are stored and visualized. |
| `description` | string | No | Max 256 characters | Human-readable explanation shown in reports. |
| `command` | string | Yes | Non-empty<br>Max 1024 characters | Shell command to execute for collecting this metric. |
| `unit` | string | No | Max 10 characters | Display unit for numeric metrics (e.g., '%', 'ms', 'KB'). |

**Validation Rules**:
- Object keys must be lowercase alphanumeric with hyphens only
- Object keys are inherently unique (JSON requirement)
- `type` affects how `command` output is parsed:
  - `numeric`: Output parsed as float (supports scientific notation)
  - `label`: Output taken as-is (trimmed string)
- `command` is executed in shell environment with build context variables
- `unit` is only meaningful for `numeric` type (ignored for `label`)



## JSON Schema (for validators)

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
        "type": "object",
        "required": ["type", "command"],
        "properties": {
          "name": {
            "type": "string",
            "maxLength": 256
          },
          "type": {
            "type": "string",
            "enum": ["numeric", "label"]
          },
          "description": {
            "type": "string",
            "maxLength": 256
          },
          "command": {
            "type": "string",
            "minLength": 1,
            "maxLength": 1024
          },
          "unit": {
            "type": "string",
            "maxLength": 10
          }
        }
      }
    }
  }
}
```

## Example Configurations

### Minimal Configuration

```json
{
  "metrics": {
    "test-coverage": {
      "type": "numeric",
      "command": "npm run test:coverage -- --json | jq -r '.total.lines.pct'"
    }
  }
}
```

### Complete Configuration

```json
{
  "metrics": {
    "test-coverage": {
      "name": "Test Coverage",
      "type": "numeric",
      "description": "Percentage of code covered by tests",
      "command": "npm run test:coverage -- --json | jq -r '.total.lines.pct'",
      "unit": "%"
    },
    "size": {
      "name": "Bundle Size",
      "type": "numeric",
      "description": "Production bundle size in kilobytes",
      "command": "du -k dist/bundle.js | cut -f1",
      "unit": "KB"
    },
    "build-status": {
      "name": "Build Status",
      "type": "label",
      "description": "Overall build health status",
      "command": "npm run build && echo 'healthy' || echo 'failing'"
    }
  }
}
```

### Multiple Projects Example

```json
{
  "metrics": {
    "api-test-coverage": {
      "type": "numeric",
      "command": "cd api && npm run test:coverage -- --json | jq -r '.total.lines.pct'",
      "unit": "%"
    },
    "frontend-size": {
      "type": "numeric",
      "command": "du -k frontend/dist/main.js | cut -f1",
      "unit": "KB"
    },
    "e2e-pass-rate": {
      "type": "numeric",
      "command": "npm run test:e2e -- --json | jq -r '(.numPassedTests / .numTotalTests * 100)'",
      "unit": "%"
    }
  }
}
```

## Command Execution Context

When metrics commands are executed, the following environment variables are available:

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `UNENTROPY_COMMIT_SHA` | string | Current git commit SHA | `a3f5c2b...` |
| `UNENTROPY_BRANCH` | string | Current git branch | `main` |
| `UNENTROPY_RUN_ID` | string | GitHub Actions run ID | `1234567890` |
| `UNENTROPY_RUN_NUMBER` | string | GitHub Actions run number | `42` |
| `UNENTROPY_ACTOR` | string | User/bot who triggered run | `dependabot[bot]` |
| `UNENTROPY_METRIC_KEY` | string | Key of current metric | `test-coverage` |
| `UNENTROPY_METRIC_TYPE` | string | Type of current metric | `numeric` |

**Command Execution Rules**:
- Commands run in repository root directory
- Standard shell environment (`/bin/sh` on Linux/macOS)
- 60-second timeout per command
- Exit code ignored (only stdout/stderr used)
- Stdout is captured and parsed based on metric type
- Stderr is logged but doesn't fail the metric

## Validation Error Messages

The system provides clear error messages for common mistakes:

**Invalid metric key**:
```
Error: Invalid metric key "Test-Coverage"
Keys must be lowercase with hyphens only (pattern: ^[a-z0-9-]+$)
Example: test-coverage
```

**Invalid metric type**:
```
Error in metric "coverage": type must be either 'numeric' or 'label'
Found: 'percentage'
```

**Empty command**:
```
Error in metric "test-coverage": command cannot be empty
Provide a shell command that outputs the metric value
```

**Missing required fields**:
```
Error in metric "test-coverage": missing required fields
Required: type, command
Found: type
```

## Versioning

**Version 2.0.0**:
- Changed `metrics` from array to object (key-based)
- Removed `name` as required field (key serves as identifier)
- Added optional `name` field for display purposes

**Future Versions**:
- New optional fields may be added without breaking existing configs
- Required fields will never be removed
- Type changes will be avoided (new fields added instead)
