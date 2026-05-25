## 1. Setup

- [x] 1.1 [P] Read existing codebase to confirm current component and test file locations

## 2. Foundational — Theme System Core

**Goal**: Palette definitions, resolution logic, config schema, and stylesheet builder must be in place before any component can use them.

### Tests

- [x] 2.1 [P] Create `tests/unit/reporter/themes.test.ts` — failing tests for Lattice default, built-in names, hex validation
- [x] 2.2 [P] Create `tests/unit/reporter/styles.test.ts` — failing tests for dark/light/auto mode output, semantic classes, print rules
- [x] 2.3 [P] Append theme + mode tests to `tests/unit/config/schema.test.ts` — failing tests for built-in name, custom object, valid modes, invalid mode rejection

### Implementation

- [x] 2.4 Create `src/reporter/templates/default/themes.ts` with Lattice palette, `resolveTheme()`, `BUILT_IN_THEME_NAMES`
- [x] 2.5 Add Flux, Halftone, Specimen palettes to `themes.ts`; update `BUILT_IN_THEMES`
- [x] 2.6 Add custom palette override support to `resolveTheme()` with Lattice fallback
- [x] 2.7 Extend `ReportConfigSchema` in `src/config/schema.ts` with `theme` and `mode` fields
- [x] 2.8 Create `src/reporter/templates/default/styles.ts` with `buildStyleSheet()` (variable blocks, component layer, print rules)

**Checkpoint**: `bun test tests/unit/reporter/themes.test.ts` and `bun test tests/unit/reporter/styles.test.ts` and `bun test tests/unit/config/schema.test.ts` all pass.

---

## 3. User Story 1 — Wire Theme into Report Generation (Priority: P1)

**Goal**: The generator resolves the theme from config and injects it into the HTML document so the report renders with the correct variables.

### Tests

- [x] 3.1 [P] [US1] Update `tests/unit/reporter/generator.test.ts` to pass `theme` and `mode` props to `HtmlDocument`
- [x] 3.2 [P] [US1] Update any test that renders `HtmlDocument` to include `theme` and `mode` props

### Implementation

- [x] 3.3 [US1] Update `HtmlDocument.tsx` to accept `theme: ResolvedTheme` and `mode: ThemeMode`, inject `<style>` block, set `data-theme` on `<html>`, remove `PrintStyles` import
- [x] 3.4 [US1] Delete `src/reporter/templates/default/components/PrintStyles.tsx`
- [x] 3.5 [US1] Update `src/reporter/templates/default/components/index.ts` — remove `PrintStyles` export
- [x] 3.6 [US1] Update `src/reporter/generator.ts` to `resolveTheme()` from config and pass to `HtmlDocument`

**Checkpoint**: `bun test tests/unit/reporter/` passes; `bun run typecheck` passes.

---

## 4. User Story 2 — Restyle Header and Toolbar (Priority: P1)

**Goal**: Header becomes a window title bar with traffic-light dots and repo breadcrumb; toolbar becomes chip-based date filter with build counter.

### Tests

- [x] 4.1 [P] [US2] Update template tests to expect `uent-titlebar`, `uent-chip`, `uent-chip-active` classes

### Implementation

- [x] 4.2 [US2] Restyle `Header.tsx` as window title bar with `.uent-titlebar`, traffic-light dots, repo path breadcrumb; accept `buildCount` prop
- [x] 4.3 [US2] Pass `buildCount` prop from `HtmlDocument.tsx` to `Header`
- [x] 4.4 [US2] Restyle `DateRangeFilter.tsx` as toolbar chips with `.uent-toolbar-label`, `.uent-chip`, `.uent-chip-active`
- [x] 4.5 [US2] Update `date-filters.js` to toggle `uent-chip-active` class instead of Tailwind color classes; update empty-range overlay to use CSS variables
- [x] 4.6 [US2] Restyle `CustomDatePickerPopover.tsx` with `.uent-popover`, `.uent-input`, `.uent-toolbar-label`

**Checkpoint**: `bun test tests/unit/reporter/` passes; `bun run typecheck` passes.

---

## 5. User Story 3 — Restyle Cards, Sections, and Stats (Priority: P1)

**Goal**: Metric cards, section headers, and stats rows use semantic classes and the editor-pane aesthetic.

### Tests

- [x] 5.1 [P] [US3] Update `tests/unit/reporter/templates.test.ts` assertions for `uent-section-head`, `uent-section-marker`, `uent-card`, `uent-stats`, `uent-stat-v`, `uent-trend-*`

### Implementation

- [x] 5.2 [US3] Restyle `Section.tsx` with `.uent-section-head`, `.uent-section-marker` (`▾`), `.uent-section-comment` (`// description`)
- [x] 5.3 [US3] Restyle `StatsGrid.tsx` with `.uent-stats` (dashed borders), `.uent-stat-l`, `.uent-stat-v`, `.uent-trend-up/down/stable`
- [x] 5.4 [US3] Update `formatUtils.ts` — `getTrendColor()` returns `.uent-trend-up`, `.uent-trend-down`, `.uent-trend-stable`
- [x] 5.5 [US3] Restyle `MetricCard.tsx` with `.uent-card.metric-card`, `.uent-metric-name`, `.uent-metric-desc`
- [x] 5.6 [US3] Restyle `MultiMetricChartCard.tsx` with `.uent-card.metric-card.multi-metric`, `.uent-metric-name`

**Checkpoint**: `bun test tests/unit/reporter/templates.test.ts` passes; `bun run typecheck` passes.

---

## 6. User Story 4 — Restyle Preview, Empty State, Footer, and Chart Colors (Priority: P2)

**Goal**: Preview banner, empty state, and footer adopt theme variables; Chart.js reads colors from CSS variables.

### Tests

- [x] 6.1 [P] [US4] Verify `tests/unit/reporter/templates.test.ts` still passes after Footer and EmptyState changes

### Implementation

- [x] 6.2 [US4] Restyle `PreviewBar.tsx` with `.uent-preview-banner`, `.uent-preview-icon`, `.uent-toggle-track`, `.uent-toggle-on`
- [x] 6.3 [US4] Update `charts.js` toggle handler to sync `uent-toggle-on` class with checkbox state
- [x] 6.4 [US4] Restyle `EmptyState.tsx` — swap SVG for ASCII flourish `.uent-empty-flourish`
- [x] 6.5 [US4] Restyle `Footer.tsx` with `.uent-statusbar`, `.uent-version`, `.uent-tracking`
- [x] 6.6 [US4] Update `charts.js` to read `--accent`, `--up`, `--down` from CSS variables via `themeVar()` helper; replace hard-coded `rgb(59, 130, 246)`

**Checkpoint**: `bun test tests/unit/reporter/` passes; `bun run typecheck` passes.

---

## 7. Polish & Cross-Cutting Concerns

- [x] 7.1 [P] Run `bun check` (lint, typecheck, format)
- [x] 7.2 [P] Regenerate visual-review fixtures with `bun run generate-fixtures`
- [x] 7.3 [P] Add theme-variant fixtures (custom palette, `mode: "light"`, one per built-in palette)
- [x] 7.4 [P] Run full test suite: `bun test`
- [ ] 7.5 [P] Archive change after merge
