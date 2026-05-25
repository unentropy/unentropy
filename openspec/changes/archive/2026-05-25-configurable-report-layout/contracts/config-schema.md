# Configuration Schema: Report Block

**Domain**: reporting

**Extends**: `openspec/specs/metrics/contracts/config-schema.md`

## Overview

This contract defines the optional `report` object within `unentropy.json`. It controls how metrics are organized and displayed in the HTML report, including sections and multi-metric charts.

## Schema Definition

### Root Configuration Object (Report Block)

```typescript
interface UnentropyConfig {
  metrics: Record<string, MetricConfig>;
  report?: ReportConfig; // NEW: optional report layout configuration
}
```

### ReportConfig

Defines the structure and behavior of the generated HTML report.

```typescript
interface ReportConfig {
  // Optional: list of report sections
  sections?: ReportSection[];
}
```

**Field Specifications**:

| Field      | Type              | Required | Constraints | Description                                                               |
| ---------- | ----------------- | -------- | ----------- | ------------------------------------------------------------------------- |
| `sections` | `ReportSection[]` | No       | Min 1 item  | List of visually distinct sections. When absent, report uses flat layout. |

### ReportSection

A named grouping of charts within the report.

```typescript
interface ReportSection {
  // Required: display name for the section header
  name: string;

  // Optional: human-readable explanation shown below section name
  description?: string;

  // Required: list of charts in this section
  charts: ChartConfig[];
}
```

**Field Specifications**:

| Field         | Type            | Required | Constraints        | Description                                             |
| ------------- | --------------- | -------- | ------------------ | ------------------------------------------------------- |
| `name`        | string          | Yes      | Max 256 characters | Section header text.                                    |
| `description` | string          | No       | Max 512 characters | Subtitle text displayed under the section header.       |
| `charts`      | `ChartConfig[]` | Yes      | Min 1 item         | Charts to render within this section, in display order. |

### ChartConfig

Defines a single chart, which may display one or more metrics.

```typescript
interface ChartConfig {
  // Required: metric key(s) to display
  // Single metric: "loc"
  // Multiple metrics: ["typescript-loc", "javascript-loc"]
  metrics: string | string[];

  // Optional: custom title for the chart card
  // When absent, title is derived from metric name(s)
  title?: string;
}
```

**Field Specifications**:

| Field     | Type                 | Required | Constraints                               | Description                                                                                                        |
| --------- | -------------------- | -------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `metrics` | `string \| string[]` | Yes      | Each string must match a key in `metrics` | Metric identifier(s) to plot. Single string for one metric; array for multiple metrics on the same chart.          |
| `title`   | string               | No       | Max 256 characters                        | Custom chart title displayed on the chart card. When absent, the title is derived from the metric display name(s). |

## Validation Rules

- `report` is entirely optional; absence yields backward-compatible flat layout
- When `report.sections` is present:
  - Each `metrics` value must reference a key defined in the root `metrics` object
  - Unknown metric references are silently omitted from the report
  - Metrics not referenced in any chart are omitted from the report with no warning (they may be used in quality gates)
  - Duplicate metric references across charts are allowed (same metric may appear in multiple charts)
  - Sections and charts appear in their definition order from the configuration file
- When `report` is absent:
  - All metrics are rendered in a flat grid
  - Order follows the definition sequence in `metrics`
  - Each metric gets its own single-metric chart

## Example Configurations

### Flat Layout (Default)

```json
{
  "metrics": {
    "test-coverage": {
      "type": "numeric",
      "command": "npm run test:coverage -- --json | jq -r '.total.lines.pct'"
    },
    "bundle-size": {
      "type": "numeric",
      "command": "du -k dist/bundle.js | cut -f1"
    }
  }
}
```

### Sections with Single-Metric Charts

```json
{
  "metrics": {
    "typescript-loc": {
      "type": "numeric",
      "command": "@collect loc ./src --language TypeScript"
    },
    "javascript-loc": {
      "type": "numeric",
      "command": "@collect loc ./src --language JavaScript"
    },
    "test-coverage": {
      "type": "numeric",
      "command": "@collect coverage-lcov ./coverage/lcov.info"
    }
  },
  "report": {
    "sections": [
      {
        "name": "Code Size",
        "description": "Source code metrics by language",
        "charts": [{ "metrics": "typescript-loc" }, { "metrics": "javascript-loc" }]
      },
      {
        "name": "Test Coverage",
        "charts": [{ "metrics": "test-coverage" }]
      }
    ]
  }
}
```

### Multi-Metric Chart with Custom Title

```json
{
  "metrics": {
    "modern-classes": {
      "type": "numeric",
      "command": "grep -r 'class ' src/modern | wc -l"
    },
    "legacy-classes": {
      "type": "numeric",
      "command": "grep -r 'class ' src/legacy | wc -l"
    }
  },
  "report": {
    "sections": [
      {
        "name": "Refactoring Progress",
        "charts": [
          {
            "metrics": ["modern-classes", "legacy-classes"],
            "title": "Modern vs Legacy Class Count"
          }
        ]
      }
    ]
  }
}
```

### Single-Metric Chart with Custom Title

```json
{
  "metrics": {
    "bundle-size": {
      "type": "numeric",
      "command": "du -k dist/bundle.js | cut -f1",
      "unit": "bytes"
    }
  },
  "report": {
    "sections": [
      {
        "name": "Build",
        "charts": [
          {
            "metrics": "bundle-size",
            "title": "Production Bundle Size"
          }
        ]
      }
    ]
  }
}
```

## Validation Error Messages

**Empty sections array**:

```
Error: report.sections cannot be empty
Remove the report block or define at least one section
```

**Empty charts array**:

```
Error: Section "Code Size" has no charts
Each section must contain at least one chart
```
