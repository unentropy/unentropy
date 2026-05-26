## Context

The HTML report embeds three client-side JavaScript files that control chart interaction:

1. **crosshair-plugin.js** — Custom Chart.js plugin handling crosshair lines, tooltip sync, and drag-to-zoom
2. **charts.js** — Initializes Chart.js instances from serialized data, including per-chart plugin options
3. **date-filters.js** — Manages global time range preset buttons and custom date picker

Currently, all charts share `sync.group: 1` (hardcoded in `ensureStyles()` in `charts.js`). Crosshair events and zoom events dispatch on `window` and all charts respond. This produces global behavior — hovering or zooming any chart affects every chart in the report.

The `layout` object already flows from the server through `ChartsData` and into `initializeCharts()`. Each `SectionData` in `layout.sections` has a position (array index). This index is the natural sync group identifier.

## Goals / Non-Goals

**Goals:**

- Crosshairs sync only within the same section in section-based reports
- Drag-to-zoom affects only charts in the same section
- Global presets (All, 7d, 30d, 90d, Custom) still apply to all sections
- Applying a global preset clears any per-section zoom state
- Flat (non-section) layout is completely unaffected

**Non-Goals:**

- No config schema changes
- No server-side generation changes
- No new UI elements

## Decisions

### Decision: Section index as sync group

The layout section index (`layout.sections.forEach(function(section, i)`) maps directly to the crosshair plugin's `sync.group`. Section 0 is group 0, section 1 is group 1, etc. Flat layout continues to use group 1.

**Alternative considered**: Generating GUIDs per section. Rejected because position-based indexing is simpler, deterministic, and sufficient — sections don't reorder at runtime.

### Decision: Per-chart plugin options instead of global COMMON_OPTIONS

Currently `ensureStyles()` sets `COMMON_OPTIONS.plugins.crosshair.sync.group = 1` globally, and all charts reference this shared object. For per-section sync, each chart needs its own crosshair plugin options with the correct section index. This means the crosshair options must be per-chart, not shared.

**Alternative considered**: Mutating `COMMON_OPTIONS` each time a chart is created. Rejected because mutation in loops is error-prone and the shared object pattern breaks when values differ per chart.

### Decision: "No data in selected range" overlay remains global

The empty-range overlay (`showEmptyRangeOverlay` / `hideEmptyRangeOverlay` in `date-filters.js`) applies to `.chart-container` elements across the entire page. Since global presets affect all sections, this behavior is unchanged — if all sections are filtered to a range with no data, the overlay shows everywhere.

### Decision: Clearing per-section zoom on global preset

The `clearZoomState()` helper in `date-filters.js` already iterates all chart instances and resets `chart.crosshair.originalXRange`. This is called when presets (including "All") and "Clear" are applied. No change needed to this function — it already does what we need. We just need to ensure it's called in the right places.

## Risks / Trade-offs

- [Section boundary detection] → Crosshair clearing across sections uses existing `mouseout` event on the originating chart, which triggers `crosshair-clear` with the section's sync group. This is already handled by the plugin's `handleSyncClear` filtering by group.
- [Backward compatibility with saved reports] → The three scripts are inlined in generated HTML. Old reports will continue to use old scripts (they're baked in). Only newly generated reports will have scoped behavior. This is acceptable — no version negotiation needed.

## Contracts Referenced

- `contracts/html-report-template.md`

## File Changes

- `src/reporter/templates/default/scripts/charts.js` (modified)
- `src/reporter/templates/default/scripts/crosshair-plugin.js` (no changes needed — already supports sync groups)
- `src/reporter/templates/default/scripts/date-filters.js` (modified)
