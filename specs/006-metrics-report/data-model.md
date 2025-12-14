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

### 6. ZoomState (per chart) - crosshair-plugin.js

Runtime state for synchronized drag-to-zoom, stored in `chart.crosshair` object.

**Location**: `src/reporter/templates/default/scripts/crosshair-plugin.js` (integrated with crosshair plugin)

| Field | Type | Description |
|-------|------|-------------|
| dragStarted | boolean | True if drag-to-zoom in progress |
| dragStartX | number \| null | Pixel X position where drag started |
| originalXRange | object | Stores `{min, max}` of original scale before zoom |
| ignoreNextEvents | number | Counter to skip events after zoom update |

**Zoom Configuration** (in `defaultOptions.zoom`):

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| enabled | boolean | true | Enable/disable zoom feature |
| zoomboxBackgroundColor | string | "rgba(59, 130, 246, 0.2)" | Selection box fill color |
| zoomboxBorderColor | string | "rgba(59, 130, 246, 0.5)" | Selection box border color |
| minDataPoints | number | 10 | Minimum data points to enable zoom |
| minZoomRange | number | 4 | Minimum data points in zoom selection |

**Behavior**:
- Synchronized across all charts via `zoom-sync` CustomEvent
- **No Reset Zoom button** - zoom is reset by clicking date filter buttons (especially "All")
- Drag-to-zoom activates Custom date filter and updates Custom button label
- Disabled for charts with < 10 non-null data points
- Zoom rejected if selection contains < 4 data points
- Zoom communicates with date-filters.js via CustomEvent to update filter state

---

### 7. DateFilterState (date-filters.js)

Runtime state for date range filtering, managed in `date-filters.js` script file.

**Location**: `src/reporter/templates/default/scripts/date-filters.js` (separate script, bundled as text import)

| Field | Type | Description |
|-------|------|-------------|
| activeFilter | '7d' \| '30d' \| '90d' \| 'all' \| 'custom' | Currently selected filter type |
| customRange | { from: string \| null, to: string \| null } | Custom date range in ISO format (YYYY-MM-DD) |
| customButtonLabel | string | Dynamic button text ("Custom" or "YYYY-MM-DD – YYYY-MM-DD") |
| availableDateRange | { min: string, max: string } | Available data range from chartsData (ISO format YYYY-MM-DD) |

**State Transitions**:

| User Action | State Change | Custom Button Label | Zoom Clearing |
|-------------|--------------|---------------------|---------------|
| Click "7 days" | `activeFilter = '7d'`, `customRange = { from: null, to: null }` | "Custom" | ✅ Clears zoom |
| Click "30 days" | `activeFilter = '30d'`, `customRange = { from: null, to: null }` | "Custom" | ✅ Clears zoom |
| Click "90 days" | `activeFilter = '90d'`, `customRange = { from: null, to: null }` | "Custom" | ✅ Clears zoom |
| Click "All" | `activeFilter = 'all'`, `customRange = { from: null, to: null }` | "Custom" | ✅ Clears zoom |
| Select custom dates | `activeFilter = 'custom'`, `customRange = { from, to }` | "YYYY-MM-DD – YYYY-MM-DD" | ✅ Clears zoom |
| Drag-to-zoom chart | `activeFilter = 'custom'`, `customRange` = extracted from zoom range | "YYYY-MM-DD – YYYY-MM-DD" | N/A (creates zoom) |
| Click "Clear" in popover | `activeFilter = 'all'`, `customRange = { from: null, to: null }` | "Custom" | ✅ Clears zoom |

**Custom Button Label Formatting**:

The `customButtonLabel` displays in the Custom button and is computed as:
- If `activeFilter !== 'custom'` OR `customRange.from === null`: Show "Custom" (no date range)
- If `activeFilter === 'custom'` AND `customRange.from` is set: Show "{from} – {to}" in YYYY-MM-DD format

This makes the active custom filter immediately visible in the header without needing to scroll to footer.

**Behavior**:
- Default is `activeFilter = 'all'` on page load
- Preset filters (7d/30d/90d) are relative to most recent build timestamp
- Custom range persists when popover is closed (unless explicitly cleared)
- Drag-to-zoom activates Custom filter and updates button label
- Clicking any filter button (preset or Clear) clears zoom state
- Custom range validated before applying (From <= To, within availableDateRange)
- **No Reset Zoom button** - users click filter buttons to reset view

**UI Display Strategy**:
- **Custom button label** is the primary indicator of active custom date range (shows "YYYY-MM-DD – YYYY-MM-DD")
- **Footer** remains static, always showing total database stats (not affected by filters)
- This ensures the active filter is immediately visible without scrolling

**Architecture**:
- Date filter logic is extracted to `date-filters.js` (separate from HtmlDocument.tsx)
- Initialized via `window.initializeDateFilters(chartsData, chartInstances)` in ChartScripts.tsx
- Communicates with crosshair-plugin.js via CustomEvents ('zoom-sync')
- Uses native HTML5 `<input type="date">` for calendar pickers (zero dependencies)

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

### ZoomState
- Zoom MUST be disabled for charts with < 10 non-null data points
- Zoom selection MUST contain at least 4 data points to be applied
- When zoom is applied via drag, Custom date filter MUST activate
- Custom button label MUST update to show zoomed date range
- **No Reset Zoom button exists** - users reset via date filter buttons

### DateFilterState
- `activeFilter` MUST be one of: '7d', '30d', '90d', 'all', 'custom'
- When filter is 'all', chart scale min/max MUST be undefined (show all data)
- When `activeFilter === 'custom'`, `customRange.from` and `customRange.to` MUST both be non-null and valid ISO date strings (YYYY-MM-DD format)
- `customRange.from` MUST be less than or equal to `customRange.to` (validated before applying filter)
- `customRange.from` MUST be greater than or equal to `availableDateRange.min`
- `customRange.to` MUST be less than or equal to `availableDateRange.max`
- `availableDateRange.min` MUST equal the date of the earliest build in the database (YYYY-MM-DD format)
- `availableDateRange.max` MUST equal the date of the latest build in the database (YYYY-MM-DD format)
- When `activeFilter` is a preset ('7d'|'30d'|'90d'), `customRange` MUST be `{ from: null, to: null }`
- When `activeFilter === 'custom'`, `customButtonLabel` MUST show the formatted date range
- When `activeFilter !== 'custom'`, `customButtonLabel` MUST show "Custom"
- HTML5 date inputs MUST have `min` and `max` attributes set from `availableDateRange`

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
