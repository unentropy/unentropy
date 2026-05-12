# Contract: Embedded Report Data Schema

**Feature**: 006-metrics-report  
**Date**: 2025-12-07

## Overview

This contract defines the structure of JSON data embedded in the generated HTML report's `<script>` tag. The structure is optimized for minimal payload size by sharing common data (timeline, metadata) across all charts rather than duplicating it.

---

## Current Optimized Structure

The existing implementation uses a shared timeline approach:

```typescript
interface ChartsData {
  timeline: string[];                    // Shared X-axis timestamps for all line charts
  metadata: (MetadataPoint | null)[];    // Shared commit SHA/run per build (sparse-aware)
  lineCharts: LineChartData[];           // Minimal per-chart data
  barCharts: BarChartData[];             // Label distribution charts
}

interface MetadataPoint {
  sha: string;    // Commit SHA (first 7 chars)
  run: number;    // Build/run number
}

interface LineChartData {
  id: string;
  name: string;
  unit: UnitType | null;
  values: (number | null)[];  // Aligned to timeline, null for gaps
}

interface BarChartData {
  id: string;
  name: string;
  unit: UnitType | null;
  labels: string[];
  counts: number[];
}
```

---

## Extended Structure for New Features

To support new features while preserving size optimizations:

```typescript
interface ChartsData {
  // Existing (shared across all charts)
  timeline: string[];                    // ISO timestamps for X-axis
  metadata: (MetadataPoint | null)[];    // Commit info per build
  lineCharts: LineChartData[];
  barCharts: BarChartData[];
  
  // New fields for 006 features
  buildCount: number;                    // For showToggle decision (< 10)
  
  // Preview data (only present when buildCount < 10)
  preview?: {
    timeline: string[];                  // 20 timestamps spanning 60 days
    lineCharts: PreviewLineChartData[];  // Synthetic values per metric
  };
  
  // Available date range for custom date picker constraints
  availableDateRange: {
    min: string;                         // ISO date (YYYY-MM-DD) of earliest build
    max: string;                         // ISO date (YYYY-MM-DD) of latest build
  };
}

interface LineChartData {
  id: string;
  name: string;
  unit: UnitType | null;
  values: (number | null)[];
  dataPointCount: number;                // NEW: Non-null count for zoom enable check
}

interface PreviewLineChartData {
  id: string;                            // Matches LineChartData.id
  values: number[];                      // 20 synthetic values (no nulls)
  stats: SummaryStats;                   // Stats for preview data
}
```

---

## Feature Flag Logic

All feature decisions are computed at generation time and embedded as simple boolean checks:

| Feature | Condition | Implementation |
|---------|-----------|----------------|
| Preview toggle | `buildCount < 10` | Check `chartsData.buildCount`, toggle visibility in JS |
| Zoom/pan | `dataPointCount >= 3` | Check per-chart in JS, disable zoom config if insufficient data |
| Preset date filters | Always enabled | Buttons always rendered |
| Custom date picker | Always enabled | Button always rendered; calendar constraints use `availableDateRange` |
| Tooltip sync | Always enabled | Event handlers always attached |
| PNG export | Always enabled | Export buttons always rendered |

No configuration flags are stored in the data - the logic is hardcoded in the client-side JS.

## Custom Date Picker Constraints

The calendar picker uses `availableDateRange` to disable dates outside the available data:

```javascript
// Calendar configuration
const calendarConfig = {
  minDate: chartsData.availableDateRange.min,  // "2025-01-01"
  maxDate: chartsData.availableDateRange.max,  // "2025-12-31"
  // Dates outside this range are grayed out and not selectable
};
```

This ensures users can only select dates for which data exists or could exist in the report.

---

## Size Optimization Principles

1. **Shared timeline**: All line charts use the same `timeline` array via index alignment
2. **Shared metadata**: Commit SHA and run numbers stored once, indexed by position
3. **No full Chart.js configs**: Chart configs are built client-side from minimal data
4. **Sparse nulls**: Missing data points are `null` in values array, not omitted
5. **Preview data optional**: Only included when `buildCount < 10`

---

## Client-Side Chart Building

Charts are constructed in the browser from minimal data:

```javascript
// Existing pattern - preserved
function buildLineChart(chart, timeline, metadata) {
  return {
    type: "line",
    data: {
      labels: timeline,  // Shared reference
      datasets: [{ 
        label: chart.name, 
        data: chart.values,
        // ... style constants applied here
      }]
    },
    options: {
      // ... built from constants + chart.unit for formatting
      plugins: {
        zoom: chart.values.filter(v => v !== null).length >= 3 
          ? zoomConfig 
          : { zoom: { enabled: false }, pan: { enabled: false } }
      }
    }
  };
}
```

## Client-Side State Management for Custom Date Picker

```javascript
// Global state for date filtering (client-side only)
const dateFilterState = {
  activeFilter: 'all',  // '7d' | '30d' | '90d' | 'all' | 'custom'
  customRange: {
    from: null,  // ISO date string or null
    to: null     // ISO date string or null
  },
  availableDateRange: chartsData.availableDateRange  // From embedded data
};

// When custom dates are selected
function applyCustomDateRange(fromDate, toDate) {
  // Validate
  if (fromDate > toDate) {
    showError("From date cannot be after To date");
    return;
  }
  
  // Update state
  dateFilterState.activeFilter = 'custom';
  dateFilterState.customRange = { from: fromDate, to: toDate };
  
  // Apply to all charts
  updateAllChartsDateRange(fromDate, toDate);
  updateFooter();
}

// When drag-to-zoom occurs
function onChartZoom(startDate, endDate) {
  dateFilterState.activeFilter = 'custom';
  dateFilterState.customRange = { from: startDate, to: endDate };
  highlightCustomButton();
  updateFooter();
}
```

---

## CDN Dependencies

```html
<!-- Existing -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js"></script>

<!-- New for zoom/pan -->
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom@2.0.1/dist/chartjs-plugin-zoom.min.js"></script>
```

---

## Migration Notes

Extending the existing `ChartsData` interface is backward compatible:

| Field | Status | Notes |
|-------|--------|-------|
| `timeline` | Unchanged | Shared X-axis |
| `metadata` | Unchanged | Shared build info |
| `lineCharts` | Extended | Added `dataPointCount` field |
| `barCharts` | Unchanged | Bar charts don't need new features |
| `buildCount` | New | For toggle visibility check |
| `preview` | New, optional | Only when < 10 builds |
