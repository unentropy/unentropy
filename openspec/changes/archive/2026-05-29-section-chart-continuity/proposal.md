## Why

Reports render every chart against one global timeline built from **all** builds. A metric only collected on a subset of builds gets `null` for every other build, and with `spanGaps: false` the line fragments. The worst case is multi-section reports: a build that only carried Section B's metrics injects a `null` into Section A's charts, so Section A looks broken even though its own data is continuous. Sections are already visually independent (per-section crosshair, zoom, and date range), but their timelines are not.

## What Changes

- Each section derives its **own timeline** from the builds where any of its metrics have data, instead of sharing the global all-builds timeline.
- Charts in a section plot against that section-scoped timeline, so builds belonging only to other sections no longer introduce gaps — lines stay continuous across the section's actual data cadence.
- Genuine within-section gaps (a single metric missing a build that its section peers recorded) still render as breaks — fragmentation remains intentional, just no longer leaking across sections.
- Section preview (synthetic) charts and date-range filters continue to work against the section-scoped timeline.
- No config or data-format changes; behavior is automatic for any sectioned report. Flat (no-section) layout is unchanged.

## Capabilities

### New Capabilities

- `section-chart-continuity`: Per-section timeline derivation and continuous rendering of charts when metrics span different sets of builds across sections.

### Modified Capabilities

<!-- No spec-level requirement changes to existing capabilities; section grouping and section-scoped interactions are unaffected in behavior. -->

## Impact

- **Code**: `src/reporter/templates/default/scripts/charts.js` (section render path, timeline derivation, preview section path). Possible touch to `src/reporter/templates/default/components/ChartScripts.tsx` only if data wiring changes.
- **APIs / data**: None. The server still emits the global `timeline` + null-padded `values`; slicing happens client-side at render.
- **Interactions**: Date filters operate on the time axis by date, so presets/custom ranges keep working; `sectionDateRange` is now derived from the section timeline endpoints.

### Documentation Impact

- [x] No user-facing doc changes
- [ ] Contracts affect: [list docs]

## Non-goals

- Changing how genuinely missing single-metric data points are shown (intra-section gaps stay as gaps).
- Altering the flat / no-section layout rendering.
- Server-side recomputation of timelines or any change to the stored metric data or report JSON payload.
- Cross-section timeline alignment or synchronization (sections remain independent by design).
