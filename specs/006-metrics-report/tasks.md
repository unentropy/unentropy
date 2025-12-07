# Tasks: Metrics Report

**Input**: Design documents from `/specs/006-metrics-report/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/report-data-schema.md

**Tests**: Visual review fixtures serve as the primary validation mechanism for this UI-focused feature.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Create new module structure and update type definitions

- [ ] T001 Create synthetic data generator module at src/reporter/synthetic.ts with seeded PRNG functions (createSeededRng, hashString)
- [ ] T002 [P] Add PreviewDataSet interface to src/reporter/types.ts (metricId, timestamps, values, stats fields)
- [ ] T003 [P] Extend ReportData interface in src/reporter/types.ts with showToggle, previewData, and allTimestamps fields

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure for normalized build data that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Add getAllBuildContexts() wrapper function in src/reporter/generator.ts to retrieve complete build history
- [x] T005 Create normalizeMetricToBuilds() helper function in src/reporter/generator.ts that maps metric data to full build range using null for gaps
- [x] T006 Update buildChartConfig() in src/reporter/charts.ts to accept normalized data arrays with null values
- [x] T007 Ensure Chart.js configuration in src/reporter/charts.ts sets spanGaps: false for line charts

**Checkpoint**: Foundation ready - normalized build data infrastructure complete

---

## Phase 3: User Story 1 - View Metric Trends in Report (Priority: P1)

**Goal**: Each metric displays in its own section with chart, statistics, and normalized X-axis across all builds

**Independent Test**: Generate report with multiple metrics and verify each has its own card with chart showing all builds on X-axis, statistics (latest, min, max, trend), and description

### Implementation for User Story 1

- [x] T008 [US1] Update generateReport() in src/reporter/generator.ts to use normalized build data for all metrics
- [ ] T009 [US1] Modify chart label generation in src/reporter/charts.ts to use full build timestamp array
- [ ] T010 [US1] Update MetricCard component in src/reporter/templates/default/components/MetricCard.tsx to add data-metric-id attribute for stats updates
- [ ] T011 [US1] Verify existing StatsGrid component in src/reporter/templates/default/components/StatsGrid.tsx displays Latest/Min/Max/Trend correctly
- [ ] T012 [US1] Update sparse data threshold check in src/reporter/generator.ts to use dataPointCount (non-null values) instead of array length

**Checkpoint**: User Story 1 complete - all metrics show normalized X-axis with proper statistics

---

## Phase 4: User Story 2 - Toggle Between Real and Dummy Data (Priority: P2)

**Goal**: Reports with <10 builds show a toggle (default ON) to switch between synthetic preview data and real sparse data

**Independent Test**: Generate report with 5 builds, verify toggle appears ON by default showing synthetic data, clicking to OFF switches to real sparse data, toggling back to ON shows synthetic data. With 0 builds, verify synthetic data uses metric names/descriptions from config.

### Implementation for User Story 2

- [x] T013 [P] [US2] Implement generateSyntheticData() function in src/reporter/synthetic.ts using mean-reverting algorithm with Gaussian noise
- [x] T014 [P] [US2] Implement calculateSyntheticStats() function in src/reporter/synthetic.ts to compute stats for synthetic data
- [x] T015 [US2] Create PreviewBar.tsx component at src/reporter/templates/default/components/PreviewBar.tsx with info message and accessible toggle
- [x] T016 [US2] Export PreviewBar from src/reporter/templates/default/components/index.ts
- [x] T017 [US2] Update HtmlDocument.tsx to render PreviewBar below Header when showToggle is true
- [x] T018 [US2] Update HtmlDocument.tsx in src/reporter/templates/default/components/HtmlDocument.tsx to pass showToggle and previewData to PreviewBar and ChartScripts
- [x] T019 [US2] Update generateReport() in src/reporter/generator.ts to compute showToggle based on buildCount < 10 (hardcoded threshold)
- [x] T020 [US2] Update generateReport() in src/reporter/generator.ts to handle 0-build case by generating metric definitions from config with empty data arrays
- [x] T021 [US2] Update generateReport() in src/reporter/generator.ts to generate previewData array when showToggle is true
- [x] T022 [US2] Update ChartScripts.tsx in src/reporter/templates/default/components/ChartScripts.tsx to embed realData and previewData in chartsData array
- [x] T023 [US2] Set toggle default state to ON (checked) in ChartScripts.tsx initialization so synthetic data shows by default
- [x] T024 [US2] Add toggle event handler script in src/reporter/templates/default/components/ChartScripts.tsx that updates chart.data.datasets[0].data and calls chart.update('none')
- [x] T025 [US2] Add stats DOM update logic in ChartScripts.tsx toggle handler to update Latest/Min/Max/Trend display elements

**Checkpoint**: User Story 2 complete - toggle appears for sparse reports and switches data/stats

---

## Phase 5: User Story 4 - View Consistent Build History Across Metrics (Priority: P3)

**Goal**: All charts show same X-axis range; missing data points display as gaps with appropriate tooltip

**Independent Test**: Generate report where Metric A has data for all builds but Metric B only has data for some builds; verify both charts show same X-axis range and Metric B shows gaps

### Implementation for User Story 4

- [x] T024 [US4] Update buildNumericChartConfig() in src/reporter/charts.ts to preserve null values in data array instead of converting to 0
- [x] T025 [US4] Add custom tooltip callback in src/reporter/charts.ts to show "No data for this build" when hovering over null data point region
- [x] T026 [US4] Configure tooltip interaction mode in src/reporter/charts.ts with intersect: false to allow tooltips at X positions without data points
- [x] T027 [US4] Update ChartScripts.tsx in src/reporter/templates/default/components/ChartScripts.tsx to include tooltip callback configuration in serialized chart config
- [x] T028 [US4] Add metric with data gaps to tests/fixtures/visual-review/full-featured/ fixture to demonstrate consistent X-axis with missing data points alongside existing metrics

**Checkpoint**: User Story 4 complete - gaps visible with informative tooltips

---

## Phase 6: User Story 3 - Synchronized Tooltips Across Charts (Priority: P1)

**Goal**: Hovering on any chart shows tooltips on all charts for the same build

**Independent Test**: Generate report with 3+ metrics, hover over chart A, verify all charts show tooltips for same build timestamp

### Implementation for User Story 3 (Synchronized Tooltips)

- [ ] T029 [US3] Add syncTooltips() function in ChartScripts.tsx that broadcasts hover state to all charts using setActiveElements()
- [ ] T030 [US3] Add onHover callback to each chart config in ChartScripts.tsx that calls syncTooltips()
- [ ] T031 [US3] Handle missing data case - show "No data for this build" tooltip when chart has null at hovered index
- [ ] T032 [US3] Add mouseout handler to dismiss all tooltips when leaving chart areas

**Checkpoint**: User Story 3 complete - tooltips sync across all charts

---

## Phase 7: User Story 5 - Zoom and Pan Charts (Priority: P2)

**Goal**: Users can zoom/pan charts with synchronized state across all charts

**Independent Test**: Generate report with 50+ builds, zoom one chart, verify all charts zoom together, reset button appears

### Implementation for User Story 5 (Zoom/Pan)

- [ ] T033 [US5] Add chartjs-plugin-zoom CDN script tag in HtmlDocument.tsx
- [ ] T034 [US5] Add zoom plugin configuration to chart options in charts.ts (wheel zoom, drag pan, x-axis only)
- [ ] T035 [US5] Add syncZoom() function in ChartScripts.tsx that synchronizes zoom state across all charts
- [ ] T036 [US5] Add onZoom and onPan callbacks in chart config that call syncZoom()
- [ ] T037 [US5] Add "Reset zoom" button to MetricCard.tsx (hidden by default, visible when zoomed)
- [ ] T038 [US5] Add reset zoom click handler in ChartScripts.tsx that calls resetZoom() on all charts
- [ ] T039 [US5] Disable zoom for charts with fewer than 3 data points (dataPointCount check)

**Checkpoint**: User Story 5 complete - zoom/pan works with synchronization

---

## Phase 8: User Story 6 - Filter by Date Range (Priority: P2)

**Goal**: Users can filter all charts by predefined date ranges (7/30/90 days/All)

**Independent Test**: Generate report spanning 100 days, click "30 days", verify all charts show only last 30 days

### Implementation for User Story 6 (Date Filter)

- [ ] T040 [US6] Create DateRangeFilter.tsx component at src/reporter/templates/default/components/DateRangeFilter.tsx
- [ ] T041 [US6] Export DateRangeFilter from src/reporter/templates/default/components/index.ts
- [ ] T042 [US6] Add DateRangeFilter to Header.tsx
- [ ] T043 [US6] Add applyDateFilter() function in ChartScripts.tsx that sets scale min/max
- [ ] T044 [US6] Add click handlers for filter buttons in ChartScripts.tsx
- [ ] T045 [US6] Add activeFilter state and button highlighting logic
- [ ] T046 [US6] Handle empty range case - show "No data in selected range" when filter yields no data

**Checkpoint**: User Story 6 complete - date range filtering works

---

## Phase 9: User Story 7 - Export Chart as Image (Priority: P3)

**Goal**: Users can export individual charts as PNG images

**Independent Test**: Click export button on a chart, verify PNG downloads with metric name as filename

### Implementation for User Story 7 (PNG Export)

- [ ] T047 [US7] Add export button (download icon) to MetricCard.tsx header area
- [ ] T048 [US7] Add exportChartAsPng() function in ChartScripts.tsx using canvas.toDataURL()
- [ ] T049 [US7] Add title drawing to exported image (metric name as header)
- [ ] T050 [US7] Add "(Preview Data)" watermark when exporting with dummy data active
- [ ] T051 [US7] Add click handlers for export buttons

**Checkpoint**: User Story 7 complete - PNG export works with proper titles/watermarks

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Visual validation, edge cases, and accessibility

- [ ] T052 [P] Update minimal fixture in tests/fixtures/visual-review/minimal/ to have exactly 5 builds (toggle visible)
- [ ] T053 [P] Update sparse-data fixture in tests/fixtures/visual-review/sparse-data/ to have 3 builds with gaps in metric data
- [ ] T054 [P] Verify full-featured fixture in tests/fixtures/visual-review/full-featured/ has 25 builds (toggle hidden)
- [ ] T055 [P] Update edge-cases fixture in tests/fixtures/visual-review/edge-cases/ to include metric with single data point and flatline data
- [ ] T056 Add fixture with 50+ builds to test zoom/pan functionality
- [ ] T057 Add fixture spanning 100+ days to test date range filtering
- [ ] T058 Run bun run visual-review to generate fixtures and manually verify all acceptance scenarios
- [ ] T059 Verify toggle keyboard accessibility (Tab navigation, Space/Enter activation, focus ring visibility)
- [ ] T060 Verify ARIA attributes on toggle (role="switch") and charts (aria-label)
- [ ] T061 Run bun run typecheck to ensure no TypeScript errors
- [ ] T062 Run bun run lint to ensure code style compliance
- [ ] T063 Run bun test to verify existing tests still pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on T001-T003 (Setup types must exist)
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) completion
- **User Story 2 (Phase 4)**: Depends on Foundational (Phase 2) completion
- **User Story 4 (Phase 5)**: Depends on Foundational (Phase 2) completion (gaps/normalized X-axis)
- **User Story 3 (Phase 6)**: Depends on US1 charts working (synchronized tooltips)
- **User Story 5 (Phase 7)**: Depends on US1 charts working (zoom/pan)
- **User Story 6 (Phase 8)**: Depends on US1 charts working (date filtering)
- **User Story 7 (Phase 9)**: Depends on US1 charts working (PNG export)
- **Polish (Phase 10)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 - Core metric trends
- **User Story 2 (P2)**: Can start after Phase 2 - Preview toggle for sparse data
- **User Story 3 (P1)**: Can start after US1 - Synchronized tooltips
- **User Story 4 (P3)**: Can start after Phase 2 - Consistent build history/gaps
- **User Story 5 (P2)**: Can start after US1 - Zoom/pan
- **User Story 6 (P2)**: Can start after US1 - Date range filtering
- **User Story 7 (P3)**: Can start after US1 - PNG export

### Within Each User Story

- Type definitions before implementation
- Generator logic before components
- Components before client-side scripts
- Core implementation before edge case handling

### Parallel Opportunities

**Phase 1 (Setup)**:
```bash
# T002, T003 can run in parallel (different sections of types.ts)
```

**Phase 2 (Foundational)**:
```bash
# T006, T007 can run in parallel (different functions in charts.ts)
```

**Phase 4 (US2)**:
```bash
# T013, T014 can run in parallel (different functions in synthetic.ts)
```

**After US1 Complete - Multiple stories can parallelize:**
```bash
# US3 (T029-T032), US5 (T033-T039), US6 (T040-T046), US7 (T047-T051)
# All work on ChartScripts.tsx but in different functions
```

**Phase 10 (Polish)**:
```bash
# T052-T057 can run in parallel (different fixture directories)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T005-T008)
3. Complete Phase 3: User Story 1 (T009-T013)
4. **STOP and VALIDATE**: Run visual-review, verify normalized X-axis works
5. Can demo/deploy MVP with improved chart consistency

### Incremental Delivery

1. **MVP**: Setup + Foundational + US1 → Normalized build history (core value)
2. **+Preview**: Add US2 → Toggle for sparse data preview
3. **+Tooltips**: Add US3 → Synchronized tooltips across charts
4. **+Gaps**: Add US4 → Missing data gap handling
5. **+Zoom**: Add US5 → Zoom and pan functionality
6. **+Filter**: Add US6 → Date range filtering
7. **+Export**: Add US7 → PNG export
8. **Polish**: Visual validation and accessibility compliance

### Recommended Single-Developer Order

Since most files are shared across stories, sequential execution is recommended:

1. T001-T003 (Setup)
2. T004-T007 (Foundational)
3. T008-T012 (US1) → Validate
4. T013-T023 (US2) → Validate
5. T024-T028 (US4 - gaps) → Validate
6. T029-T032 (US3 - tooltips) → Validate
7. T033-T039 (US5 - zoom) → Validate
8. T040-T046 (US6 - filter) → Validate
9. T047-T051 (US7 - export) → Validate
10. T052-T063 (Polish)

---

## Notes

- All tasks modify existing files except T001 (new synthetic.ts), T015 (new PreviewBar.tsx), and T040 (new DateRangeFilter.tsx)
- Visual review (`bun run visual-review`) is the primary validation method
- No unit tests explicitly requested; visual fixtures serve as acceptance tests
- Commit after each phase completion for easy rollback
- T058 is manual verification - open generated HTML files in browser
- Feature flags (showToggle, zoom enabled) are determined automatically based on data, not user configuration
