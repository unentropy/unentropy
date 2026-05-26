## 1. Setup

- [x] 1.1 Read existing scripts: `charts.js`, `crosshair-plugin.js`, `date-filters.js` — done during exploration

## 2. Foundational

- [x] 2.1 Confirm that `layout` object passed to `initializeCharts` includes section index positioning (already array-indexed in `SectionData[]`)

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## 3. User Story 1 - Per-Section Crosshairs and Zoom (Priority: P1)

**Goal**: Crosshairs and drag-to-zoom scope to the section being interacted with, leaving other sections unaffected.

### Implementation

- [x] 3.1 [US1] Remove shared `COMMON_OPTIONS.plugins.crosshair` in `charts.js` `ensureStyles()` — per-chart options will be built inline
- [x] 3.2 [US1] In `charts.js` `initializeCharts()`, when iterating `layout.sections`, pass `sectionIndex` as `sync.group` in each chart's crosshair plugin options
- [x] 3.3 [US1] In flat (non-section) layout path, keep `sync.group: 1` for backward compatibility
- [x] 3.4 [US1] Verify crosshair events use the correct `syncGroup` in `crosshair-plugin.js` — no code changes expected here, the plugin already filters by group

**Checkpoint**: Hovering a chart in one section no longer shows crosshairs in other sections. Drag-to-zoom in one section does not zoom others.

---

## 4. User Story 2 - Global Presets Clear Section Zooms (Priority: P2)

**Goal**: Global time range presets (All, 7d, 30d, 90d, Custom) continue to apply to all sections and clear any per-section zoom states.

### Implementation

- [x] 4.1 [US2] In `date-filters.js`, ensure `clearZoomState()` is called before all preset filter applications (it already is for presets and clear — verify for Custom date range too)
- [x] 4.2 [US2] Confirm that `applyDateFilter("all")` resets `scales.x.min`/`max` on all charts (it already does this — no change needed)
- [x] 4.3 [US2] Verify `zoom-sync` event listener in `date-filters.js` still updates UI state correctly regardless of which section triggered the zoom

**Checkpoint**: Clicking "90d" clears any per-section zoom state. "All" resets all sections to their full data range.

---

## 5. Polish & Cross-Cutting Concerns

- [x] 5.1 Run `bun check` to verify linting and type checks
- [x] 5.2 Run `bun test` to ensure no test regressions
- [x] 5.3 Verify visual review fixtures render correctly: `bun visual-review`
- [x] 5.4 Visual review reports opened in browser for manual verification (sections-demo contains 4 sections for testing crosshair/zoom scoping)
