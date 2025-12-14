# Data Model: Metrics Report

**Feature**: 006-metrics-report  
**Date**: 2025-11-29  
**Updated**: 2025-12-07

## Overview

This document defines the data structures for the enhanced Metrics Report, including normalized build data, synthetic preview data, toggle state management, synchronized tooltips, zoom/pan state, date range filtering, and chart export.

---

## Entities

### 1. NormalizedBuildData

Represents the complete build history shared across all metric charts.

| Field | Type | Description |
|-------|------|-------------|
| builds | BuildContext[] | All builds in chronological order |
| timestamps | string[] | ISO timestamps for X-axis labels |
| count | number | Total number of builds |

**Source**: Derived from `getAllBuildContexts()` in existing repository

**Used by**: All chart configurations to ensure consistent X-axis

---

### 2. NormalizedMetricData

Represents a single metric's data aligned to the complete build history.

| Field | Type | Description |
|-------|------|-------------|
| metricId | string | Sanitized metric identifier |
| metricName | string | Display name |
| metricType | 'numeric' \| 'label' | Determines chart type |
| description | string \| null | Optional description |
| values | (number \| null)[] | Values aligned to build history, null for gaps |
| stats | SummaryStats | Calculated statistics (existing type) |
| dataPointCount | number | Actual number of non-null values |

**Relationships**:
- `values.length` === `NormalizedBuildData.count`
- Each index in `values` corresponds to same index in `NormalizedBuildData.timestamps`

---

### 3. SyntheticDataSet

Generated preview data for a metric when toggle is active.

| Field | Type | Description |
|-------|------|-------------|
| metricId | string | Links to NormalizedMetricData |
| timestamps | string[] | 20 ISO timestamps spanning 60 days |
| values | number[] | 20 synthetic data points |
| stats | SummaryStats | Statistics for synthetic data |
| seed | number | Deterministic seed used for generation |

**Generation Rules**:
- Always generates exactly 20 data points spanning 60 days (every 3 days)
- Uses mean-reverting algorithm with Gaussian noise
- Seed derived from `hash(metricName) XOR timestamp`
- Constrained to metric-appropriate ranges (e.g., 0-100 for percentages)
- Timestamps are generated relative to current date at report generation time

---

### 4. ReportRenderData

Extended report data structure including preview data and toggle visibility.

| Field | Type | Description |
|-------|------|-------------|
| metadata | ReportMetadata | Existing: repository, timestamps, build count |
| metrics | NormalizedMetricData[] | Metrics aligned to build history |
| showToggle | boolean | True if buildCount < 10 |
| previewData | SyntheticDataSet[] | One per metric (only if showToggle) |

**State Transitions**:
- `showToggle` is determined at generation time based on `buildCount < 10`
- Toggle state is runtime-only (client-side JavaScript)
- Default state: ON (showing synthetic preview data)
- Toggle OFF: Shows real sparse data (or empty charts if buildCount = 0)
- With 0 builds: Metrics are generated from config with empty real data arrays

---

### 5. ChartsData (Optimized Embedded JSON)

The actual data structure embedded in the HTML report, optimized for minimal payload size.

| Field | Type | Description |
|-------|------|-------------|
| timeline | string[] | Shared X-axis timestamps for all line charts |
| metadata | (MetadataPoint \| null)[] | Shared commit SHA/run per build position |
| lineCharts | LineChartData[] | Minimal per-chart data for line charts |
| barCharts | BarChartData[] | Label distribution charts |
| buildCount | number | Total builds (for toggle decision) |
| preview | PreviewData \| undefined | Only present when buildCount < 10 |

**Size Optimization**: Timeline and metadata are shared across all charts via index alignment, not duplicated per chart.

**LineChartData**:
| Field | Type | Description |
|-------|------|-------------|
| id | string | DOM element ID |
| name | string | Metric display name |
| unit | UnitType \| null | For value formatting |
| values | (number \| null)[] | Aligned to timeline, null for gaps |
| dataPointCount | number | Non-null count for zoom enable check |

**PreviewData** (only when buildCount < 10):
| Field | Type | Description |
|-------|------|-------------|
| timeline | string[] | 20 timestamps spanning 60 days |
| lineCharts | { id, values, stats }[] | Synthetic values per metric |

**Usage**: Chart.js configs are built client-side from this minimal data, not stored.

---

### 6. ZoomState (per chart)

Runtime state for synchronized drag-to-zoom, stored in `chart.crosshair` object.

| Field | Type | Description |
|-------|------|-------------|
| dragStarted | boolean | True if drag-to-zoom in progress |
| dragStartX | number \| null | Pixel X position where drag started |
| originalXRange | object | Stores `{min, max}` of original scale before zoom |
| button | HTMLButtonElement \| null | Reference to reset button element |
| ignoreNextEvents | number | Counter to skip events after zoom update |

**Zoom Configuration** (in `defaultOptions.zoom`):

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| enabled | boolean | true | Enable/disable zoom feature |
| zoomboxBackgroundColor | string | "rgba(59, 130, 246, 0.2)" | Selection box fill color |
| zoomboxBorderColor | string | "rgba(59, 130, 246, 0.5)" | Selection box border color |
| zoomButtonText | string | "Reset Zoom" | Button label text |
| zoomButtonClass | string | "reset-zoom-btn" | CSS class for button |
| minDataPoints | number | 10 | Minimum data points to enable zoom |
| minZoomRange | number | 4 | Minimum data points in zoom selection |

**Behavior**:
- Synchronized across all charts via `zoom-sync` and `zoom-reset` CustomEvents
- Reset restores original scale stored in `originalXRange`
- Disabled for charts with < 10 non-null data points
- Zoom rejected if selection contains < 4 data points

---

### 7. DateFilterState

Runtime state for date range filtering, supporting both preset and custom date ranges.

| Field | Type | Description |
|-------|------|-------------|
| activeFilter | '7d' \| '30d' \| '90d' \| 'all' \| 'custom' | Currently selected filter type |
| customRange | { from: string \| null, to: string \| null } | Custom date range in ISO format (YYYY-MM-DD) |
| effectiveDateRange | { start: string, end: string } | Computed effective date range (ISO format) |
| baseTimestamp | number | Most recent build timestamp (filter anchor for presets) |
| availableDateRange | { min: string, max: string } | Available data range for calendar constraints (ISO format) |

**State Transitions**:

| User Action | State Change |
|-------------|--------------|
| Click "7 days" | `activeFilter = '7d'`, `customRange = { from: null, to: null }` |
| Click "30 days" | `activeFilter = '30d'`, `customRange = { from: null, to: null }` |
| Click "90 days" | `activeFilter = '90d'`, `customRange = { from: null, to: null }` |
| Click "All" | `activeFilter = 'all'`, `customRange = { from: null, to: null }` |
| Select custom dates | `activeFilter = 'custom'`, `customRange = { from: <date>, to: <date> }` |
| Drag-to-zoom chart | `activeFilter = 'custom'`, `customRange` = extracted from zoom range |
| Click "Clear" in popover | `activeFilter = 'all'`, `customRange = { from: null, to: null }` |
| Click "Reset Zoom" | Restore previous `activeFilter` and `customRange` (before zoom) |

**Computed Properties**:

`effectiveDateRange` is computed based on current state:
- If `activeFilter === 'all'`: Start = earliest build, End = latest build
- If `activeFilter === 'custom'`: Start = customRange.from, End = customRange.to
- If `activeFilter === '7d'|'30d'|'90d'`: Calculated relative to most recent build

**Behavior**:
- Default is `activeFilter = 'all'` on page load
- Preset filters calculated relative to most recent build
- Custom range persists when popover is closed (unless cleared)
- Zoom operates within current filtered range
- Reset zoom restores pre-zoom filter state
- Custom range validation occurs before applying filter

---

### 8. TooltipSyncState

Runtime state for synchronized tooltips.

| Field | Type | Description |
|-------|------|-------------|
| activeIndex | number \| null | Currently hovered data point index |
| sourceChartId | string \| null | Chart that triggered the hover |

**Behavior**:
- All charts show tooltip for same build index
- Charts with no data at index show "No data for this build"
- Cleared when mouse leaves all chart areas

---

## Entity Relationships

```
NormalizedBuildData
       │
       │ defines X-axis for all
       ▼
┌──────────────────┐
│ NormalizedMetric │──── values aligned to builds
│     Data[]       │
└────────┬─────────┘
         │
         │ 1:1 relationship
         ▼
┌──────────────────┐
│ SyntheticDataSet │──── generated if showToggle
│       []         │
└──────────────────┘
         │
         │ combined into
         ▼
┌──────────────────┐
│  ChartRender     │──── passed to client JS
│    Context[]     │
└──────────────────┘
         │
         │ runtime state
         ▼
┌──────────────────────────────────────────┐
│  Client-Side Runtime State               │
│  ├── ZoomPanState (synchronized)         │
│  ├── DateFilterState                     │
│  └── TooltipSyncState                    │
└──────────────────────────────────────────┘
```

---

## Validation Rules

### NormalizedMetricData
- `values.length` MUST equal `NormalizedBuildData.count`
- `dataPointCount` MUST equal count of non-null values

### SyntheticDataSet
- `values.length` MUST equal 20
- `timestamps.length` MUST equal 20
- Timestamps MUST span 60 days (approximately 3-day intervals)
- All values MUST be finite numbers (no NaN/Infinity)
- Values MUST respect metric type constraints:
  - Numeric with unit '%': 0-100
  - Numeric without unit: no lower bound enforced
  - Label metrics: N/A (no synthetic data)

### ZoomPanState
- `isZoomed` MUST be true if `xMin` or `xMax` differs from filter range
- When `isZoomed` is true, "Reset zoom" button MUST be visible
- Charts with < 3 data points MUST have zoom disabled

### DateFilterState
- `activeFilter` MUST be one of: '7d', '30d', '90d', 'all', 'custom'
- `baseTimestamp` MUST be the most recent build timestamp in database
- When filter is 'all', xMin/xMax MUST be undefined (show all data)
- When `activeFilter === 'custom'`, `customRange.from` and `customRange.to` MUST both be non-null and valid ISO date strings
- `customRange.from` MUST be less than or equal to `customRange.to` (validated before applying filter)
- `customRange.from` MUST be greater than or equal to `availableDateRange.min`
- `customRange.to` MUST be less than or equal to `availableDateRange.max`
- `availableDateRange.min` MUST equal the timestamp of the earliest build in the database
- `availableDateRange.max` MUST equal the timestamp of the latest build in the database
- `effectiveDateRange` MUST accurately reflect the currently visible date range based on `activeFilter`
- When `activeFilter` is a preset ('7d'|'30d'|'90d'), `customRange` MUST be `{ from: null, to: null }`

### ReportRenderData
- `showToggle` MUST be true if `metadata.buildCount < 10`
- `previewData.length` MUST equal `metrics.length` when showToggle is true
- `previewData` MUST be empty array when showToggle is false

---

## State Management

### Server-Side (Generation Time)
- All entity data is computed during report generation
- Embedded as JSON in the HTML `<script>` tag
- Immutable after generation

### Client-Side (Runtime)
- Toggle state stored in DOM checkbox `checked` property
- Chart instances stored in JavaScript object by ID
- Zoom/pan state synchronized via callbacks
- Date filter state stored in activeFilter variable
- All state resets on page reload (no persistence)

```
┌─────────────────────────────────────────────────────────────────┐
│                        HTML Report                               │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ <script>                                                 │    │
│  │   const reportData = { /* embedded JSON */ }             │    │
│  │   const chartInstances = {};                             │    │
│  │   let showingPreview = false;                            │    │
│  │   let activeFilter = 'all';                              │    │
│  │   let zoomState = { isZoomed: false, xMin: null, ... }   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Event Handlers                                           │    │
│  │   Preview Toggle → Updates charts + stats                │    │
│  │   Date Filter    → Updates scale limits + zoom reset     │    │
│  │   Zoom/Pan       → Syncs all charts + shows reset btn    │    │
│  │   Chart Hover    → Broadcasts tooltip to all charts      │    │
│  │   Export PNG     → Canvas toDataURL + download           │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Migration Notes

This feature extends existing types without breaking changes:

| Existing Type | Change |
|---------------|--------|
| `ChartsData` | Add `buildCount`, optional `preview` |
| `LineChartData` | Add `dataPointCount` field |
| `ReportData` | No change (server-side only) |
| `MetricReportData` | Add `dataPointCount` field |

**Key Design Decision**: Chart.js configurations are NOT stored in the embedded JSON. They are built client-side from minimal data (id, name, unit, values) plus style constants. This keeps the payload small and allows runtime customization (zoom enable/disable based on dataPointCount).

Backward compatibility maintained - existing report generation continues to work.
