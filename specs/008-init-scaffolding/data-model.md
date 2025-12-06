# Data Model: Init Scaffolding & Test Commands

**Feature Branch**: `008-init-scaffolding`
**Date**: 2025-01-06

## Entities

### ProjectType

Represents one of the supported project types for detection and configuration generation.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `"javascript" \| "php" \| "go" \| "python"` | Unique identifier for the project type |
| `displayName` | `string` | Human-readable name (e.g., "JavaScript/TypeScript") |
| `markerFiles` | `string[]` | Files that indicate this project type |
| `priority` | `number` | Detection priority (lower = higher priority) |

**Values**:

| ID | Display Name | Marker Files | Priority |
|----|--------------|--------------|----------|
| `javascript` | JavaScript/TypeScript | `package.json`, `tsconfig.json`, `bun.lockb`, `pnpm-lock.yaml`, `yarn.lock`, `package-lock.json` | 1 |
| `php` | PHP | `composer.json`, `composer.lock` | 2 |
| `go` | Go | `go.mod`, `go.sum` | 3 |
| `python` | Python | `pyproject.toml`, `setup.py`, `requirements.txt`, `Pipfile`, `setup.cfg` | 4 |

### DetectionResult

Result of project type detection.

| Field | Type | Description |
|-------|------|-------------|
| `type` | `ProjectType["id"]` | Detected project type identifier |
| `detectedFiles` | `string[]` | Which marker files were found |

### StorageType

Storage backend options.

| Value | Config Value | Description |
|-------|--------------|-------------|
| `artifact` | `sqlite-artifact` | GitHub Actions artifacts (default) |
| `s3` | `sqlite-s3` | S3-compatible storage |
| `local` | `sqlite-local` | Local file storage |

### ConfigTemplate

Pre-defined configuration template for a project type.

| Field | Type | Description |
|-------|------|-------------|
| `projectType` | `ProjectType["id"]` | Which project type this template is for |
| `metrics` | `MetricConfig[]` | Default metrics for this project type |
| `qualityGate` | `QualityGateConfig` | Default quality gate settings |

### MetricConfig

Configuration for a single metric within a template.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `key` | `string` | Yes | Metric identifier (lowercase, hyphens) |
| `$ref` | `string` | No | Built-in template reference |
| `name` | `string` | No | Display name |
| `description` | `string` | No | Human-readable description |
| `command` | `string` | Yes | Collection command |

### QualityGateConfig

Default quality gate configuration.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `mode` | `"soft"` | `"soft"` | Gate enforcement mode |
| `thresholds` | `ThresholdConfig[]` | See below | Default thresholds |

**Default Threshold**:
- Metric: `test-coverage`
- Mode: `min`
- Target: `80`
- Severity: `warning`

### WorkflowExample

GitHub Actions workflow example for output.

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Workflow name (e.g., "Metrics", "CI") |
| `trigger` | `string` | When workflow runs (e.g., "push to main", "pull_request") |
| `setupSteps` | `string` | Language-specific setup YAML |
| `testCommand` | `string` | Test command with coverage |
| `unentropyStep` | `string` | Unentropy action configuration |

### CollectionResult

Result of running a single metric's collection command (used by `test` command).

| Field | Type | Description |
|-------|------|-------------|
| `metricKey` | `string` | The metric identifier from config |
| `metricName` | `string` | Display name of the metric |
| `success` | `boolean` | Whether collection succeeded |
| `value` | `number \| string \| null` | Collected value (null if failed) |
| `unit` | `string \| undefined` | Unit type (percent, integer, bytes, etc.) |
| `duration` | `number` | Collection time in milliseconds |
| `error` | `string \| undefined` | Error message if failed |
| `command` | `string` | The command that was executed |

### TestSummary

Summary of all metric collections (used by `test` command output).

| Field | Type | Description |
|-------|------|-------------|
| `configValid` | `boolean` | Whether config schema validation passed |
| `configError` | `string \| undefined` | Schema validation error if any |
| `results` | `CollectionResult[]` | Results for each metric |
| `totalMetrics` | `number` | Total number of metrics attempted |
| `successCount` | `number` | Number of successful collections |
| `failureCount` | `number` | Number of failed collections |
| `totalDuration` | `number` | Total time for all collections |

## Relationships

```
ProjectType (1) -----> (1) ConfigTemplate
     |
     v
DetectionResult

ConfigTemplate (1) -----> (n) MetricConfig
                    \
                     `---> (1) QualityGateConfig

StorageType --> ConfigTemplate (used to set storage.type)

WorkflowExample <---- ProjectType (generated per project type)
                <---- StorageType (includes storage-specific config)

--- Test Command ---

UnentropyConfig (loaded) --> (n) MetricConfig
                                    |
                                    v
                            CollectionResult (per metric)
                                    |
                                    v
                               TestSummary
```

## State Transitions

Both commands are stateless - they perform operations and exit. No persistent state or transitions.

### Test Command Flow

```
Start
  │
  v
Load Config ──(invalid)──> Exit 1 (schema error)
  │
  (valid)
  │
  v
For each metric (sequential):
  │
  ├──> Run command
  │       │
  │       ├──(success)──> Store result with value
  │       │
  │       └──(failure)──> Store result with error
  │
  v
Display Summary
  │
  ├──(all success)──> Exit 0
  │
  └──(any failure)──> Exit 2
```

## Validation Rules

### ProjectType Detection
- Only check files in current working directory (not subdirectories)
- First matching project type wins (by priority)
- Return null if no marker files found

### MetricConfig
- Key must match regex: `^[a-z0-9-]+$`
- Key length: 1-64 characters
- Command must be non-empty, max 1024 characters

### Generated Config
- Must contain at least 1 metric
- All threshold metrics must reference existing metric keys
- Storage type must be valid enum value

## Config Templates by Project Type

### JavaScript/TypeScript

```json
{
  "metrics": {
    "lines-of-code": {
      "$ref": "loc",
      "name": "Lines of Code",
      "command": "@collect loc ./src --language TypeScript"
    },
    "test-coverage": {
      "$ref": "coverage",
      "name": "Test Coverage",
      "command": "@collect coverage-lcov coverage/lcov.info"
    },
    "bundle": {
      "$ref": "bundle",
      "name": "Bundle Size",
      "command": "@collect size dist"
    }
  }
}
```

### PHP

```json
{
  "metrics": {
    "lines-of-code": {
      "$ref": "loc",
      "name": "Lines of Code",
      "command": "@collect loc ./src --language PHP"
    },
    "test-coverage": {
      "$ref": "coverage",
      "name": "Test Coverage",
      "command": "@collect coverage-lcov coverage/lcov.info"
    }
  }
}
```

### Go

```json
{
  "metrics": {
    "lines-of-code": {
      "$ref": "loc",
      "name": "Lines of Code",
      "command": "@collect loc . --language Go"
    },
    "test-coverage": {
      "$ref": "coverage",
      "name": "Test Coverage",
      "command": "go tool cover -func=coverage.out | grep total | awk '{print $3}' | tr -d '%'"
    },
    "binary-size": {
      "$ref": "size",
      "name": "Binary Size",
      "command": "@collect size ./bin"
    }
  }
}
```

### Python

```json
{
  "metrics": {
    "lines-of-code": {
      "$ref": "loc",
      "name": "Lines of Code",
      "command": "@collect loc ./src --language Python"
    },
    "test-coverage": {
      "$ref": "coverage",
      "name": "Test Coverage",
      "command": "@collect coverage-lcov coverage.lcov"
    }
  }
}
```
