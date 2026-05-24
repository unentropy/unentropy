# Report Data Schema

**Domain**: reporting

**Extends**: `openspec/specs/reporting/contracts/report-data-schema.md`

## Overview

This contract extends the embedded JSON data structure in generated HTML reports to support sections and multi-metric charts.

## Extended Structure

```typescript
interface ChartsData {
  // Existing (shared across all charts)
  timeline: string[];
  metadata: (MetadataPoint | null)[];
  lineCharts: LineChartData[];
  barCharts: BarChartData[];
  buildCount: number;
  preview?: PreviewData;
  availableDateRange: DateRange;

  // NEW: report layout configuration (only present when sections are configured)
  layout?: ReportLayout;
}

interface MetadataPoint {
  sha: string;
  run: number;
}

interface LineChartData {
  id: string;
  name: string;
  unit: UnitType | null;
  values: (number | null)[];
  dataPointCount: number;
}

interface BarChartData {
  id: string;
  name: string;
  unit: UnitType | null;
  labels: string[];
  counts: number[];
}

// NEW: Report layout structure
interface ReportLayout {
  sections: SectionData[];
}

interface SectionData {
  name: string;
  description?: string;
  charts: ChartData[];
}

interface ChartData {
  // Chart type determines rendering
  type: "single" | "multi";

  // For single-metric charts
  metricId?: string;

  // For multi-metric charts
  metricIds?: string[];

  // Human-readable chart title
  title: string;

  // Chart type hint for rendering
  chartType: "line" | "bar";
}
```

## Multi-Metric Chart Data Mapping

For multi-metric charts, the client-side JavaScript maps `metricIds` to the shared `lineCharts` array by `id`:

```javascript
function buildMultiMetricChart(chartData, lineCharts, timeline, metadata) {
  const datasets = chartData.metricIds.map((metricId, index) => {
    const metric = lineCharts.find((m) => m.id === metricId);
    return {
      label: metric.name,
      data: metric.values,
      // Distinct colors assigned by index
      borderColor: getColor(index),
      backgroundColor: getColor(index, 0.1),
    };
  });

  return {
    type: "line",
    data: {
      labels: timeline,
      datasets,
    },
    options: {
      // Dual Y-axis when units differ
      scales: determineScales(chartData.metricIds, lineCharts),
    },
  };
}
```

## Section Rendering Logic

When `layout` is present, the report renderer iterates sections and charts:

```javascript
function renderReport(container, chartsData) {
  if (chartsData.layout) {
    // Section-based layout
    chartsData.layout.sections.forEach((section) => {
      const sectionEl = createSectionHeader(section.name, section.description);
      const gridEl = createChartGrid();

      section.charts.forEach((chart) => {
        if (chart.type === "single") {
          const metricData = findMetric(chart.metricId, chartsData);
          gridEl.appendChild(createChartCard(metricData));
        } else {
          const metricsData = chart.metricIds.map((id) => findMetric(id, chartsData));
          gridEl.appendChild(createMultiMetricChartCard(chart.title, metricsData));
        }
      });

      sectionEl.appendChild(gridEl);
      container.appendChild(sectionEl);
    });
  } else {
    // Flat layout (backward compatible)
    const gridEl = createChartGrid();
    chartsData.lineCharts.forEach((metric) => {
      gridEl.appendChild(createChartCard(metric));
    });
    chartsData.barCharts.forEach((metric) => {
      gridEl.appendChild(createChartCard(metric));
    });
    container.appendChild(gridEl);
  }
}
```

## Size Optimization Principles

The extended structure preserves existing optimizations:

1. **Shared timeline**: All charts (including multi-metric) use the same `timeline` array
2. **Shared metadata**: Commit SHA and run numbers stored once
3. **Minimal layout overhead**: `layout` only included when configured; flat reports are unchanged
4. **Metric data deduplication**: Multi-metric charts reference `lineCharts` by ID rather than duplicating values

## Client-Side Legend Behavior

For multi-metric charts, the legend is generated from the metric names:

```javascript
function buildLegend(chartData, lineCharts) {
  return {
    display: true,
    labels: {
      generateLabels: (chart) => {
        return chartData.metricIds.map((id, index) => {
          const metric = lineCharts.find((m) => m.id === id);
          return {
            text: metric.name,
            fillStyle: getColor(index),
            strokeStyle: getColor(index),
          };
        });
      },
    },
  };
}
```

## Color Assignment

Multi-metric chart colors are assigned by series index using a predefined palette:

| Index | Color              |
| ----- | ------------------ |
| 0     | `#3b82f6` (blue)   |
| 1     | `#10b981` (green)  |
| 2     | `#f59e0b` (amber)  |
| 3     | `#ef4444` (red)    |
| 4     | `#8b5cf6` (violet) |
| 5+    | Cycle repeats      |
