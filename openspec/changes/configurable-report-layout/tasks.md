## 1. Setup

- [ ] 1.1 [P] Read design.md and contracts for context
- [ ] 1.2 [P] Verify existing tests pass: `bun test`

## 2. Foundational

**Goal**: Extend configuration, types, and report generator to support the new layout system.

- [ ] 2.1 [P] Extend `src/config/schema.ts` with `ReportConfigSchema`, `ReportSectionSchema`, `ChartConfigSchema`
- [ ] 2.2 [P] Extend `UnentropyConfigSchema` with optional `report` property
- [ ] 2.3 [P] Extend `src/config/loader.ts` to pass `report` through `ResolvedUnentropyConfig`
- [ ] 2.4 [P] Extend `src/reporter/types.ts` with `ReportLayout`, `SectionData`, `ChartData` interfaces and optional `layout` on `ChartsData`
- [ ] 2.5 Add config validation tests in `tests/config/schema.test.ts` for valid/invalid `report` blocks

**Checkpoint**: Config loads and validates `report` blocks; types are in place; all existing tests still pass.

---

## 3. User Story 1 - Report Sections (Priority: P1)

**Goal**: Users can define named sections in `unentropy.json` to group related metrics visually.

### Tests

- [ ] 3.1 [P] [US1] Test `buildReportLayout` returns correct sections and chart assignments
- [ ] 3.2 [P] [US1] Test unreferenced metrics are omitted without warnings
- [ ] 3.3 [P] [US1] Test `HtmlDocument` renders section headers when `layout` is present
- [ ] 3.4 [P] [US1] Test `HtmlDocument` renders flat grid when `layout` is absent

### Implementation

- [ ] 3.5 [US1] Implement `buildReportLayout()` in `src/reporter/generator.ts`
- [ ] 3.6 [US1] Create `src/reporter/templates/default/components/Section.tsx`
- [ ] 3.7 [US1] Modify `src/reporter/templates/default/components/HtmlDocument.tsx` to render sections when `layout` present
- [ ] 3.8 [US1] Update `src/reporter/templates/default/components/index.ts` to export `Section`
- [ ] 3.9 [US1] Update `src/reporter/empty-report.ts` to respect section layout in preview mode
- [ ] 3.10 [US1] Update `src/cli/cmd/preview.ts` to pass `config.report` to `generateEmptyReport`

**Checkpoint**: `unentropy preview` with sections shows named section headers and grouped charts.

---

## 4. User Story 2 - Multi-Metric Charts (Priority: P2)

**Goal**: Users can plot multiple metrics on a single chart with shared X-axis, distinct colors, legends, and optional custom titles.

### Tests

- [ ] 4.1 [P] [US2] Test multi-metric chart card renders with legend and multiple stat mini-cards
- [ ] 4.2 [P] [US2] Test dual Y-axis renders when metrics have different units
- [ ] 4.3 [P] [US2] Test tooltip shows all metric values for hovered build
- [ ] 4.4 [P] [US2] Test missing metric in multi-metric chart shows "No data" in tooltip
- [ ] 4.5 [P] [US2] Test custom `title` property overrides auto-generated title

### Implementation

- [ ] 4.6 [US2] Create `src/reporter/templates/default/components/MultiMetricChartCard.tsx`
- [ ] 4.7 [US2] Modify `src/reporter/templates/default/components/HtmlDocument.tsx` to render `MultiMetricChartCard` for `type: "multi"` charts
- [ ] 4.8 [US2] Update `src/reporter/templates/default/components/index.ts` to export `MultiMetricChartCard`
- [ ] 4.9 [US2] Update client-side Chart.js script generation to support multi-line datasets with distinct colors
- [ ] 4.10 [US2] Update client-side tooltip handler to show all metric values for multi-metric charts
- [ ] 4.11 [US2] Add color palette utility for multi-metric series assignment

**Checkpoint**: Multi-metric charts render with legends, tooltips, dual axes, and custom titles in both preview and generated reports.

---

## 5. Polish & Cross-Cutting Concerns

- [ ] 5.1 [P] Run `bun check` and fix any lint/type/format errors
- [ ] 5.2 [P] Run `bun test` and ensure all tests pass
- [ ] 5.3 [P] Update `openspec/specs/reporting/contracts/` with final `config-schema.md`, `report-data-schema.md`, and `report-layout.md`
- [ ] 5.4 [P] Update user-facing documentation examples (if docs site is in-repo)
- [ ] 5.5 [P] Verify `unentropy preview` with and without `report` config works correctly
- [ ] 5.6 [P] Verify generated report HTML is self-contained and valid
