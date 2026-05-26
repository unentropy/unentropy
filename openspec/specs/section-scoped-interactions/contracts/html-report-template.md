## Overview

This contract defines the browser-side script behavior for section-scoped chart interactions in HTML reports. No new configuration or server-side interfaces are introduced — the changes are entirely within the three inlined JavaScript files.

## Script: `crosshair-plugin.js`

### Cross-Section Sync Behavior

Each chart's sync group is assigned from the layout data rather than being hardcoded to `1`. The sync group value maps to the section index (0-based). Charts in a flat layout (no sections) continue to use a single group.

```
layout.sections.forEach(function(section, sectionIndex) {
  section.charts.forEach(function(chartConfig) {
    // Each chart gets crosshair plugin options with sync.group = sectionIndex
  });
});
```

- Sync events (`crosshair-sync`, `crosshair-clear`) are dispatched on `window` with `syncGroup` set to the chart's section index
- Other charts filter incoming events by matching `syncGroup` — unchanged plugin logic
- `window.crosshair-sync` event payload: `{ chartId, syncGroup, original, xValue, dataIndex }`
- `window.crosshair-clear` event payload: `{ chartId, syncGroup }`
- `window.zoom-sync` event payload: `{ chartId, syncGroup, start, end }`

### Zoom Scope

`doZoom()` continues to dispatch `zoom-sync` with the chart's `syncGroup`. Other charts filter by `syncGroup` — only charts in the same section zoom.

## Script: `charts.js`

### `initializeCharts` Signature

Unchanged. The `layout` parameter already contains section-chart structure.

### Chart Instance Creation

When creating charts in section mode, each chart instance receives crosshair plugin options with `sync.group` set to the section index:

```
layout.sections.forEach(function(section, sectionIndex) {
  section.charts.forEach(function(chartConfig) {
    var options = { ... };
    options.plugins = {
      crosshair: {
        sync: { enabled: true, group: sectionIndex },
        zoom: { enabled: true },
      },
    };
    new Chart(ctx, { ..., options });
  });
});
```

Flat layout charts retain `sync.group: 1` (unchanged).

## Script: `date-filters.js`

### `initializeDateFilters` Signature

Unchanged. `applyDateFilter` accepts the same arguments.

### Preset Application

When a preset filter (All, 7d, 30d, 90d) or Custom range is applied:

1. Clear all per-section zoom states by iterating all chart instances and resetting `chart.crosshair.originalXRange = {}`
2. Apply `scales.x.min` / `scales.x.max` to ALL chart instances (unchanged)
3. Call `chart.update("none")` on all charts (unchanged)

### Zoom-Sync Event Handling

The `zoom-sync` event listener in `date-filters.js` continues to update the filter UI state to "custom" with the zoom range dates. The UI state reflects the most recent zoom regardless of which section it occurred in. When a new global preset is applied, any previous zoom-sync state is overwritten.
