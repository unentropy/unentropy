# Tasks: Metrics Report

**Input**: Design documents from `/specs/006-metrics-report/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/report-data-schema.md

**Updated**: 2025-12-14 - Added Phase 8b for User Story 6b (Custom Date Range Picker)

**Tests**: Visual review fixtures serve as the primary validation mechanism for this UI-focused feature.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Note**: Phase 8b (Custom Date Range) requires calendar library research to be completed first (see research.md Section 12). Tasks T047-T048 must be completed before proceeding with the remaining custom date picker tasks.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Create new module structure and update type definitions

- [x] T001 Create synthetic data generator module at src/reporter/synthetic.ts with seeded PRNG functions (createSeededRng, hashString)
- [x] T002 [P] Add PreviewDataSet interface to src/reporter/types.ts (metricId, timestamps, values, stats fields)
- [x] T003 [P] Extend ReportData interface in src/reporter/types.ts with showToggle, previewData, and allTimestamps fields

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

## Phase 6: User Story 3 - Synchronized Tooltips and Vertical Alignment Line (Priority: P1)

**Goal**: Hovering on any chart shows a vertical alignment line across all charts AND tooltips on all charts for the same build

**Independent Test**: Generate report with 3+ metrics. Hover over any chart:
1. Verify vertical line appears on ALL charts at the same X position
2. Verify all charts show tooltips for the same build timestamp
3. Move cursor - verify line and tooltips update synchronously
4. Leave charts - verify line and tooltips dismiss together

### Implementation for User Story 3 (Vertical Alignment + Synchronized Tooltips)

**Part A: Vertical Alignment Line (Chart-specific rendering)**

- [ ] T029 [US3] Create custom Chart.js crosshair plugin at src/reporter/templates/default/scripts/crosshair-plugin.js
  - Implement plugin with id: 'crosshair'
  - Add beforeEvent hook to capture mouse X position when in chart area
  - Add afterDatasetsDraw hook to draw vertical line at stored X position
  - Create global sync state manager for multi-chart synchronization
  - Configure: line color (semi-transparent blue), width (1px), opacity (30%)

- [ ] T030 [US3] Update src/reporter/templates/default/scripts/charts.js to integrate crosshair plugin
  - Register crosshair plugin globally with Chart
  - Add plugin options to chart configuration (color, width, sync group)
  - After chart initialization, register each chart with global sync manager

- [ ] T031 [US3] Update src/reporter/templates/default/components/HtmlDocument.tsx
  - Add <script> tag loading crosshair-plugin.js before ChartScripts initialization
  - Ensure correct load order: Chart.js → crosshair-plugin.js → ChartScripts

- [ ] T032 [US3] Test vertical line synchronization:
  - Hover over first metric chart → verify vertical line appears on ALL charts
  - Move cursor horizontally → verify line moves smoothly on all charts simultaneously
  - Leave chart area → verify line disappears on all charts
  - Performance: Verify line movement is smooth (no jank, 60 FPS)

**Part B: Synchronized Tooltips (Tooltip content coordination)**

- [ ] T033 [US3] Add syncTooltips() function in ChartScripts.tsx that broadcasts hover state to all charts using setActiveElements()
  - Track hovered data index across all charts
  - Update active elements on all charts in same group

- [ ] T034 [US3] Add onHover callback to each chart config in ChartScripts.tsx that calls syncTooltips()
  - Detect when user hovers over any chart
  - Broadcast hover position to all charts

- [ ] T035 [US3] Handle missing data case - show "No data for this build" tooltip when chart has null at hovered index
  - When metric has no data for hovered build, show appropriate message
  - Vertical line still appears at correct X position

- [ ] T036 [US3] Add mouseout handler to dismiss all tooltips and vertical line when leaving chart areas
  - Clear active elements on all charts when cursor leaves
  - Vertical line disappears synchronously

**Part C: Integration and Testing**

- [ ] T037 [US3] Integration test - Vertical line + Tooltips together:
  - Hover chart → both line AND synchronized tooltips appear together
  - Move cursor → line and tooltips update synchronously
  - Verify visual layering is correct (line behind data/tooltips, not obscuring)

- [ ] T038 [US3] Accessibility verification:
  - Verify line color contrast meets WCAG AA standards (light and dark modes)
  - Verify tooltips still provide textual information (line is visual aid only)
  - Test keyboard navigation doesn't break (focus still works)

**Checkpoint**: User Story 3 complete - vertical line + tooltips sync across all charts

---

## Phase 7: User Story 5 - Zoom and Pan Charts (Priority: P2)

**Goal**: Users can zoom/pan charts with synchronized state across all charts

**Independent Test**: Generate report with 50+ builds, zoom one chart, verify all charts zoom together, reset button appears

### Implementation for User Story 5 (Zoom/Pan)

**Note**: Implementation uses native drag-to-zoom in the existing crosshair plugin instead of chartjs-plugin-zoom CDN library. This approach was chosen because:
1. The chartjs-plugin-zoom library is no longer actively maintained
2. Drag-to-zoom integrates naturally with the existing crosshair functionality
3. Avoids adding another CDN dependency
4. Full control over behavior and synchronization

- [x] T033 [US5] Add zoom configuration to crosshair plugin defaultOptions in crosshair-plugin.js
- [x] T034 [US5] Add zoom state (dragStarted, dragStartX, originalXRange, button) to chart.crosshair in afterInit
- [x] T035 [US5] Add zoom helper functions: isZoomEnabled(), countNonNullDataPoints(), drawZoombox(), doZoom(), resetZoom()
- [x] T036 [US5] Add zoom sync event handlers (handleZoomSync, handleZoomReset) and event listeners for 'zoom-sync', 'zoom-reset'
- [x] T037 [US5] Add createResetButton()/removeResetButton() functions with inline CSS styling (positioned top-right)
- [x] T038 [US5] Modify afterEvent to handle drag-to-zoom (mouse down starts drag, mouse up triggers zoom)
- [x] T039 [US5] Disable zoom for charts with fewer than 10 data points (minDataPoints config option)
- [x] T040 [US5] Add minimum zoom range check (minZoomRange: 4 data points) to prevent over-zooming
- [x] T041 [US5] Add beforeTooltipDraw hook to suppress tooltips during drag
- [x] T042 [US5] Update COMMON_OPTIONS in charts.js with zoom configuration

**Checkpoint**: User Story 5 complete - drag-to-zoom works with synchronization

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

**Checkpoint**: User Story 6 complete - preset date range filtering works

---

## Phase 8b: User Story 6b - Custom Date Range Picker (Priority: P2)

**Goal**: Users can select custom date ranges using a calendar picker, with integration to drag-to-zoom and footer updates

**Prerequisites**: Calendar library research must be completed (see research.md Section 12) and library selected

**Independent Test**: Generate report spanning 100 days, click "Custom", select Feb 1-15 in calendar, verify all charts filter to that range

### Implementation for User Story 6b (Custom Date Range)

**Part A: Research & Library Selection**

- [ ] T047 [US6b] Research calendar picker libraries per criteria in research.md Section 12
  - Evaluate Flatpickr, Pikaday, Vanilla Calendar, Litepicker, native HTML5
  - Test bundle size, accessibility, mobile support, date constraints
  - Document findings in research.md Section 12
  - Make final recommendation with rationale

- [ ] T048 [US6b] Select and integrate calendar library
  - Install selected library (or bundle inline if needed)
  - Verify works without external CDN (self-contained requirement)
  - Test basic calendar functionality in isolation

**Part B: Data Schema & State Management**

- [ ] T049 [US6b] Add availableDateRange to ChartsData interface in src/reporter/types.ts
  - Add `availableDateRange: { min: string; max: string }` field
  - Update type documentation

- [ ] T050 [US6b] Update generateReport() in src/reporter/generator.ts to include availableDateRange
  - Calculate min date from earliest build timestamp
  - Calculate max date from latest build timestamp
  - Convert to ISO format (YYYY-MM-DD)
  - Add to ChartsData output

- [ ] T051 [US6b] Extend global state in ChartScripts.tsx for custom date range
  - Add `customRange: { from: string | null, to: string | null }` to dateFilterState
  - Add `availableDateRange` from chartsData
  - Initialize state with proper defaults

**Part C: Custom Date Picker Component**

- [ ] T052 [US6b] Create CustomDatePickerPopover.tsx component at src/reporter/templates/default/components/CustomDatePickerPopover.tsx
  - Integrate selected calendar library
  - Add "From" date picker with calendar dropdown
  - Add "To" date picker with calendar dropdown
  - Add "Clear" button
  - Configure calendar to disable dates outside availableDateRange
  - Add date validation (From <= To)
  - Display inline error for invalid ranges

- [ ] T053 [US6b] Add popover positioning logic to CustomDatePickerPopover
  - Desktop: position below Custom button, right-aligned
  - Tablet: adjust if near viewport edge
  - Mobile: intelligent positioning (may appear above if bottom space limited)
  - Use CSS or JavaScript positioning library

- [ ] T054 [US6b] Export CustomDatePickerPopover from src/reporter/templates/default/components/index.ts

- [ ] T055 [US6b] Update DateRangeFilter.tsx to include "Custom" button
  - Add "Custom" as 5th button
  - Add click handler to open/close popover
  - Manage popover visibility state

**Part D: Custom Date Range Logic**

- [ ] T056 [US6b] Add applyCustomDateRange() function in ChartScripts.tsx
  - Validate From <= To dates
  - Show error message if invalid
  - Update dateFilterState.activeFilter = 'custom'
  - Update dateFilterState.customRange = { from, to }
  - Apply date range to all charts (set scale min/max)
  - Update filter button highlights
  - Call updateFooter()

- [ ] T057 [US6b] Add calendar picker event handlers in ChartScripts.tsx
  - On date selection: call applyCustomDateRange()
  - On "Clear" button: reset to "All" filter, close popover
  - On outside click: close popover (preserve valid custom range)

- [ ] T058 [US6b] Integrate custom range with drag-to-zoom
  - When chart is zoomed via drag, extract date range from zoom
  - Update dateFilterState.activeFilter = 'custom'
  - Update dateFilterState.customRange with zoomed dates
  - Highlight Custom button
  - Call updateFooter()

- [ ] T059 [US6b] Update preset filter click handlers
  - When preset filter clicked: clear customRange
  - If popover is open: close it
  - Apply preset filter as before

- [ ] T060 [US6b] Add default date range logic when opening popover
  - If "All" is active: default From/To to full data range
  - If preset is active: default From/To to current preset range
  - If custom is active: show current custom range

**Part E: Footer Updates**

- [ ] T061 [US6b] Update Footer.tsx component to display build count and date range
  - Move "Builds: X · YYYY-MM-DD – YYYY-MM-DD" from Header to Footer
  - Display on first row of footer
  - Version info on second row

- [ ] T062 [US6b] Add updateFooter() function in ChartScripts.tsx
  - Calculate visible build count based on active filter
  - Get effective date range (from global state)
  - Update footer DOM with current values
  - Format dates in ISO (YYYY-MM-DD)

- [ ] T063 [US6b] Call updateFooter() from all filter change handlers
  - After preset filter applied
  - After custom range applied
  - After zoom applied
  - After reset zoom

**Part F: Edge Cases & Validation**

- [ ] T064 [US6b] Handle empty custom date range
  - Show "No data in selected range" in charts
  - Display "Builds: 0 · {from} – {to}" in footer
  - Keep custom filter active (allow user to adjust)

- [ ] T065 [US6b] Add keyboard accessibility for custom date picker
  - Tab navigation through calendar
  - Arrow keys to navigate dates
  - Enter/Space to select dates
  - Escape to close popover
  - Verify focus indicators visible

- [ ] T066 [US6b] Add ARIA labels for custom date picker
  - Label "From date" and "To date" pickers
  - Announce error messages
  - Announce popover open/close states

- [ ] T067 [US6b] Test mobile responsiveness
  - Verify popover positioning on mobile
  - Test touch interaction with calendar
  - Verify calendar is touch-friendly

**Part G: Integration Testing**

- [ ] T068 [US6b] Test custom range with preset filters
  - Select custom range → click preset → verify custom cleared
  - Click preset → open custom popover → verify defaults to preset range

- [ ] T069 [US6b] Test custom range with zoom
  - Drag-to-zoom → verify Custom button activates
  - Verify custom range reflects zoomed dates
  - Reset zoom from preset → verify returns to preset
  - Reset zoom from custom → verify returns to custom range

- [ ] T070 [US6b] Test custom range with preview toggle
  - Apply custom range → toggle preview → verify filter preserved
  - Verify footer updates correctly

- [ ] T071 [US6b] Add visual fixture for custom date range testing
  - Create fixture spanning 100+ days
  - Test custom range selection
  - Test edge cases (empty range, invalid range)

**Checkpoint**: User Story 6b complete - custom date range picker fully functional

---

## Phase 9: User Story 7 - Export Chart as Image (Priority: P3)

**Goal**: Users can export individual charts as PNG images

**Independent Test**: Click export button on a chart, verify PNG downloads with metric name as filename

### Implementation for User Story 7 (PNG Export)

- [ ] T072 [US7] Add export button (download icon) to MetricCard.tsx header area
- [ ] T073 [US7] Add exportChartAsPng() function in ChartScripts.tsx using canvas.toDataURL()
- [ ] T074 [US7] Add title drawing to exported image (metric name as header)
- [ ] T075 [US7] Add "(Preview Data)" watermark when exporting with dummy data active
- [ ] T076 [US7] Add click handlers for export buttons

**Checkpoint**: User Story 7 complete - PNG export works with proper titles/watermarks

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Visual validation, edge cases, and accessibility

- [ ] T077 [P] Update minimal fixture in tests/fixtures/visual-review/minimal/ to have exactly 5 builds (toggle visible)
- [ ] T078 [P] Update sparse-data fixture in tests/fixtures/visual-review/sparse-data/ to have 3 builds with gaps in metric data
- [ ] T079 [P] Verify full-featured fixture in tests/fixtures/visual-review/full-featured/ has 25 builds (toggle hidden)
- [ ] T080 [P] Update edge-cases fixture in tests/fixtures/visual-review/edge-cases/ to include metric with single data point and flatline data
- [ ] T081 Add fixture with 50+ builds to test zoom/pan functionality
- [ ] T082 Add fixture spanning 100+ days to test date range filtering and custom date picker
- [ ] T083 Run bun run visual-review to generate fixtures and manually verify all acceptance scenarios
- [ ] T084 Verify toggle keyboard accessibility (Tab navigation, Space/Enter activation, focus ring visibility)
- [ ] T085 Verify ARIA attributes on toggle (role="switch") and charts (aria-label)
- [ ] T086 [P] Verify crosshair vertical line appears in all visual fixtures:
  - Hover over any chart → vertical line visible on all metric charts
  - Line appears on line charts and bar charts
  - Line is visible in light mode and dark mode (color contrast OK)
- [ ] T087 [P] Verify crosshair works with zoom (US5 integration):
  - Zoom one chart → vertical line still appears and syncs across charts
  - Line respects zoomed chartArea boundaries (doesn't extend beyond zoom)
  - Reset zoom → vertical line works normally again
- [ ] T088 [P] Verify crosshair works with date filter (US6/US6b integration):
  - Apply preset filter → vertical line still appears on hover
  - Apply custom filter → vertical line still appears on hover
  - Line position is visual (not affected by data filtering)
- [ ] T089 Verify custom date picker accessibility:
  - Keyboard navigation through calendar
  - ARIA labels on date pickers
  - Error messages announced
  - Popover open/close announced
- [ ] T090 Verify browser compatibility for all features:
  - Test on modern Chrome, Firefox, Safari, Edge
  - Verify no console errors related to canvas, calendar, or event handling
- [ ] T091 Run bun run typecheck to ensure no TypeScript errors
- [ ] T092 Run bun lint to ensure code style compliance
- [ ] T093 Run bun test to verify existing tests still pass

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
- **User Story 6 (Phase 8)**: Depends on US1 charts working (preset date filtering)
- **User Story 6b (Phase 8b)**: Depends on US6 (preset filters) + calendar library research completed
- **User Story 7 (Phase 9)**: Depends on US1 charts working (PNG export)
- **Polish (Phase 10)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 - Core metric trends
- **User Story 2 (P2)**: Can start after Phase 2 - Preview toggle for sparse data
- **User Story 3 (P1)**: Can start after US1 - Synchronized tooltips
- **User Story 4 (P3)**: Can start after Phase 2 - Consistent build history/gaps
- **User Story 5 (P2)**: Can start after US1 - Zoom/pan
- **User Story 6 (P2)**: Can start after US1 - Preset date range filtering
- **User Story 6b (P2)**: Can start after US6 + calendar library research complete - Custom date range picker
- **User Story 7 (P3)**: Can start after US1 - PNG export

### Within Each User Story

- Type definitions before implementation
- Generator logic before components
- Components before client-side scripts
- Core implementation before edge case handling
- User Story 3 note: Vertical line plugin (Part A) and tooltip sync (Part B) can be developed in parallel as they use independent mechanisms

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
6. **+Preset Filters**: Add US6 → Preset date range filtering (7/30/90/All)
7. **+Custom Range**: Add US6b → Custom date range picker (requires research first)
8. **+Export**: Add US7 → PNG export
9. **Polish**: Visual validation and accessibility compliance

### Recommended Single-Developer Order

Since most files are shared across stories, sequential execution is recommended:

1. T001-T003 (Setup)
2. T004-T007 (Foundational)
3. T008-T012 (US1) → Validate
4. T013-T023 (US2) → Validate
5. T024-T028 (US4 - gaps) → Validate
6. T029-T032 (US3 - tooltips) → Validate
7. T033-T039 (US5 - zoom) → Validate
8. T040-T046 (US6 - preset filters) → Validate
9. **PAUSE** - Complete calendar library research (T047-T048)
10. T049-T071 (US6b - custom date picker) → Validate
11. T072-T076 (US7 - export) → Validate
12. T077-T093 (Polish)

---

## Notes

- All tasks modify existing files except T001 (new synthetic.ts), T015 (new PreviewBar.tsx), and T040 (new DateRangeFilter.tsx)
- Visual review (`bun run visual-review`) is the primary validation method
- No unit tests explicitly requested; visual fixtures serve as acceptance tests
- Commit after each phase completion for easy rollback
- T058 is manual verification - open generated HTML files in browser
- Feature flags (showToggle, zoom enabled) are determined automatically based on data, not user configuration
