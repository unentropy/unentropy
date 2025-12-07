# Research: Metrics Report

**Feature**: 006-metrics-report  
**Date**: 2025-11-29  
**Updated**: 2025-12-07

## Overview

This document consolidates research findings for implementing the Metrics Report enhancements: normalized build history across charts, missing data handling, preview data toggle, synchronized tooltips, zoom/pan, date range filtering, and chart export.

---

## 1. Chart.js Gap Handling for Missing Data Points

### Decision
Use `null` values in the data array combined with `spanGaps: false` to display visual gaps where metrics are missing for specific builds.

### Rationale
- Chart.js natively treats `null`, `NaN`, or `undefined` as "skipped" points, creating natural gaps
- Setting `spanGaps: false` (default) ensures gaps are visible rather than connected
- The `segment` option allows styling gap regions differently (e.g., dashed lines) if desired
- Tooltips naturally skip `null` points - no special handling needed for basic behavior

### Alternatives Considered
| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Interpolate missing values | Continuous line, no gaps | Misleading - implies data exists | Rejected |
| Use `spanGaps: true` with dashed segments | Shows continuity with visual cue | More complex, may confuse users | Rejected for MVP |
| Use `null` with `spanGaps: false` | Clear gap, accurate representation | Some users may find gaps jarring | **Selected** |

### Implementation Details

```typescript
// Data structure with gaps for missing builds
const dataWithGaps = allBuilds.map(build => {
  const metricValue = getMetricValueForBuild(metricName, build.id);
  return metricValue !== undefined ? metricValue : null;
});

// Chart.js configuration
const chartConfig = {
  type: 'line',
  data: {
    labels: allBuilds.map(b => b.timestamp),
    datasets: [{
      data: dataWithGaps,
      spanGaps: false, // Ensures gaps are visible
    }]
  }
};
```

### Tooltip Handling for Gaps
The `interaction.intersect: false` setting combined with `mode: 'index'` allows tooltips to appear at X positions even when no data point exists. Custom tooltip callback can show "No data recorded" message.

---

## 2. Normalized X-Axis Across All Metrics

### Decision
All charts share the same `labels` array derived from the complete list of build contexts, ensuring visual alignment across metric cards.

### Rationale
- Users need to compare metrics at the same build/time points
- Missing data is explicitly shown as gaps rather than condensed timelines
- Consistent X-axis allows for easier visual scanning across cards

### Implementation Approach
1. Query all build contexts from the database (already available via `getAllBuildContexts()`)
2. Pass the complete build list to report generation
3. For each metric, map values to the full build list, using `null` for missing entries

```typescript
interface NormalizedMetricData {
  labels: string[];           // All build timestamps
  values: (number | null)[];  // Values or null for gaps
}

function normalizeMetricData(
  allBuilds: BuildContext[],
  metricTimeSeries: TimeSeriesData
): NormalizedMetricData {
  const buildMap = new Map(
    metricTimeSeries.dataPoints.map(dp => [dp.timestamp, dp.valueNumeric])
  );
  
  return {
    labels: allBuilds.map(b => b.timestamp),
    values: allBuilds.map(b => buildMap.get(b.timestamp) ?? null),
  };
}
```

---

## 3. Tailwind CSS Toggle Component

### Decision
Implement toggle using native checkbox with Tailwind CSS styling and `peer` utilities. No additional JavaScript framework required.

### Rationale
- Native checkbox provides built-in accessibility (keyboard, screen reader)
- Tailwind's `peer` modifier enables CSS-only state styling
- `sr-only` class hides checkbox visually while keeping it accessible
- Works in static HTML without React/Vue runtime

### Implementation Pattern

```html
<label class="inline-flex items-center cursor-pointer">
  <input 
    type="checkbox" 
    id="preview-toggle"
    class="sr-only peer"
    role="switch"
  />
  <div class="
    relative w-11 h-6
    bg-gray-200 dark:bg-gray-700
    rounded-full peer
    peer-checked:bg-blue-600
    peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800
    after:content-[''] after:absolute after:top-[2px] after:start-[2px]
    after:bg-white after:border after:rounded-full
    after:h-5 after:w-5 after:transition-all
    peer-checked:after:translate-x-full
  "></div>
  <span class="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">
    Show preview data
  </span>
</label>
```

### Accessibility Features
- `role="switch"` for screen readers
- Keyboard accessible via native checkbox (Space/Enter)
- `peer-focus:ring-4` provides visible focus indicator
- Dark mode support via `dark:` prefixed classes
- Label wrapping makes entire element clickable

---

## 4. Synthetic Data Generation

### Decision
Use seeded Mulberry32 PRNG with mean-reverting (Ornstein-Uhlenbeck) algorithm for generating realistic preview data.

### Rationale
- Deterministic: same metric name + timestamp seed produces same output
- Mean-reverting creates natural fluctuation around a central value
- Gaussian noise (Box-Muller) provides bell-curve distributed variations
- Existing data statistics inform value ranges and volatility

### Alternatives Considered
| Algorithm | Use Case | Decision |
|-----------|----------|----------|
| Pure random walk | Unrealistic unbounded drift | Rejected |
| Geometric Brownian Motion | Percentage metrics | Could use for coverage % |
| Mean-reverting (O-U) | Most metrics | **Selected** - most realistic |
| Linear interpolation | Filling gaps | Rejected - too artificial |

### Key Implementation Components

**1. Seeded PRNG (Mulberry32)**
```typescript
function createSeededRng(seed: number): () => number {
  let state = seed;
  return function(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

**2. Deterministic Seed from Metric**
```typescript
function createMetricSeed(metricName: string, baseTimestamp: number): number {
  let hash = 5381;
  for (let i = 0; i < metricName.length; i++) {
    hash = ((hash << 5) + hash) + metricName.charCodeAt(i);
  }
  return Math.abs((hash ^ baseTimestamp) | 0);
}
```

**3. Mean-Reverting Generation**
```typescript
function generateMeanReverting(
  startValue: number,
  meanValue: number,
  revertSpeed: number,  // 0.1-0.3 typical
  volatility: number,
  steps: number,
  rng: () => number
): number[] {
  const values = [startValue];
  for (let i = 1; i < steps; i++) {
    const prev = values[i - 1];
    const noise = gaussianRandom(rng);
    const change = revertSpeed * (meanValue - prev) + volatility * noise;
    values.push(prev + change);
  }
  return values;
}
```

### Parameters by Metric Type
| Type | Typical Value | Constraints | Volatility |
|------|---------------|-------------|------------|
| Coverage | 75% | 0-100 | 2-5% of mean |
| Size (KB) | 500 | 0-∞ | 5-10% of mean |
| Count | 100 | 0-∞, integer | 5-15% of mean |
| Duration (ms) | 30000 | 0-∞ | 10-20% of mean |

---

## 5. Client-Side State Management

### Decision
Use vanilla JavaScript with DOM event listeners for toggle state. Chart.js instance `update()` method for re-rendering.

### Rationale
- Report is static HTML with no framework runtime
- Chart.js instances are already tracked in the rendered script
- Toggle state doesn't need to persist (resets on page reload per spec)

### Implementation Pattern

```javascript
// In rendered <script> tag
const toggle = document.getElementById('preview-toggle');
const chartInstances = {}; // Store Chart.js instances by ID

// Initialize charts
chartsData.forEach(({ id, config }) => {
  const ctx = document.getElementById('chart-' + id);
  if (ctx) {
    chartInstances[id] = new Chart(ctx, config);
  }
});

// Toggle handler
toggle?.addEventListener('change', function(e) {
  const showPreview = e.target.checked;
  
  chartsData.forEach(({ id, realData, previewData }) => {
    const chart = chartInstances[id];
    if (chart) {
      chart.data.datasets[0].data = showPreview ? previewData : realData;
      chart.update('none'); // No animation for instant switch
    }
  });
  
  // Update statistics displays
  updateStatistics(showPreview);
});
```

---

---

## 6. Synchronized Tooltips Across Charts

### Decision
Use Chart.js external tooltip mode with custom event broadcasting to synchronize tooltips across all charts when hovering over any single chart.

### Rationale
- Chart.js `interaction.mode: 'index'` only works within a single chart
- Cross-chart synchronization requires custom JavaScript event handling
- Using `chart.setActiveElements()` and `chart.tooltip.setActiveElements()` APIs
- Broadcasting mouse events via custom event system ensures all charts respond

### Implementation Approach

```javascript
// Global tooltip synchronization
const charts = Object.values(chartInstances);

function syncTooltips(sourceChart, dataIndex) {
  charts.forEach(chart => {
    if (chart.data.datasets[0]?.data[dataIndex] !== null) {
      chart.setActiveElements([{ datasetIndex: 0, index: dataIndex }]);
      chart.tooltip.setActiveElements([{ datasetIndex: 0, index: dataIndex }]);
    } else {
      // Show "No data" tooltip at position
      showNoDataTooltip(chart, dataIndex);
    }
    chart.update('none');
  });
}

// Attach to each chart's hover event
chartsData.forEach(({ id }) => {
  const chart = chartInstances[id];
  chart.options.onHover = (event, elements) => {
    if (elements.length > 0) {
      syncTooltips(chart, elements[0].index);
    }
  };
});
```

### Alternatives Considered
| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Chart.js built-in `mode: 'index'` | Simple | Only works within single chart | Rejected |
| Custom tooltip plugin | Full control | Complex, maintenance overhead | Rejected |
| Event broadcasting + setActiveElements | Works cross-chart, uses official API | Requires coordination code | **Selected** |

---

## 7. Zoom and Pan with chartjs-plugin-zoom

### Decision
Use `chartjs-plugin-zoom` loaded from CDN with synchronized zoom state across all charts.

### Rationale
- Official Chart.js plugin, well-maintained
- Supports mouse wheel zoom and drag-to-pan
- Provides programmatic API for synchronization
- Small bundle size (~15KB gzipped)

### CDN Integration

```html
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom@2.0.1/dist/chartjs-plugin-zoom.min.js"></script>
```

### Configuration

```javascript
const zoomOptions = {
  zoom: {
    wheel: { enabled: true },
    pinch: { enabled: true },
    mode: 'x',
    onZoom: ({ chart }) => syncZoom(chart),
  },
  pan: {
    enabled: true,
    mode: 'x',
    onPan: ({ chart }) => syncZoom(chart),
  },
  limits: {
    x: { min: 'original', max: 'original' },
  },
};

function syncZoom(sourceChart) {
  const { min, max } = sourceChart.scales.x;
  charts.forEach(chart => {
    if (chart !== sourceChart) {
      chart.zoomScale('x', { min, max }, 'none');
    }
  });
}
```

### Reset Zoom Button
- Appears when `chart.isZoomedOrPanned()` returns true
- Calls `chart.resetZoom()` on all charts
- Hidden at default zoom level

### Disable for Sparse Charts
```javascript
if (dataPointCount < 3) {
  chartConfig.options.plugins.zoom.zoom.wheel.enabled = false;
  chartConfig.options.plugins.zoom.pan.enabled = false;
}
```

---

## 8. Date Range Filtering

### Decision
Implement client-side filtering using Chart.js scale min/max limits, preserving original data in memory.

### Rationale
- No server round-trip needed
- Data is already loaded; just change visible range
- Filter buttons are simpler than date pickers
- Integrates well with zoom (filter sets base range, zoom within it)

### Implementation Approach

```javascript
const FILTER_DAYS = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  'all': null,
};

function applyDateFilter(filterKey) {
  const days = FILTER_DAYS[filterKey];
  const maxTimestamp = Math.max(...allTimestamps);
  
  charts.forEach(chart => {
    if (days === null) {
      chart.options.scales.x.min = undefined;
      chart.options.scales.x.max = undefined;
    } else {
      const minTimestamp = maxTimestamp - (days * 24 * 60 * 60 * 1000);
      chart.options.scales.x.min = minTimestamp;
      chart.options.scales.x.max = maxTimestamp;
    }
    chart.update('none');
  });
  
  // Update button states
  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.classList.toggle('bg-blue-600', btn.dataset.filter === filterKey);
    btn.classList.toggle('text-white', btn.dataset.filter === filterKey);
  });
}
```

### Button Component (Tailwind)

```html
<div class="flex gap-2">
  <button data-filter="7d" class="px-3 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300">7 days</button>
  <button data-filter="30d" class="px-3 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300">30 days</button>
  <button data-filter="90d" class="px-3 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300">90 days</button>
  <button data-filter="all" class="px-3 py-1 text-sm rounded bg-blue-600 text-white">All</button>
</div>
```

### Empty Range Handling
When filter results in no visible data points, display inline message:
```javascript
if (visiblePoints === 0) {
  showEmptyRangeMessage(chart, 'No data in selected range');
}
```

---

## 9. Chart Export as PNG

### Decision
Use native Canvas `toDataURL()` API with dynamic download link creation.

### Rationale
- Built into browser, no additional libraries
- Chart.js renders to canvas, which supports direct export
- Can include title by drawing on canvas before export

### Implementation

```javascript
function exportChartAsPng(chartId, metricName) {
  const chart = chartInstances[chartId];
  const canvas = chart.canvas;
  
  // Create temporary canvas with title
  const exportCanvas = document.createElement('canvas');
  const ctx = exportCanvas.getContext('2d');
  const titleHeight = 40;
  
  exportCanvas.width = canvas.width;
  exportCanvas.height = canvas.height + titleHeight;
  
  // Draw white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
  
  // Draw title
  ctx.fillStyle = '#1f2937';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(metricName, exportCanvas.width / 2, 25);
  
  // Draw preview watermark if active
  if (showingPreview) {
    ctx.fillStyle = '#9ca3af';
    ctx.font = '12px sans-serif';
    ctx.fillText('(Preview Data)', exportCanvas.width / 2, titleHeight - 5);
  }
  
  // Draw chart
  ctx.drawImage(canvas, 0, titleHeight);
  
  // Trigger download
  const link = document.createElement('a');
  link.download = `${metricName.replace(/[^a-z0-9]/gi, '-')}-chart.png`;
  link.href = exportCanvas.toDataURL('image/png');
  link.click();
}
```

### Button Placement
- Small icon button in top-right of each MetricCard
- Uses download icon (SVG inline)
- Tooltip: "Download PNG"

---

## 10. Synthetic Data Generation Update

### Decision
Update synthetic data to span 60 days (per spec update) instead of arbitrary 20 points.

### Updated Implementation

```javascript
function generateSyntheticTimestamps(endDate: Date): string[] {
  const timestamps: string[] = [];
  const msPerDay = 24 * 60 * 60 * 1000;
  
  // Generate 20 points spread across 60 days (every 3 days)
  for (let i = 19; i >= 0; i--) {
    const date = new Date(endDate.getTime() - (i * 3 * msPerDay));
    timestamps.push(date.toISOString());
  }
  
  return timestamps;
}
```

---

## Summary of Technical Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| Gap display | `null` values + `spanGaps: false` | Clear, accurate representation |
| X-axis normalization | Shared labels array from all builds | Visual consistency across charts |
| Toggle component | Native checkbox + Tailwind `peer` | Accessible, no JS framework needed |
| Synthetic data | Mulberry32 + mean-reverting, 60-day span | Deterministic, realistic patterns |
| State management | Vanilla JS + Chart.js `update()` | Minimal footprint, static HTML compatible |
| Synchronized tooltips | Event broadcasting + `setActiveElements()` | Cross-chart coordination via official API |
| Zoom/pan | chartjs-plugin-zoom with sync callbacks | Official plugin, good API for synchronization |
| Date range filter | Scale min/max limits, client-side | No server needed, integrates with zoom |
| Chart export | Canvas `toDataURL()` + dynamic link | Native browser API, no dependencies |
