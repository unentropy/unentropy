## 1. Setup

- [x] 1.1 Re-read `src/reporter/templates/default/scripts/charts.js` section
      render branch in `initializeCharts` and `computeSectionDateRange` to
      confirm the exact call sites being changed.

## 2. Foundational

**Goal**: Add the pure section-timeline helpers that everything else builds on.

- [x] 2.1 Add `computeSectionIndices(section, lineCharts, timeline)` to
      `src/reporter/templates/default/scripts/charts.js` — returns the ascending
      list of global timeline indices where any of the section's metrics
      (single `metricId` or multi `metricIds`) has a non-null value. Reuse the
      scan structure currently in `computeSectionDateRange`.
- [x] 2.2 Add `buildSectionView(section, lineCharts, timeline, metadata)`
      returning `{ indices, timeline, metadata }` by slicing the global
      `timeline` and `metadata` at those indices.
- [x] 2.3 Add `sliceValues(values, view)` returning `values[i]` for each
      `i` in `view.indices`, order preserved.

**Checkpoint**: Pure helpers exist and match `contracts/html-report-template.md`.

---

## 3. User Story 1 - Continuous lines across section timelines (Priority: P1)

**Goal**: Section charts render against the section timeline so builds unique to
other sections no longer create gaps (spec: Per-Section Timeline Derivation).

### Tests

- [x] 3.1 [P] [US1] Unit test the helpers from Phase 2 (import `charts.js` as
      text and evaluate, or extract helpers to a testable shim) in
      `tests/unit/reporter/`: assert `computeSectionIndices` returns the union
      of non-null indices for single + multi charts, ascending, and `[]` for a
      section with no data; assert `sliceValues` aligns to `indices`.
- [x] 3.2 [P] [US1] Integration test in `tests/integration/reporting.test.ts`:
      generate a report whose two sections track metrics on disjoint build sets;
      assert each section's emitted chart data has no gap caused by the other
      section's builds.

### Implementation

- [x] 3.3 [US1] In the section branch of `initializeCharts`, build one
      `view = buildSectionView(...)` per section and reuse it for every chart in
      that section.
- [x] 3.4 [US1] Derive `sectionRange` from view endpoints
      (`{ min: view.timeline[0], max: view.timeline[last] }`, `null` when
      empty) and replace the `computeSectionDateRange` call; keep assigning
      `chartInstance.crosshair.sectionDateRange`.
- [x] 3.5 [US1] Pass `view.timeline` and `view.metadata` plus per-chart
      `sliceValues(chart.values, view)` into `buildLineChart` and
      `buildMultiMetricLineChart` (slice each metric's values for multi charts).
- [x] 3.6 [US1] Remove now-unused `computeSectionDateRange` (or leave only if
      still referenced); confirm no dangling references.

**Checkpoint**: Disjoint-section report shows continuous lines per section.

---

## 4. User Story 2 - Preserve gaps and interactions (Priority: P2)

**Goal**: Intra-section gaps still break; crosshair, zoom, and date filters keep
working (spec: Intra-Section Gap Preservation, Section-Scoped Interactions).

### Tests

- [x] 4.1 [P] [US2] Test that a metric missing a build its section peer recorded
      still yields a `null` at that section-timeline index (gap preserved,
      `spanGaps` stays `false`).
- [x] 4.2 [P] [US2] Manual/visual check (or DOM/serialized assertion) that
      per-section crosshair sync and a date preset (e.g. 30d) still apply across
      sections and trigger the empty-range overlay when a section has no builds
      in range.

### Implementation

- [x] 4.3 [US2] Confirm crosshair `dataIndex` alignment holds because every
      chart in a section shares one `view`; verify date-filter min/max (set by
      date on the time axis in `date-filters.js`) needs no change.
- [x] 4.4 [US2] Verify preview section path still uses
      `previewData[].timestamps` and is left unchanged; confirm flat-layout
      branch untouched.

**Checkpoint**: US1 + US2 both hold; flat reports unchanged.

---

## 5. Polish & Cross-Cutting Concerns

- [x] 5.1 [P] Run `bun check` (lint + tests) and `bunx prettier` on changed files.
- [x] 5.2 [P] Regenerate a sample report and eyeball multi-section continuity,
      crosshair, zoom, and date filters in a browser.
- [x] 5.3 Confirm `contracts/html-report-template.md` matches the final helper
      signatures; update if the implementation diverged.
- [x] 5.4 Code cleanup — remove dead code (`computeSectionDateRange` if retired)
      and keep comments consistent with surrounding style.
