# Built-in Metric Templates Reference

**Feature**: 005-metrics-gallery  
**File**: Built-in Metric Templates  
**Last Updated**: 2025-12-10  
**Purpose**: Reference documentation for the 6 built-in metric templates shipped with Unentropy

## Overview

This document provides detailed information about the 6 built-in metric templates available in Unentropy. Each template includes metadata (description, type, unit) and may include a default command using the `@collect` syntax for in-process execution.

## Unit Types

Units are semantic types that determine how metric values are formatted consistently across HTML reports and PR comments:

| UnitType   | Display Example | Use Case                                        |
| ---------- | --------------- | ----------------------------------------------- |
| `percent`  | `85.5%`         | Coverage metrics                                |
| `integer`  | `1,234`         | LOC, counts                                     |
| `bytes`    | `1.5 MB`        | Bundle size (auto-scales B -> KB -> MB -> GB)   |
| `duration` | `1m 30s`        | Build/test time (auto-scales ms -> s -> m -> h) |
| `decimal`  | `3.14`          | Generic numeric                                 |

## Metric Templates

### 1. `coverage` - Test Coverage Percentage

- **Description**: Overall test coverage percentage across the codebase
- **Type**: numeric
- **Unit**: `percent`
- **Default Command**: None (technology-specific)
- **Default Threshold**: no-regression
- **Supported Formats**: LCOV (`@collect coverage-lcov`), Cobertura (`@collect coverage-cobertura`)
- **Coverage Types**: Line (default), branch, function (via `--type` option)

### 2. `loc` - Lines of Code

- **Description**: Total lines of code in the codebase
- **Type**: numeric
- **Unit**: `integer`
- **Default Command**: `@collect loc .`
- **Default Threshold**: none

### 3. `size` - Production Bundle Size

- **Description**: Total size of production build artifacts
- **Type**: numeric
- **Unit**: `bytes`
- **Default Command**: `@collect size ./dist`
- **Default Threshold**: delta-max-drop (5% maximum increase)

### 4. `build-time` - Build Duration

- **Description**: Time taken to complete the build
- **Type**: numeric
- **Unit**: `duration`
- **Default Command**: None (too project-specific)
- **Default Threshold**: delta-max-drop (10% maximum increase)

### 5. `test-time` - Test Suite Duration

- **Description**: Time taken to run all tests
- **Type**: numeric
- **Unit**: `duration`
- **Default Command**: None (too project-specific)
- **Default Threshold**: delta-max-drop (10% maximum increase)

### 6. `dependencies-count` - Dependency Count

- **Description**: Total number of direct dependencies
- **Type**: numeric
- **Unit**: `integer`
- **Default Command**: None (varies by package manager)
- **Default Threshold**: none

## Command Resolution Details

### Template without Default Command

When a template has no default command (e.g., `build-time`, `test-time`, `dependencies-count`, `coverage`), users must explicitly provide a `command` field.

Example:

```json
{
  "build-time": {
    "$ref": "build-time",
    "command": "npm run build"
  }
}
```

### Invalid `$ref`

Referencing a non-existent template ID results in a clear error message listing available template IDs.

### Unknown Collector

Using an unknown collector with `@collect` results in an error listing available collectors.

### Glob Pattern Matching

The `@collect size` command supports glob patterns for file matching. If no files match the pattern, the command fails with an error rather than returning a fallback value.

## Usage Examples

### Ultra-minimal Setup

```json
{
  "loc": { "$ref": "loc" }
}
```

### Customized Template Reference

```json
{
  "src-loc": {
    "$ref": "loc",
    "command": "@collect loc ./src --language TypeScript"
  }
}
```

### Override Template Defaults

```json
{
  "test-coverage": {
    "$ref": "coverage",
    "name": "Test Coverage",
    "command": "npm run test:coverage"
  }
}
```

### Mixed Configuration

```json
{
  "loc": { "$ref": "loc" },
  "custom-metric": {
    "type": "numeric",
    "command": "echo 42",
    "description": "A custom metric that always returns 42",
    "unit": "integer"
  }
}
```
