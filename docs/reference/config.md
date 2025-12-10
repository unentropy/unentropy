---
title: Configuration
description: Complete reference for unentropy.json configuration file
sidebar:
  order: 2
unentropy_docs:
  generated: 2025-12-08T14:32:00Z
  sources:
    - specs/001-metrics-tracking-poc/contracts/config-schema.md
  scope: all
---

The `unentropy.json` file configures which metrics to track, storage options, and quality gate thresholds. This reference covers all configuration options.

## File Location

Place `unentropy.json` in your project root directory:

```
my-project/
├── unentropy.json
├── package.json
└── src/
```

## Basic Structure

```json
{
  "metrics": {
    "metric-id": {
      "type": "numeric",
      "command": "echo 42"
    }
  },
  "storage": {
    "type": "sqlite-artifact"
  },
  "qualityGate": {
    "mode": "soft",
    "thresholds": []
  }
}
```

## Metrics

The `metrics` object defines which metrics to track. Each key is a unique metric identifier.

### Metric Configuration

```json
{
  "metrics": {
    "coverage": {
      "$ref": "coverage",
      "name": "Test Coverage",
      "description": "Percentage of code covered by tests",
      "command": "@collect coverage-lcov ./coverage/lcov.info",
      "unit": "percent"
    }
  }
}
```

### Fields

#### Metric ID (Object Key)

**Type**: string  
**Required**: Yes  
**Pattern**: `^[a-z0-9-]+$` (lowercase alphanumeric with hyphens)  
**Length**: 1-64 characters

The object key serves as the unique metric identifier. Used in:

- Database storage
- Quality gate threshold references
- Report displays

Examples: `coverage`, `bundle-size`, `test-loc`

#### `$ref`

**Type**: string  
**Required**: No

Reference a built-in metric template. Inherits default properties like description, unit, and command.

```json
{
  "loc": {
    "$ref": "loc"
  }
}
```

Available templates:

- `coverage` - Test coverage percentage (supports `--type line|branch|function`)
- `loc` - Lines of code
- `size` - File/bundle size
- `build-time` - Build duration
- `test-time` - Test duration
- `dependencies-count` - Dependency count

See [Metrics Guide](../guides/metrics.md#built-in-metrics) for details.

#### `name`

**Type**: string  
**Required**: No  
**Max length**: 256 characters

Display name for reports and charts. Defaults to the metric ID if omitted.

```json
{
  "frontend-loc": {
    "$ref": "loc",
    "name": "Frontend Code Lines"
  }
}
```

#### `type`

**Type**: `"numeric"` or `"label"`  
**Required**: Yes (unless using `$ref`)

Determines how values are stored and visualized:

- **numeric**: Parsed as numbers, displayed as line charts
- **label**: Stored as strings, displayed as bar charts

```json
{
  "coverage": {
    "type": "numeric",
    "command": "@collect coverage-lcov ./coverage/lcov.info"
  },
  "status": {
    "type": "label",
    "command": "echo healthy"
  }
}
```

#### `description`

**Type**: string  
**Required**: No  
**Max length**: 256 characters

Human-readable explanation shown in reports.

```json
{
  "bundle": {
    "$ref": "size",
    "description": "Production build size for main bundle"
  }
}
```

#### `command`

**Type**: string  
**Required**: Yes  
**Max length**: 1024 characters

Shell command to execute for collecting this metric. The command's stdout is captured and parsed based on the metric type.

```json
{
  "coverage": {
    "type": "numeric",
    "command": "@collect coverage-lcov ./coverage/lcov.info"
  },
  "api-count": {
    "type": "numeric",
    "command": "grep -r 'export function' src/api | wc -l"
  }
}
```

**@collect shortcuts** (faster, in-process execution):

- `@collect loc <path>` - Count lines of code
- `@collect size <path>` - Calculate file size
- `@collect coverage-lcov <path> [--type line|branch|function]` - Extract LCOV coverage
- `@collect coverage-cobertura <path> [--type line|branch|function]` - Extract Cobertura XML coverage

#### `unit`

**Type**: string  
**Required**: No  
**Max length**: 10 characters

Display unit for numeric metrics. Used for formatting in reports.

Valid units:

- `percent` - Displays as `87.5%`
- `integer` - Displays as `1,234`
- `bytes` - Displays as `1.5 MB` (auto-scales)
- `duration` - Displays as `1m 30s` (auto-scales)
- `decimal` - Displays as `3.14`

```json
{
  "coverage": {
    "type": "numeric",
    "command": "@collect coverage-lcov ./coverage/lcov.info",
    "unit": "percent"
  }
}
```

### Metric Limits

- Minimum metrics: 1
- Maximum metrics: 50
- Metric ID length: 1-64 characters
- Command timeout: 30 seconds (configurable per-metric)

### Command Execution

Commands run with these environment variables:

| Variable                | Description               | Example           |
| ----------------------- | ------------------------- | ----------------- |
| `UNENTROPY_COMMIT_SHA`  | Current git commit        | `a3f5c2b...`      |
| `UNENTROPY_BRANCH`      | Current git branch        | `main`            |
| `UNENTROPY_RUN_ID`      | GitHub Actions run ID     | `1234567890`      |
| `UNENTROPY_RUN_NUMBER`  | GitHub Actions run number | `42`              |
| `UNENTROPY_ACTOR`       | User who triggered run    | `dependabot[bot]` |
| `UNENTROPY_METRIC_KEY`  | Current metric ID         | `coverage`        |
| `UNENTROPY_METRIC_TYPE` | Current metric type       | `numeric`         |

**Execution rules**:

- Runs in repository root directory
- Uses `/bin/sh` shell environment
- Stdout is captured and parsed
- Stderr is logged (doesn't fail metric)
- Exit code ignored (only output matters)

## Storage

Configure where metrics data is stored.

### Artifact Storage (Default)

```json
{
  "storage": {
    "type": "sqlite-artifact"
  }
}
```

Or omit the `storage` block entirely—artifact storage is the default.

**Options**:

```json
{
  "storage": {
    "type": "sqlite-artifact",
    "artifactName": "unentropy-metrics",
    "branch": "main"
  }
}
```

- **artifactName**: Artifact name (default: `unentropy-metrics`)
- **branch**: Branch to search (default: current branch)

### S3 Storage

```json
{
  "storage": {
    "type": "sqlite-s3"
  }
}
```

S3 credentials are provided as GitHub Action inputs, not in the config file:

```yaml
- uses: unentropy/track-metrics-action@v1
  with:
    s3-endpoint: ${{ secrets.S3_ENDPOINT }}
    s3-access-key-id: ${{ secrets.S3_ACCESS_KEY_ID }}
    s3-secret-access-key: ${{ secrets.S3_SECRET_ACCESS_KEY }}
    s3-bucket: my-metrics-bucket
    s3-region: us-east-1
```

See [Storage Guide](../guides/storage.md) for setup details.

### Local Storage

```json
{
  "storage": {
    "type": "sqlite-local"
  }
}
```

Database stored at `./unentropy.db` in your project directory. Use for local development only (doesn't persist in CI).

## Quality Gate

Configure thresholds to enforce on pull requests.

### Basic Quality Gate

```json
{
  "qualityGate": {
    "mode": "soft",
    "thresholds": [
      {
        "metric": "coverage",
        "mode": "min",
        "target": 80
      }
    ]
  }
}
```

### Quality Gate Mode

Controls how threshold violations are handled:

```json
{
  "qualityGate": {
    "mode": "soft"
  }
}
```

**Modes**:

- `off` - Disabled (no evaluation)
- `soft` - Evaluates and posts comments, never fails build (default)
- `hard` - Fails build when thresholds violated

### Thresholds

Array of threshold rules for metrics:

```json
{
  "qualityGate": {
    "thresholds": [
      {
        "metric": "coverage",
        "mode": "min",
        "target": 80
      },
      {
        "metric": "bundle",
        "mode": "max",
        "target": 500000
      },
      {
        "metric": "loc",
        "mode": "no-regression"
      }
    ]
  }
}
```

#### Threshold Fields

##### `metric`

**Type**: string  
**Required**: Yes

Metric ID to evaluate. Must match a metric key in the `metrics` object.

##### `mode`

**Type**: string  
**Required**: Yes

Comparison mode:

- `min` - Metric must not drop below target
- `max` - Metric must not exceed target
- `no-regression` - Metric must not decrease from baseline
- `delta-max-drop` - Metric can increase, but not more than target percentage

##### `target`

**Type**: number  
**Required**: Yes (except for `no-regression` mode)

Threshold value. Meaning depends on mode:

- `min` / `max`: Absolute value
- `delta-max-drop`: Percentage (e.g., `5` = 5% max increase)

See [Quality Gates Guide](../guides/quality-gates.md) for examples.

## Complete Example

```json
{
  "metrics": {
    "coverage": {
      "$ref": "coverage",
      "name": "Test Coverage",
      "description": "Overall test coverage percentage",
      "command": "@collect coverage-lcov ./coverage/lcov.info"
    },
    "src-loc": {
      "$ref": "loc",
      "name": "Source Code Lines",
      "command": "@collect loc ./src --language TypeScript"
    },
    "test-loc": {
      "$ref": "loc",
      "name": "Test Code Lines",
      "command": "@collect loc ./tests"
    },
    "bundle": {
      "$ref": "size",
      "name": "Production Bundle",
      "command": "@collect size ./dist/**/*.js"
    },
    "api-endpoints": {
      "type": "numeric",
      "name": "API Endpoints",
      "description": "Number of exported API functions",
      "command": "grep -r 'export.*function' src/api | wc -l",
      "unit": "integer"
    }
  },
  "storage": {
    "type": "sqlite-artifact"
  },
  "qualityGate": {
    "mode": "soft",
    "thresholds": [
      {
        "metric": "coverage",
        "mode": "min",
        "target": 80
      },
      {
        "metric": "bundle",
        "mode": "delta-max-drop",
        "target": 5
      },
      {
        "metric": "src-loc",
        "mode": "delta-max-drop",
        "target": 15
      }
    ]
  }
}
```

## Validation

Validate your configuration locally:

```bash
bunx unentropy verify
```

Common validation errors:

### Invalid Metric ID

```
Error: Invalid metric key "Test-Coverage"
Keys must be lowercase with hyphens only (pattern: ^[a-z0-9-]+$)
Example: test-coverage
```

### Invalid Metric Type

```
Error in metric "coverage": type must be either 'numeric' or 'label'
Found: 'percentage'
```

### Empty Command

```
Error in metric "test-coverage": command cannot be empty
Provide a shell command that outputs the metric value
```

### Missing Required Fields

```
Error in metric "test-coverage": missing required fields
Required: type, command
Found: type
```

## Related Resources

- [Metrics Guide](../guides/metrics.md) - Metric configuration examples
- [Quality Gates Guide](../guides/quality-gates.md) - Threshold setup
- [Storage Guide](../guides/storage.md) - Storage configuration
- [CLI Reference](cli.md) - Validation commands
