# Configuration Schema: Metrics Block

**Domain**: metrics
**Version**: 1.0.0
**Last Updated**: 2025-05-12

## Overview

This contract defines the `metrics` object within `unentropy.json`. It specifies how users define custom metrics and reference built-in templates. This is the metrics-domain slice of the full configuration schema.

## Schema Definition

### Root Configuration Object (Metrics Block)

```typescript
interface UnentropyConfig {
  metrics: Record<string, MetricConfig>;
}
```

### MetricConfig

Defines a single metric to be tracked. The object key serves as the unique metric identifier.

```typescript
interface MetricConfig {
  // Optional: reference a built-in metric template
  $ref?: string;

  // Optional: override display name (defaults to object key or template name)
  name?: string;

  // Required when not using $ref, or when template has no default command
  type?: "numeric" | "label";

  // Optional: human-readable explanation
  description?: string;

  // Required when not using $ref, or when template has no default command
  command?: string;

  // Optional: semantic unit type for formatting
  unit?: UnitType;
}
```

**Field Specifications**:

| Field         | Type   | Required    | Constraints                                   | Description                                                                                             |
| ------------- | ------ | ----------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| _(key)_       | string | Yes         | Pattern: `^[a-z0-9-]+$`<br>Length: 1-64 chars | Object key serves as the unique metric identifier. Used in database, reports, and threshold references. |
| `$ref`        | string | No          | Must match an existing template ID            | References a built-in metric template. Inherits template metadata and default command.                  |
| `name`        | string | No          | Max 256 characters                            | Optional display name for reports and charts. Defaults to template name (if `$ref`) or object key.      |
| `type`        | enum   | Conditional | Either `'numeric'` or `'label'`               | Required for custom metrics. Optional when `$ref` is used (inherited from template).                    |
| `description` | string | No          | Max 256 characters                            | Human-readable explanation shown in reports.                                                            |
| `command`     | string | Conditional | Non-empty<br>Max 1024 characters              | Required for custom metrics or when template has no default. Optional when template provides a default. |
| `unit`        | string | No          | Max 10 characters                             | Display unit for numeric metrics (e.g., '%', 'ms', 'KB').                                               |

**UnitType Values**:

| Value      | Display  | Use Case                      |
| ---------- | -------- | ----------------------------- |
| `percent`  | `85.5%`  | Coverage metrics              |
| `integer`  | `1,234`  | LOC, counts                   |
| `bytes`    | `1.5 MB` | Bundle size (auto-scales)     |
| `duration` | `1m 30s` | Build/test time (auto-scales) |
| `decimal`  | `3.14`   | Generic numeric               |

## Validation Rules

- Object keys must be lowercase alphanumeric with hyphens only (`^[a-z0-9-]+$`)
- Object keys are inherently unique (JSON requirement)
- `type` affects how `command` output is parsed:
  - `numeric`: Output parsed as float (supports scientific notation)
  - `label`: Output taken as-is (trimmed string)
- `command` is executed in shell environment with build context variables
- `unit` is only meaningful for `numeric` type (ignored for `label`)
- If `$ref` is used:
  - The referenced template ID must exist
  - `type` and `command` are inherited from the template if not provided
  - If the template has no `command`, the user must provide one
- If `$ref` is not used:
  - Both `type` and `command` are required

## Command Execution Context

When metrics commands are executed, the following environment variables are available:

| Variable                | Type   | Description                | Example           |
| ----------------------- | ------ | -------------------------- | ----------------- |
| `UNENTROPY_COMMIT_SHA`  | string | Current git commit SHA     | `a3f5c2b...`      |
| `UNENTROPY_BRANCH`      | string | Current git branch         | `main`            |
| `UNENTROPY_RUN_ID`      | string | GitHub Actions run ID      | `1234567890`      |
| `UNENTROPY_RUN_NUMBER`  | string | GitHub Actions run number  | `42`              |
| `UNENTROPY_ACTOR`       | string | User/bot who triggered run | `dependabot[bot]` |
| `UNENTROPY_METRIC_KEY`  | string | Key of current metric      | `test-coverage`   |
| `UNENTROPY_METRIC_TYPE` | string | Type of current metric     | `numeric`         |

**Command Execution Rules**:

- Commands run in repository root directory
- Standard shell environment (`/bin/sh` on Linux/macOS)
- 60-second timeout per command
- Exit code ignored (only stdout/stderr used)
- Stdout is captured and parsed based on metric type
- Stderr is logged but does not fail the metric

## Example Configurations

### Minimal Custom Metric

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

### Complete Custom Metrics

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

### Template Reference (Minimal)

```json
{
  "metrics": {
    "loc": { "$ref": "loc" }
  }
}
```

### Template Reference (Customized)

```json
{
  "metrics": {
    "src-loc": {
      "$ref": "loc",
      "command": "@collect loc ./src --language TypeScript"
    },
    "test-coverage": {
      "$ref": "coverage",
      "name": "Test Coverage",
      "command": "@collect coverage-lcov ./coverage/lcov.info"
    }
  }
}
```

## Validation Error Messages

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

**Unknown template reference**:

```
Error in metric "my-metric": unknown template reference "unknown-template"
Available templates: coverage, loc, size, build-time, test-time, dependencies-count
```

## Version History

**1.0.0** (2025-05-12):

- Initial metrics block schema
- Supports custom metrics and `$ref` template references
- Supports `@collect` collector commands
