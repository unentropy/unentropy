## Context

Reports render charts in `src/reporter/templates/default/scripts/charts.js`.
The server (`src/reporter/generator.ts`) emits a single global `timeline` =
`allBuilds.map(b => b.timestamp)` and, for each numeric metric,
`normalizeMetricToBuilds` produces a `values` array aligned to that timeline
with `null` where the metric had no data for a build. Charts use
`spanGaps: false`, so every `null` breaks the line.

When `layout.sections` is present, `initializeCharts` already renders per
section: each section gets its own crosshair sync group (`buildCrosshairOptions(sectionIndex)`)
and a `sectionDateRange` from `computeSectionDateRange` that zooms the x-axis
to where the section has data. But the underlying `timeline`, `metadata`, and
each chart's `values` are still the global, all-builds arrays. So a build that
only carried another section's metrics sits inside this section's zoom window
as a `null` → a visible break. Sections look independent but their data
timelines are not.

The fix is to give each section its own timeline derived from the builds where
its own metrics have data, and render that section's charts against the sliced
arrays. This is a render-time (browser) transform; the data payload is
unchanged.

## Goals / Non-Goals

**Goals:**

- Each section's line charts are continuous across the builds that section
  actually has data for; builds unique to other sections do not introduce gaps.
- Preserve genuine intra-section gaps (a metric missing a build its section
  peers recorded still breaks).
- Keep per-section crosshair, drag-to-zoom, and global date filters working.
- Zero changes to the server payload, config, storage, or the flat layout.

**Non-Goals:**

- Server-side timeline recomputation or report-JSON changes.
- Changing flat (no-section) rendering.
- Bridging/interpolating genuinely missing points (no `spanGaps: true`).
- Cross-section alignment — sections stay independent.

## Decisions

### D1: Slice client-side, not server-side

Compute section timelines in `charts.js` at render time rather than emitting
per-section arrays from `generator.ts`.

- **Why**: The browser already owns the section render loop and already scans
  per-section data (`computeSectionDateRange`). Keeping the payload unchanged
  avoids touching `ChartsData`, `generator.ts`, preview generation, and their
  tests. Smaller blast radius, no schema migration.
- **Alternative considered**: Emit `SectionData.timeline` + sliced values from
  the server. Rejected — duplicates data already shipped, bloats the payload
  (values repeated per section), and forces type/test churn for no rendering
  benefit.

### D2: Section timeline = union of indices where any section metric has data

For a section, collect global timeline indices where at least one referenced
metric (single or multi) has a non-null value; render against that ascending
index set.

- **Why**: Union removes only the gaps caused by _other_ sections' builds while
  leaving a real gap when one metric in the section misses a build a sibling
  recorded — exactly the "fragmentation is OK in principle" behavior the
  proposal preserves.
- **Alternatives considered**:
  - _Intersection_ (only builds where every section metric has data): would
    hide legitimate single-metric gaps and drop valid points. Rejected.
  - _Per-chart timelines via `{x,y}` point datasets_ (drop nulls per line):
    makes every line fully continuous, erasing intra-section gaps too. Goes
    beyond intent and complicates crosshair `dataIndex` alignment across a
    section. Rejected.

### D3: Keep the `type: "time"` x-axis; continuity via index exclusion

Points keep their real timestamps. Because out-of-section indices are excluded
rather than null-filled, consecutive in-section points connect directly while
still being positioned by date.

- **Why**: Honest spacing (uneven build cadence stays visible) and the line is
  continuous because there is no intervening `null`. `spanGaps` stays `false`,
  so genuine in-section gaps still break.

### D4: Preserve index alignment for interactions

Slice a section's `timeline`, `metadata`, and every chart's `values` against
the **same** index list, so a given `dataIndex` means the same build across all
charts in the section. `sectionDateRange` becomes the section timeline's first
and last timestamps.

- **Why**: Per-section crosshair sync uses `dataIndex`; consistent slicing keeps
  it valid. Date filters set x min/max by date on a time axis, so presets and
  custom ranges keep working unchanged; the empty-range overlay check still
  scans `chartsData.timeline` (global) which is a safe superset.

## Risks / Trade-offs

- **Crosshair sync mismatch if any chart in a section is sliced differently** →
  Build one `SectionTimelineView` per section and reuse it for every chart
  (single, multi) in that section; never recompute per chart.
- **Preview (synthetic) charts use their own timestamps** → The preview section
  path keeps using `previewData[].timestamps`; it does not need section slicing
  because synthetic series are dense. Leave preview timeline logic as-is.
- **A section with zero data anywhere** → `computeSectionIndices` returns empty;
  guard so `sectionRange` is `null` and charts render empty rather than throwing
  (mirrors current `computeSectionDateRange` null return).
- **`computeSectionDateRange` becomes redundant** → Replace its use with the
  view-derived range to avoid two sources of truth; keep behavior identical at
  the endpoints.
- **Bar charts** → unaffected; they already render from their own
  `labels`/`counts`, not the timeline.

## Migration Plan

Pure rendering change in an inlined browser script; no data migration. Ships
with the next report generation. Rollback = revert the `charts.js` edits;
older reports are static HTML and unaffected. Verify by regenerating a report
fixture with sections whose metrics cover disjoint build sets and confirming
continuous lines plus working crosshair/zoom/date filters.

## Contracts Referenced

- `contracts/html-report-template.md`

## File Changes

- `src/reporter/templates/default/scripts/charts.js` (modified)
  - Add `computeSectionIndices(section, lineCharts, timeline)` and a
    `buildSectionView` helper producing `{ indices, timeline, metadata }`.
  - Add `sliceValues(values, view)`.
  - In the section branch of `initializeCharts`, build one view per section,
    derive `sectionRange` from view endpoints, and pass the view's
    `timeline`/`metadata` and per-chart sliced values into `buildLineChart` /
    `buildMultiMetricLineChart`.
  - Retire/replace `computeSectionDateRange` in favor of view-derived range.
  - Leave the flat-layout and preview branches unchanged.
- `test/` (new/modified) — unit tests for `computeSectionIndices` /
  `sliceValues` (extract or expose for test), plus a report-generation test
  asserting section-scoped continuity with disjoint build sets. Exact path to
  match existing reporter test layout.
