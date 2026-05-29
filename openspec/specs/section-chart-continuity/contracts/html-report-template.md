# HTML Report Template — Section Chart Rendering Contract

Scope: the browser-side chart initialization in
`src/reporter/templates/default/scripts/charts.js`. This change adds
section-scoped timeline derivation. The embedded report data payload
(`ChartsData` in `src/reporter/types.ts`) is **unchanged** — slicing happens
at render time in the browser.

## Unchanged data inputs

The server continues to emit the global timeline and null-padded per-metric
values. No field is added or removed.

```ts
interface ChartsData {
  timeline: string[]; // ISO timestamps for ALL builds, chronological
  metadata: (MetadataPoint | null)[]; // aligned to timeline
  lineCharts: LineChartData[]; // values aligned to timeline (null = no data)
  barCharts: BarChartData[];
  previewLineCharts: LineChartData[];
  previewBarCharts: BarChartData[];
  buildCount: number;
  showToggle: boolean;
  previewData: PreviewDataSet[];
  availableDateRange?: { min: string; max: string };
  layout?: ReportLayout; // when present → section rendering path
}
```

## New render-time function: section timeline derivation

A pure helper computes the chronological list of global timeline indices a
section is rendered against — the union of indices where any of the section's
metrics has a non-null value.

```ts
/**
 * Indices into the global `timeline` that this section is rendered against:
 * every index where at least one metric referenced by the section (single or
 * multi) has a non-null value. Returned ascending; empty if the section has
 * no data anywhere.
 */
function computeSectionIndices(
  section: SectionData,
  lineCharts: LineChartData[],
  timeline: string[]
): number[];
```

Derived per-section view, built by slicing global arrays at those indices:

```ts
interface SectionTimelineView {
  indices: number[]; // ascending global indices in scope
  timeline: string[]; // timeline[i] for i in indices
  metadata: (MetadataPoint | null)[]; // metadata[i] for i in indices
}

/**
 * Slice a single chart's values to a section view.
 * values[i] for i in view.indices — order preserved.
 */
function sliceValues(values: (number | null)[], view: SectionTimelineView): (number | null)[];
```

## Modified render-time function signatures

The existing chart builders accept the section-scoped timeline, metadata, and
sliced values instead of the global ones. Signatures are otherwise stable.

```ts
// Existing — now called with the section view's timeline/metadata and
// section-sliced chart.values.
function buildLineChart(
  chart: LineChartData, // chart.values already sliced to the section view
  timeline: string[], // section view timeline
  metadata: (MetadataPoint | null)[],
  crosshairOptions?: object,
  sectionRange?: { min: string; max: string }
): ChartJsConfig;

function buildMultiMetricLineChart(
  chartConfig: ChartData,
  lineChartsData: LineChartData[], // entries sliced to the section view
  timeline: string[], // section view timeline
  metadata: (MetadataPoint | null)[],
  crosshairOptions?: object,
  sectionRange?: { min: string; max: string }
): ChartJsConfig;
```

`sectionRange` (a.k.a. `chartInstance.crosshair.sectionDateRange`) is derived
from the section view timeline endpoints: `{ min: view.timeline[0], max:
view.timeline[view.timeline.length - 1] }`. It remains the "All" default range
that date filters restore per section.

## Invariants

- `computeSectionIndices` returns a strictly ascending subsequence of
  `[0 .. timeline.length-1]`.
- Slicing preserves index alignment across a section's timeline, metadata, and
  every chart's values, so per-section crosshair `dataIndex` sync stays valid.
- The flat layout path (no `layout.sections`) does not call these helpers and
  renders against the global `timeline` exactly as before.
- The time axis (`type: "time"`) positions points by their real timestamp, so
  uneven build spacing renders honestly; continuity comes from excluding
  out-of-section indices, not from `spanGaps` or interpolation (`spanGaps`
  stays `false`).

## Usage (section render path)

```js
layout.sections.forEach(function (section, sectionIndex) {
  var view = buildSectionView(section, lineCharts, timeline, metadata); // indices + sliced timeline/metadata
  var sectionRange = view.timeline.length
    ? { min: view.timeline[0], max: view.timeline[view.timeline.length - 1] }
    : null;
  var sectionCrosshair = buildCrosshairOptions(sectionIndex);
  // each chart's values sliced via sliceValues(chart.values, view) before build
});
```
