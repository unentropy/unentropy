# GitHub Action Interface Contract

**Feature**: 003-mvp-metrics-tracking  
**Actions Version**: 1.0.0  
**Last Updated**: Thu Oct 16 2025

## Overview

This document defines the interface contracts for the two GitHub Actions provided by Unentropy for metrics tracking:
1. `collect-metrics` - Collects metrics during CI/CD runs
2. `generate-report` - Generates HTML reports from collected data

---

## Action 1: collect-metrics

### Purpose

Collect custom metrics defined in `unentropy.json` and store them in a SQLite database artifact.

### Action Metadata

**Location**: `.github/actions/collect-metrics/action.yml`

```yaml
name: 'Unentropy Collect Metrics'
description: 'Collect custom code metrics and store in SQLite database'
author: 'Unentropy Team'
branding:
  icon: 'bar-chart-2'
  color: 'blue'
```

### Inputs

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `config-path` | string | No | `./unentropy.json` | Path to configuration file relative to repository root |
| `database-path` | string | No | `.unentropy/metrics.db` | Path where database file is stored locally |
| `continue-on-error` | boolean | No | `true` | Continue workflow if metric collection fails |

**Input Specifications**:

#### `config-path`
- **Type**: File path string
- **Validation**: Must be a valid file path, file must exist
- **Examples**: 
  - `./unentropy.json` (default)
  - `./.unentropy/config.json`
  - `./config/metrics.json`

#### `database-path`
- **Type**: File path string
- **Validation**: Must be a valid file path
- **Notes**: Created automatically if doesn't exist
- **Examples**:
  - `.unentropy/metrics.db` (default)
  - `./metrics/data.db`

#### `continue-on-error`
- **Type**: Boolean
- **Validation**: `true` or `false`
- **Behavior**:
  - `true`: Logs errors but doesn't fail workflow
  - `false`: Fails workflow on any metric collection error

### Outputs

| Name | Type | Description |
|------|------|-------------|
| `metrics-collected` | number | Count of successfully collected metrics |
| `metrics-failed` | number | Count of metrics that failed to collect |
| `database-path` | string | Path to the database file that was created/updated |
| `build-id` | string | Database ID of the build context record created |

**Output Specifications**:

#### `metrics-collected`
- **Type**: Integer (as string)
- **Range**: 0 to number of metrics in config
- **Example**: `"5"`

#### `metrics-failed`
- **Type**: Integer (as string)
- **Range**: 0 to number of metrics in config
- **Example**: `"2"`

#### `database-path`
- **Type**: File path string
- **Example**: `".unentropy/metrics.db"`

#### `build-id`
- **Type**: Integer (as string)
- **Example**: `"42"`

### Environment Variables

The action reads the following GitHub Actions default environment variables:

| Variable | Usage | Source |
|----------|-------|--------|
| `GITHUB_SHA` | Commit SHA for build context | GitHub Actions |
| `GITHUB_REF` | Branch/tag reference | GitHub Actions |
| `GITHUB_RUN_ID` | Unique run identifier | GitHub Actions |
| `GITHUB_RUN_NUMBER` | Sequential run number | GitHub Actions |
| `GITHUB_ACTOR` | User/bot who triggered run | GitHub Actions |
| `GITHUB_EVENT_NAME` | Event type (push, pull_request, etc.) | GitHub Actions |
| `GITHUB_WORKSPACE` | Repository workspace path | GitHub Actions |

These variables are automatically passed to metric collection commands as `UNENTROPY_*` prefixed versions.

### Usage Example

```yaml
name: Collect Metrics
on: [push, pull_request]

jobs:
  metrics:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: '1.2'
      
      - name: Install dependencies
        run: bun install
      
      - name: Collect metrics
        id: collect
        uses: ./.github/actions/collect-metrics
        with:
          config-path: './unentropy.json'
          database-path: './my-metrics.db'
      
      - name: Show results
        run: |
          echo "Collected: ${{ steps.collect.outputs.metrics-collected }}"
          echo "Failed: ${{ steps.collect.outputs.metrics-failed }}"
      
      - name: Upload database artifact
        uses: actions/upload-artifact@v4
        with:
          name: my-metrics
          path: ./my-metrics.db
```

### Error Handling

#### Configuration Errors
- **Invalid config file**: Action fails with detailed validation error
- **Missing config file**: Action fails with file not found error
- **Schema validation**: Action fails with field-specific error messages

#### Collection Errors
- **Command execution failure**: Logged as warning, metric skipped
- **Command timeout**: Logged as warning, metric skipped
- **Parse error**: Logged as warning, metric skipped
- **Database error**: Action fails (data integrity)

#### Database Errors
- **Database initialization failure**: Action fails with database error details
- **Database corruption**: Action fails with integrity error
- **Permission denied**: Action fails with file system error

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success (all metrics collected) |
| 0 | Partial success (some metrics failed, `continue-on-error=true`) |
| 1 | Configuration error |
| 1 | Database error |
| 2 | Complete failure (all metrics failed, `continue-on-error=false`) |

---

## Action 2: generate-report

### Purpose

Generate an HTML report with metric trends from the SQLite database artifact.

### Action Metadata

**Location**: `.github/actions/generate-report/action.yml`

```yaml
name: 'Unentropy Generate Report'
description: 'Generate HTML report from collected metrics'
author: 'Unentropy Team'
branding:
  icon: 'file-text'
  color: 'green'
```

### Inputs

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `database-path` | string | No | `./unentropy-metrics.db` | Path to local database file |
| `output-path` | string | No | `./unentropy-report.html` | Path for generated HTML report |
| `time-range` | string | No | `all` | Time range filter (e.g., 'last-30-days', 'all') |
| `title` | string | No | `'Metrics Report'` | Report title |

**Input Specifications**:

#### `database-path`
- **Type**: File path string
- **Validation**: Must be a valid file path
- **Notes**: File must exist and be readable
- **Examples**:
  - `./unentropy-metrics.db` (default)
  - `./metrics/data.db`

#### `output-path`
- **Type**: File path string
- **Validation**: Must be valid writable path
- **Examples**:
  - `./unentropy-report.html` (default)
  - `./reports/metrics-$(date +%Y-%m-%d).html`

#### `time-range`
- **Type**: String
- **Validation**: Must match pattern `^(all|last-\d+-days|last-\d+-weeks|last-\d+-months)$`
- **Examples**:
  - `all` (default) - All historical data
  - `last-30-days` - Last 30 days only
  - `last-12-weeks` - Last 12 weeks
  - `last-6-months` - Last 6 months

#### `title`
- **Type**: String
- **Validation**: Max 100 characters
- **Examples**:
  - `'Metrics Report'` (default)
  - `'API Metrics - Q4 2025'`
  - `'Code Quality Dashboard'`

### Outputs

| Name | Type | Description |
|------|------|-------------|
| `report-path` | string | Path to generated HTML report |
| `metrics-count` | number | Number of metrics included in report |
| `data-points` | number | Total number of data points in report |
| `time-range-start` | string | ISO 8601 timestamp of oldest data point |
| `time-range-end` | string | ISO 8601 timestamp of newest data point |

**Output Specifications**:

#### `report-path`
- **Type**: File path string
- **Example**: `"./unentropy-report.html"`

#### `metrics-count`
- **Type**: Integer (as string)
- **Example**: `"8"`

#### `data-points`
- **Type**: Integer (as string)
- **Example**: `"456"`

#### `time-range-start`
- **Type**: ISO 8601 datetime string
- **Example**: `"2025-09-16T10:30:00Z"`

#### `time-range-end`
- **Type**: ISO 8601 datetime string
- **Example**: `"2025-10-16T14:22:00Z"`

### Usage Example

```yaml
name: Generate Weekly Report
on:
  schedule:
    - cron: '0 0 * * 0'  # Every Sunday at midnight
  workflow_dispatch:

jobs:
  report:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Download database artifact
        uses: actions/download-artifact@v4
        with:
          name: my-metrics
          path: ./
      
      - name: Generate report
        id: report
        uses: ./.github/actions/generate-report
        with:
          database-path: './my-metrics.db'
          output-path: './metrics-report.html'
          time-range: 'last-30-days'
          title: 'Monthly Metrics Report'
      
      - name: Upload report
        uses: actions/upload-artifact@v4
        with:
          name: metrics-report
          path: ${{ steps.report.outputs.report-path }}
      
      - name: Report summary
        run: |
          echo "Report generated with ${{ steps.report.outputs.metrics-count }} metrics"
          echo "Total data points: ${{ steps.report.outputs.data-points }}"
          echo "Time range: ${{ steps.report.outputs.time-range-start }} to ${{ steps.report.outputs.time-range-end }}"
```

### Error Handling

#### Database Errors
- **Database not found**: Action fails with clear error message
- **Database corruption**: Action fails with integrity check error
- **Permission denied**: Action fails with file system error

#### Data Errors
- **Empty database**: Generates report with "no data" message
- **Corrupted database**: Action fails with integrity check error
- **No data in time range**: Generates report with warning message

#### Generation Errors
- **Template error**: Action fails with template error details
- **Output path error**: Action fails with file system error
- **Chart rendering error**: Continues with text-only report

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success (report generated) |
| 1 | Artifact not found |
| 1 | Database error |
| 1 | Output file error |

---

## Workflow Integration Examples

### Basic Setup

```yaml
name: Metrics Pipeline
on: [push]

jobs:
  collect-and-report:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: '1.2'
      
      - run: bun install
      - run: bun run build
      - run: bun test
      
      - name: Download previous database
        uses: actions/download-artifact@v4
        with:
          name: unentropy-metrics
          path: ./
        continue-on-error: true
      
      - name: Collect metrics
        uses: ./.github/actions/collect-metrics
        with:
          database-path: './unentropy-metrics.db'
      
      - name: Upload database
        uses: actions/upload-artifact@v4
        with:
          name: unentropy-metrics
          path: ./unentropy-metrics.db
      
      - name: Generate report
        uses: ./.github/actions/generate-report
        with:
          database-path: './unentropy-metrics.db'
      
      - name: Upload report
        uses: actions/upload-artifact@v4
        with:
          name: metrics-report
          path: ./unentropy-report.html
```

### Separate Collection and Reporting

```yaml
# .github/workflows/collect-metrics.yml
name: Collect Metrics
on: [push, pull_request]

jobs:
  collect:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: '1.2'
      - run: bun install && bun test
      
      - name: Download previous database
        uses: actions/download-artifact@v4
        with:
          name: unentropy-metrics
          path: ./
        continue-on-error: true
      
      - name: Collect metrics
        uses: ./.github/actions/collect-metrics
        with:
          database-path: './unentropy-metrics.db'
      
      - name: Upload database
        uses: actions/upload-artifact@v4
        with:
          name: unentropy-metrics
          path: ./unentropy-metrics.db

---
# .github/workflows/generate-report.yml
name: Generate Report
on:
  schedule:
    - cron: '0 0 * * 1'  # Weekly on Monday
  workflow_dispatch:

jobs:
  report:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: '1.2'
      
      - name: Download database
        uses: actions/download-artifact@v4
        with:
          name: unentropy-metrics
          path: ./
      
      - name: Generate report
        uses: ./.github/actions/generate-report
        with:
          database-path: './unentropy-metrics.db'
          time-range: 'last-7-days'
      
      - name: Upload report
        uses: actions/upload-artifact@v4
        with:
          name: weekly-report
          path: ./unentropy-report.html
```

---

## Versioning and Compatibility

### Action Versioning

Actions follow semantic versioning:
- `v1.0.0` - Initial MVP release
- `v1.x.x` - Backward compatible updates
- `v2.0.0` - Breaking changes

### Usage in Workflows

```yaml
# Pin to major version (recommended)
- uses: ./.github/actions/collect-metrics@v1

# Pin to minor version (more stable)
- uses: ./.github/actions/collect-metrics@v1.0

# Pin to exact version (most stable)
- uses: ./.github/actions/collect-metrics@v1.0.0
```

### Compatibility Matrix

| Action Version | Config Schema | Database Schema | Bun Runtime |
|----------------|---------------|-----------------|-------------|
| v1.0.x | 1.0.0 | 1.0.0 | 1.2.x |
| v1.1.x | 1.0.0, 1.1.0 | 1.0.0, 1.1.0 | 1.2.x |

---

## Testing Contracts

### Unit Test Requirements

1. All inputs are validated
2. Default values are applied correctly
3. Outputs are set with correct values
4. Error messages are clear and actionable

### Integration Test Requirements

1. Actions work in actual GitHub Actions environment
2. Artifacts are uploaded/downloaded correctly
3. Concurrent runs don't corrupt data
4. Report generation handles missing data gracefully

---

## Security Considerations

### Permissions

Both actions require:
- `contents: read` - Read repository files
- `actions: write` - Upload/download artifacts

No additional permissions needed (no secrets, no network access).

### Input Validation

- All file paths are validated to prevent path traversal
- Artifact names are validated to prevent injection
- Time range strings are validated with regex

### Command Execution

- Metric commands run in isolated shell
- No user input is passed to commands (only config file)
- Commands timeout after 60 seconds using Bun's reliable process termination

---

## Deprecation Policy

Deprecated features will be supported for at least 6 months:
1. Announcement in release notes
2. Warning logs when deprecated feature is used
3. Documentation update with migration guide
4. Removal in next major version
