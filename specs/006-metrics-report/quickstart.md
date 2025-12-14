# Quickstart: Metrics Report Enhancements

**Feature**: 006-metrics-report  
**Date**: 2025-11-29  
**Updated**: 2025-12-14 (Added custom date range picker)

## Overview

This guide provides quick implementation steps for enhancing the Metrics Report with normalized build history, missing data handling, preview data toggle, synchronized tooltips, zoom/pan, date range filtering, and chart export.

---

## Prerequisites

- Existing Unentropy installation with report generation working
- Understanding of `src/reporter/` module structure
- Familiarity with Preact components and Chart.js

---

## Implementation Steps

### Step 1: Add Synthetic Data Generator

Create `src/reporter/synthetic.ts`:

```typescript
import type { SummaryStats } from "./types";

function createSeededRng(seed: number): () => number {
  let state = seed;
  return function (): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

export function generateSyntheticData(
  metricName: string,
  existingStats: SummaryStats,
  unit: string | null
): number[] {
  const seed = hashString(metricName);
  const rng = createSeededRng(seed);

  const mean = existingStats.average ?? 50;
  const values: number[] = [];
  let current = mean * (0.8 + rng() * 0.4);

  for (let i = 0; i < 20; i++) {
    const noise = (rng() - 0.5) * mean * 0.1;
    const reversion = 0.2 * (mean - current);
    current = current + reversion + noise;

    if (unit === "%") {
      current = Math.max(0, Math.min(100, current));
    } else if (unit === "KB" || unit === "MB") {
      current = Math.max(0, current);
    }

    values.push(Math.round(current * 100) / 100);
  }

  return values;
}
```

### Step 2: Update Types

Extend existing types in `src/reporter/types.ts`:

```typescript
// Extend existing LineChartData
export interface LineChartData {
  id: string;
  name: string;
  unit: UnitType | null;
  values: (number | null)[];
  dataPointCount: number;        // NEW: for zoom enable check
}

// Extend existing ChartsData
export interface ChartsData {
  timeline: string[];
  metadata: (MetadataPoint | null)[];
  lineCharts: LineChartData[];
  barCharts: BarChartData[];
  buildCount: number;            // NEW: for toggle decision
  preview?: PreviewData;         // NEW: only when buildCount < 10
}

// NEW: Preview data structure
export interface PreviewData {
  timeline: string[];            // 20 timestamps spanning 60 days
  lineCharts: PreviewLineChart[];
}

export interface PreviewLineChart {
  id: string;                    // Matches LineChartData.id
  values: number[];              // 20 synthetic values
  stats: SummaryStats;
}
```

### Step 3: Create Toggle Component

Create `src/reporter/templates/default/components/PreviewToggle.tsx`:

```tsx
import type { JSX } from "preact";

interface PreviewToggleProps {
  visible: boolean;
}

export function PreviewToggle({ visible }: PreviewToggleProps): JSX.Element | null {
  if (!visible) {
    return null;
  }

  return (
    <div class="mt-4 sm:mt-0">
      <label class="inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          id="preview-toggle"
          class="sr-only peer"
          role="switch"
        />
        <div
          class={[
            "relative w-11 h-6 bg-gray-200 dark:bg-gray-700",
            "rounded-full peer peer-checked:bg-blue-600",
            "peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800",
            "after:content-[''] after:absolute after:top-[2px] after:start-[2px]",
            "after:bg-white after:border after:rounded-full",
            "after:h-5 after:w-5 after:transition-all",
            "peer-checked:after:translate-x-full",
          ].join(" ")}
        ></div>
        <span class="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">
          Show preview data
        </span>
      </label>
    </div>
  );
}
```

### Step 4: Update Header Component

Modify `src/reporter/templates/default/components/Header.tsx`:

```tsx
import type { JSX } from "preact";
import type { ReportMetadata } from "../../../types";
import { PreviewToggle } from "./PreviewToggle";

interface HeaderProps {
  metadata: ReportMetadata;
  showToggle: boolean;
}

export function Header({ metadata, showToggle }: HeaderProps): JSX.Element {
  return (
    <header class="bg-white dark:bg-gray-800 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 class="text-2xl font-bold">{metadata.repository}</h1>
          </div>
          <div class="mt-4 sm:mt-0 text-sm text-gray-600 dark:text-gray-400">
            <span>Builds: {metadata.buildCount}</span>
            <PreviewToggle visible={showToggle} />
          </div>
        </div>
      </div>
    </header>
  );
}
```

### Step 5: Update ChartScripts for Toggle

The existing `ChartScripts.tsx` already uses an optimized data structure. Extend the client-side script in `src/reporter/templates/default/scripts/charts.js` to handle preview data:

```javascript
// Add to existing initializeCharts function or create new function
function initializeChartsWithPreview(timeline, metadata, lineCharts, barCharts, preview) {
  var chartInstances = {};
  var showingPreview = false;
  
  // Build and initialize line charts
  lineCharts.forEach(function (chart) {
    var ctx = document.getElementById("chart-" + chart.id);
    if (ctx) {
      var config = buildLineChart(chart, timeline, metadata);
      // Disable zoom if insufficient data points
      if (chart.dataPointCount < 3) {
        config.options.plugins.zoom = { zoom: { enabled: false }, pan: { enabled: false } };
      }
      chartInstances[chart.id] = new Chart(ctx, config);
    }
  });

  // Build and initialize bar charts
  barCharts.forEach(function (chart) {
    var ctx = document.getElementById("chart-" + chart.id);
    if (ctx) {
      chartInstances[chart.id] = new Chart(ctx, buildBarChart(chart));
    }
  });

  // Preview toggle handler (only if preview data exists)
  var toggle = document.getElementById('preview-toggle');
  if (toggle && preview) {
    toggle.addEventListener('change', function(e) {
      showingPreview = e.target.checked;
      
      lineCharts.forEach(function(chart, i) {
        var instance = chartInstances[chart.id];
        if (instance) {
          if (showingPreview) {
            // Switch to preview data
            instance.data.labels = preview.timeline;
            instance.data.datasets[0].data = preview.lineCharts[i].values;
          } else {
            // Switch back to real data
            instance.data.labels = timeline;
            instance.data.datasets[0].data = chart.values;
          }
          instance.update('none');
        }
        
        // Update stats display
        var statsEl = document.getElementById('stats-' + chart.id);
        if (statsEl) {
          // Update stat values from preview.lineCharts[i].stats or original
        }
      });
    });
  }
  
  return chartInstances;
}
```

### Step 6: Update Generator for Preview Data

The generator already builds `ChartsData` with shared timeline. Extend it to include `buildCount` and optional `preview`:

```typescript
// In src/reporter/generator.ts - extend buildChartsData function

function buildChartsData(/* existing params */): ChartsData {
  // ... existing logic ...
  
  const buildCount = timeline.length;
  const showToggle = buildCount < 10;
  
  // Add dataPointCount to each lineChart
  const lineChartsWithCount = lineCharts.map(chart => ({
    ...chart,
    dataPointCount: chart.values.filter(v => v !== null).length
  }));
  
  // Generate preview data only when needed
  const preview = showToggle ? generatePreviewData(lineChartsWithCount) : undefined;
  
  return {
    timeline,
    metadata,
    lineCharts: lineChartsWithCount,
    barCharts,
    buildCount,
    preview
  };
}

function generatePreviewData(lineCharts: LineChartData[]): PreviewData {
  const previewTimeline = generateSyntheticTimestamps(new Date(), 60, 20);
  
  return {
    timeline: previewTimeline,
    lineCharts: lineCharts.map(chart => ({
      id: chart.id,
      values: generateSyntheticData(chart.name, /* existing stats */, chart.unit),
      stats: calculateSyntheticStats(/* synthetic values */)
    }))
  };
}
```

---

## Testing

### Visual Review

```bash
# Generate fixtures and open in browser
bun run visual-review
```

### Test Cases to Verify

1. **Toggle Visibility**
   - Open `sparse-data` fixture → toggle should appear
   - Open `full-featured` fixture → toggle should NOT appear

2. **Toggle Functionality**
   - Click toggle → charts should switch to preview data
   - Statistics should update to reflect preview values

3. **Gap Handling**
   - Create a metric with missing builds
   - Verify gap appears in chart (not connected line)

4. **Accessibility**
   - Tab to toggle → should have visible focus ring
   - Space/Enter → should toggle state
   - Screen reader should announce "Show preview data, switch"

---

---

## Step 7: Add Date Range Filter Component

**Note**: Before implementing the custom date picker, complete the calendar library research documented in `research.md` Section 12.

Create `src/reporter/templates/default/components/DateRangeFilter.tsx`:

```tsx
import type { JSX } from "preact";

export function DateRangeFilter(): JSX.Element {
  const filters = [
    { key: '7d', label: '7 days' },
    { key: '30d', label: '30 days' },
    { key: '90d', label: '90 days' },
    { key: 'all', label: 'All' },
    { key: 'custom', label: 'Custom' },
  ];

  return (
    <div class="flex gap-2">
      {filters.map(({ key, label }) => (
        <button
          data-filter={key}
          class={[
            "px-3 py-1 text-sm rounded transition-colors",
            key === 'all'
              ? "bg-blue-600 text-white"
              : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600",
          ].join(" ")}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
```

### Custom Date Picker Popover

After research phase, create the custom date picker popover component:

```tsx
// This will be implemented after selecting a calendar library
// See research.md Section 12 for library evaluation

export function CustomDatePickerPopover({ 
  visible, 
  availableDateRange,
  onRangeSelect,
  onClear,
  onClose 
}: CustomDatePickerProps): JSX.Element {
  // Implementation depends on selected calendar library
  // Key requirements:
  // - Calendar dropdowns for From/To dates
  // - Disable dates outside availableDateRange
  // - Validation: From <= To
  // - Clear button
  // - Intelligent positioning (mobile/desktop)
  return null; // Placeholder
}
```

---

## Step 8: Add Export Button to MetricCard

Update `src/reporter/templates/default/components/MetricCard.tsx`:

```tsx
// Add to the card header area
<button
  data-export={metricId}
  class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
  title="Download PNG"
>
  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
</button>
```

---

## Step 9: Update ChartScripts with All Features

Update `src/reporter/templates/default/components/ChartScripts.tsx` to include:

```javascript
// === Tooltip Synchronization ===
function syncTooltips(sourceChart, dataIndex) {
  Object.values(chartInstances).forEach(chart => {
    const data = chart.data.datasets[0]?.data;
    if (data && data[dataIndex] !== null) {
      chart.setActiveElements([{ datasetIndex: 0, index: dataIndex }]);
      chart.tooltip.setActiveElements([{ datasetIndex: 0, index: dataIndex }]);
    }
    chart.update('none');
  });
}

// Attach hover handlers
chartsData.forEach(({ id }) => {
  const chart = chartInstances[id];
  chart.options.onHover = (event, elements) => {
    if (elements.length > 0) {
      syncTooltips(chart, elements[0].index);
    }
  };
});

// === Zoom Synchronization ===
// Note: Zoom is now handled by the crosshair plugin and date-filters.js
// Drag-to-zoom automatically activates the Custom date filter
// Reset zoom by clicking date filter buttons (especially "All")

// === Date Range Filter (Preset + Custom) ===
const FILTER_DAYS = { '7d': 7, '30d': 30, '90d': 90, 'all': null, 'custom': null };
let dateFilterState = {
  activeFilter: 'all',
  customRange: { from: null, to: null },
  availableDateRange: chartsData.availableDateRange
};

document.querySelectorAll('[data-filter]').forEach(btn => {
  btn.addEventListener('click', () => {
    const filterKey = btn.dataset.filter;
    
    if (filterKey === 'custom') {
      // Open custom date picker popover
      openCustomDatePicker();
    } else {
      // Apply preset filter
      dateFilterState.activeFilter = filterKey;
      dateFilterState.customRange = { from: null, to: null };
      applyDateFilter(filterKey);
    }
    
    updateFilterButtonStyles(filterKey);
  });
});

function applyDateFilter(filterKey) {
  const days = FILTER_DAYS[filterKey];
  const maxTs = Math.max(...reportData.allTimestamps);
  
  Object.values(chartInstances).forEach(chart => {
    if (filterKey === 'all') {
      chart.options.scales.x.min = undefined;
      chart.options.scales.x.max = undefined;
    } else if (filterKey === 'custom') {
      // Apply custom range from dateFilterState
      const fromDate = new Date(dateFilterState.customRange.from).getTime();
      const toDate = new Date(dateFilterState.customRange.to).getTime();
      chart.options.scales.x.min = fromDate;
      chart.options.scales.x.max = toDate;
    } else {
      chart.options.scales.x.min = maxTs - (days * 24 * 60 * 60 * 1000);
      chart.options.scales.x.max = maxTs;
    }
    chart.resetZoom();
    chart.update('none');
  });
  
  updateFooter();
}

function applyCustomDateRange(fromDate, toDate) {
  // Validate
  if (fromDate > toDate) {
    showError("From date cannot be after To date");
    return;
  }
  
  // Update global state
  dateFilterState.activeFilter = 'custom';
  dateFilterState.customRange = { from: fromDate, to: toDate };
  
  // Apply filter
  applyDateFilter('custom');
  updateFilterButtonStyles('custom');
}

function updateFilterButtonStyles(activeKey) {
  document.querySelectorAll('[data-filter]').forEach(b => {
    const isActive = b.dataset.filter === activeKey;
    b.classList.toggle('bg-blue-600', isActive);
    b.classList.toggle('text-white', isActive);
    b.classList.toggle('bg-gray-200', !isActive);
  });
}

function updateFooter() {
  const footerEl = document.querySelector('footer .date-range');
  if (footerEl) {
    const visibleBuilds = getVisibleBuildCount();
    const { start, end } = getEffectiveDateRange();
    footerEl.textContent = `Builds: ${visibleBuilds} · ${start} – ${end}`;
  }
}

// When chart is zoomed via drag
function onChartZoom(startDate, endDate) {
  dateFilterState.activeFilter = 'custom';
  dateFilterState.customRange = { 
    from: startDate.split('T')[0],  // Convert to ISO date
    to: endDate.split('T')[0] 
  };
  updateFilterButtonStyles('custom');
  updateFooter();
}

// === PNG Export ===
document.querySelectorAll('[data-export]').forEach(btn => {
  btn.addEventListener('click', () => {
    const chartId = btn.dataset.export;
    const chartData = chartsData.find(c => c.id === chartId);
    exportChartAsPng(chartId, chartData?.metricName || chartId);
  });
});

function exportChartAsPng(chartId, metricName) {
  const chart = chartInstances[chartId];
  const canvas = chart.canvas;
  
  const exportCanvas = document.createElement('canvas');
  const ctx = exportCanvas.getContext('2d');
  const titleHeight = 40;
  
  exportCanvas.width = canvas.width;
  exportCanvas.height = canvas.height + titleHeight;
  
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
  
  ctx.fillStyle = '#1f2937';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(metricName, exportCanvas.width / 2, 25);
  
  if (showingPreview) {
    ctx.fillStyle = '#9ca3af';
    ctx.font = '12px sans-serif';
    ctx.fillText('(Preview Data)', exportCanvas.width / 2, titleHeight - 5);
  }
  
  ctx.drawImage(canvas, 0, titleHeight);
  
  const link = document.createElement('a');
  link.download = metricName.replace(/[^a-z0-9]/gi, '-') + '-chart.png';
  link.href = exportCanvas.toDataURL('image/png');
  link.click();
}
```

---

## Step 10: Update Header to Include Date Filter

Update `src/reporter/templates/default/components/Header.tsx`:

```tsx
import { DateRangeFilter } from "./DateRangeFilter";

export function Header({ metadata, showToggle }: HeaderProps): JSX.Element {
  return (
    <header class="bg-white dark:bg-gray-800 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold">{metadata.repository}</h1>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Builds: {metadata.buildCount}
            </p>
          </div>
          <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <DateRangeFilter />
            <PreviewToggle visible={showToggle} />
          </div>
        </div>
      </div>
    </header>
  );
}
```

---

## Step 11: Add Zoom Plugin CDN

Update `src/reporter/templates/default/HtmlDocument.tsx` to include the zoom plugin:

```tsx
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom@2.0.1/dist/chartjs-plugin-zoom.min.js"></script>
```

---

## Testing

### Visual Review

```bash
# Generate fixtures and open in browser
bun run visual-review
```

### Test Cases to Verify

1. **Toggle Visibility**
   - Open `sparse-data` fixture → toggle should appear
   - Open `full-featured` fixture → toggle should NOT appear

2. **Toggle Functionality**
   - Click toggle → charts should switch to preview data (60-day span)
   - Statistics should update to reflect preview values

3. **Gap Handling**
   - Create a metric with missing builds
   - Verify gap appears in chart (not connected line)

4. **Synchronized Tooltips**
   - Hover over chart A → all charts show tooltips for same build
   - Charts with no data show "No data for this build"

5. **Zoom and Pan**
   - Mouse wheel zoom → all charts zoom together
   - Click-drag → all charts pan together
   - Reset zoom button appears when zoomed
   - Charts with <3 points → zoom disabled

6. **Date Range Filter**
   - Click "7 days" → all charts show last 7 days
   - Click "All" → all charts show full range
   - Active filter is highlighted

7. **PNG Export**
   - Click export button → PNG downloads with metric name
   - Export while preview active → includes "(Preview Data)" watermark

8. **Accessibility**
   - Tab to toggle → should have visible focus ring
   - Space/Enter → should toggle state
   - Screen reader should announce "Show preview data, switch"

---

## Checklist

### Existing (from original spec)
- [ ] `src/reporter/synthetic.ts` created
- [ ] `src/reporter/types.ts` updated with new interfaces
- [ ] `PreviewToggle.tsx` component created
- [ ] `Header.tsx` updated to include toggle
- [ ] `ChartScripts.tsx` updated with toggle logic
- [ ] `generator.ts` updated for normalization and preview data
- [ ] Visual fixtures updated/verified
- [ ] Unit tests added for synthetic generation
- [ ] Integration tests added for toggle functionality

### New (from 2025-12-07 update)
- [ ] `DateRangeFilter.tsx` component created
- [ ] Export button added to MetricCard
- [ ] Reset zoom button added to MetricCard
- [ ] Tooltip synchronization implemented in ChartScripts
- [ ] Zoom/pan synchronization implemented in ChartScripts
- [ ] Date filter logic implemented in ChartScripts
- [ ] PNG export logic implemented in ChartScripts
- [ ] chartjs-plugin-zoom CDN added to HtmlDocument
- [ ] Synthetic data updated to span 60 days
- [ ] Visual fixtures updated for new features
- [ ] Integration tests added for zoom/filter/export

### New (from 2025-12-14 update - Custom Date Range)
- [ ] Calendar picker library research completed (see research.md Section 12)
- [ ] Calendar picker library selected and integrated
- [ ] `CustomDatePickerPopover.tsx` component created
- [ ] Custom date picker popover positioning implemented (mobile/desktop)
- [ ] Calendar constraints implemented (disable dates outside available range)
- [ ] Date validation implemented (From <= To)
- [ ] Global state updated to support custom date ranges
- [ ] Drag-to-zoom updates custom date range state
- [ ] Footer component updated to display build count and date range
- [ ] `availableDateRange` added to ChartsData schema
- [ ] Custom date picker tests added (validation, constraints, integration)
- [ ] Visual fixtures verified with custom date picker
