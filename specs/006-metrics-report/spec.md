# Feature Specification: Metrics Report

**Feature Branch**: `006-metrics-report`  
**Created**: 2025-11-29  
**Updated**: 2025-12-07  
**Status**: Draft  
**Input**: User description: "Metrics Report - HTML report template specification detailing appearance and behavior, expanding on MVP (spec 001) with graph sections, dummy data toggle for sparse data, and normalized X-axis (consistent build history). Enhanced with synchronized tooltips, zoom/pan, date range filtering, and chart export."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Metric Trends in Report (Priority: P1)

A developer or engineering manager opens a generated HTML report to view the trends of tracked metrics over time. Each metric is displayed in its own section with a visual chart, summary statistics, and contextual information.

**Why this priority**: Core functionality - without clear metric visualization, the report has no value. This is the foundational feature that everything else builds upon.

**Independent Test**: Can be fully tested by generating a report with multiple metrics and verifying each metric has its own card with chart, statistics (latest, min, max, trend), and description.

**Acceptance Scenarios**:

1. **Given** a database with 3 metrics tracked over 15 builds, **When** the report is generated and opened, **Then** the user sees 3 distinct metric sections with individual charts and summary statistics for each.

2. **Given** a metric with numeric values, **When** the user views its section, **Then** they see a line chart with data points for each build, plus Latest/Min/Max/Trend statistics.

3. **Given** a metric with label values, **When** the user views its section, **Then** they see a bar chart showing the distribution of label occurrences.

---

### User Story 2 - Toggle Between Real and Dummy Data (Priority: P2)

When a report has limited build data (fewer than 10 builds), the user can toggle a switch to view the charts with synthetic/dummy data. This helps users understand how the report will look once they have more data, and validates the chart rendering.

**Why this priority**: Improves user experience during early adoption when data is sparse. Helps users "preview" the value of the tool.

**Independent Test**: Can be fully tested by generating a report with 5 builds and verifying the toggle appears and switches the chart data between real and synthetic values.

**Acceptance Scenarios**:

1. **Given** a report with fewer than 10 total builds, **When** the user opens the report, **Then** a toggle switch appears in the header area with the label "Show preview data" in the ON position (showing synthetic data by default).

2. **Given** the toggle is visible and in the "on" position (default), **When** the user clicks/taps the toggle to OFF, **Then** all charts switch to displaying the actual recorded sparse data (even if only 1-2 builds, or empty if 0 builds).

3. **Given** the toggle is in the "off" position showing real sparse data, **When** the user clicks/taps the toggle to ON, **Then** all charts display synthetic/dummy data with 20 data points that demonstrates metric trends using the real metric names and descriptions from the configuration.

4. **Given** a report with 10 or more total builds, **When** the user opens the report, **Then** no toggle is displayed and only real data is shown.

5. **Given** a report with 0 builds but configured metrics, **When** the user opens the report, **Then** the toggle appears ON by default showing synthetic data using metric names/descriptions from config, and toggling OFF shows empty charts.

---

### User Story 3 - Synchronized Tooltips Across Charts (Priority: P1)

When a user hovers over a data point on one chart, all other charts simultaneously display tooltips for the same build. This allows users to compare metric values across different metrics at the exact same point in time.

**Why this priority**: Essential for comparing metrics - users need to correlate values across charts (e.g., "when coverage dropped, did bundle size increase?"). This is a must-have for meaningful analysis.

**Independent Test**: Can be fully tested by generating a report with 3+ metrics and hovering over a data point on one chart, verifying that all other charts show tooltips for the same build timestamp.

**Acceptance Scenarios**:

1. **Given** a report with multiple metrics, **When** the user hovers over a data point on Chart A, **Then** all other visible charts display tooltips showing their values for the same build.

2. **Given** synchronized tooltips are displayed, **When** the user moves the mouse to a different data point, **Then** all tooltips update simultaneously to reflect the new build.

3. **Given** a metric that has no data for a specific build, **When** the user hovers over that build on another chart, **Then** the sparse metric's chart shows a tooltip indicating "No data for this build".

4. **Given** the user moves the mouse away from all charts, **When** no chart is being hovered, **Then** all tooltips are dismissed.

---

### User Story 4 - View Consistent Build History Across Metrics (Priority: P3)

The user views charts with a normalized X-axis, where all charts show the complete set of builds from the database. If a particular metric is missing data for a specific build, the chart handles this gracefully by displaying a gap without distorting the timeline.

**Why this priority**: Ensures visual consistency and accurate comparison across metrics. Prevents confusion when different metrics have different data availability.

**Independent Test**: Can be fully tested by generating a report where Metric A has data for builds 1-10 but Metric B only has data for builds 3, 5, 8, and verifying both charts show the same X-axis range.

**Acceptance Scenarios**:

1. **Given** metrics with varying data availability across builds, **When** the user views the report, **Then** all charts display the same X-axis range covering all builds in the database.

2. **Given** a metric that is missing a value for a specific build, **When** the chart is rendered, **Then** the missing data point is visually indicated as a gap in the line (not interpolated or connected).

3. **Given** hovering over a missing data point region, **When** the tooltip appears, **Then** it indicates "No data for this build".

---

### User Story 5 - Zoom and Pan Charts (Priority: P2)

Users can zoom into charts to examine specific time periods in detail, and pan horizontally to navigate through the data. This is especially useful for reports with many builds where data points become dense.

**Why this priority**: Important for usability with larger datasets. Without zoom/pan, users cannot effectively analyze specific periods in dense charts.

**Independent Test**: Can be fully tested by generating a report with 50+ builds and verifying that mouse wheel zooms the chart, click-drag pans horizontally, and the reset button restores the original view.

**Acceptance Scenarios**:

1. **Given** a chart displaying data, **When** the user scrolls the mouse wheel over a chart, **Then** the chart zooms in/out centered on the cursor position.

2. **Given** a zoomed-in chart, **When** the user clicks and drags horizontally, **Then** the chart pans to show different portions of the data.

3. **Given** a zoomed-in chart, **When** the user clicks the "Reset zoom" button, **Then** the chart returns to showing all data points at the original scale.

4. **Given** the user zooms one chart, **When** the zoom is applied, **Then** all other charts synchronize to the same zoom level and position.

5. **Given** charts at default zoom level, **When** the user views the charts, **Then** no "Reset zoom" button is visible.

---

### User Story 6 - Filter by Date Range (Priority: P2)

Users can quickly filter all charts to show data from predefined time periods (last 7 days, 30 days, 90 days, or all time). This provides a fast way to focus on recent trends without manual zooming.

**Why this priority**: Complementary to zoom/pan - provides quick access to common time windows that users frequently want to analyze.

**Independent Test**: Can be fully tested by generating a report spanning 100 days and verifying that clicking each filter button updates all charts to show only data within that range.

**Acceptance Scenarios**:

1. **Given** a report is opened, **When** the user views the header area, **Then** they see filter buttons: "7 days", "30 days", "90 days", "All".

2. **Given** the filter buttons are visible, **When** the user clicks "30 days", **Then** all charts update to show only data from the last 30 days.

3. **Given** a filter is active, **When** the user views the filter buttons, **Then** the active filter is visually highlighted.

4. **Given** a report is first opened, **When** no filter has been selected, **Then** "All" is the default active filter.

5. **Given** a date range filter is applied, **When** no data exists within that range, **Then** each chart displays an empty state message within the chart area.

---

### User Story 7 - Export Chart as Image (Priority: P3)

Users can export individual charts as PNG images for use in presentations, documentation, or sharing with team members.

**Why this priority**: Nice-to-have feature that improves sharing capabilities. Lower priority than core visualization features but adds significant value for communication.

**Independent Test**: Can be fully tested by generating a report and clicking the export button on a chart, verifying that a PNG file is downloaded with the chart content.

**Acceptance Scenarios**:

1. **Given** a chart is displayed, **When** the user views the chart card, **Then** they see a "Download PNG" button.

2. **Given** the user clicks "Download PNG", **When** the export completes, **Then** a PNG file is downloaded containing the chart with its title.

3. **Given** the dummy data toggle is active, **When** the user exports a chart, **Then** the exported image includes a "(Preview Data)" watermark.

4. **Given** a date range filter is active, **When** the user exports a chart, **Then** the exported image reflects the currently filtered data range.

---

### Edge Cases

- What happens when the database has zero builds?
  - Display an empty state with guidance message, no toggle shown.

- What happens when a metric has data for only 1 build?
  - Display the single point as a dot on the chart with statistics showing that value as Latest/Min/Max; trend shows "N/A".

- What happens when toggling dummy data while interacting with a chart tooltip?
  - Tooltip should dismiss and chart should smoothly transition to the new data.

- What happens when all metric values are identical (flatline)?
  - Chart Y-axis should still show a reasonable scale; trend indicator shows "stable" (→).

- What happens when a metric has extremely large values vs another with small values?
  - Each chart maintains its own Y-axis scale optimized for its data range.

- What happens when zooming on a chart with fewer than 3 data points?
  - Zoom functionality should be disabled; the chart displays normally without zoom controls.

- What happens when a date range filter is applied but no data exists within that range?
  - Each chart displays an empty state message within the chart area: "No data in selected range".

- What happens when exporting a chart while dummy data is displayed?
  - The exported PNG includes a "(Preview Data)" watermark to indicate synthetic data.

- What happens when synchronized tooltips are triggered on a chart with no data for that build?
  - The tooltip displays "No data for this build" at the corresponding X-axis position.

- What happens when the user zooms while a date range filter is active?
  - Zoom operates within the filtered range; reset zoom returns to the filtered view, not "All" data.

## Requirements *(mandatory)*

### Functional Requirements

**Report Structure (existing from MVP)**

- **FR-001**: Report MUST display a header section showing repository name, generation timestamp, date range of data, and total build count.
- **FR-002**: Report MUST display each metric in its own card/section within a responsive grid layout.
- **FR-003**: Each metric section MUST include the metric name, description (if provided), and a visual chart.
- **FR-004**: Each numeric metric section MUST display summary statistics: Latest, Min, Max, and Trend (direction + percentage).
- **FR-005**: Report MUST display a footer with version information and documentation link.

**Chart Visualization**

- **FR-006**: Numeric metrics MUST be displayed as line charts with a smooth curve and filled area under the line.
- **FR-007**: Label metrics MUST be displayed as bar charts showing occurrence counts per label.
- **FR-008**: All charts MUST have clearly labeled axes (X-axis: build date/identifier, Y-axis: metric value or count).
- **FR-009**: Charts MUST display interactive tooltips on hover showing exact value, timestamp, and commit SHA (first 7 characters).

**Normalized Y-Axis and Build Consistency**

- **FR-010**: All charts MUST display the complete build history on the X-axis, spanning from the first to the last build recorded in the database.
- **FR-011**: When a metric has no value recorded for a specific build, the chart MUST display a visual gap (discontinuity) at that position rather than interpolating or connecting adjacent points.
- **FR-012**: Tooltip for missing data points MUST indicate "No data for this build".
- **FR-013**: Each chart Y-axis MUST be independently scaled to optimize the display for that metric's value range.

**Dummy Data Toggle (Preview Bar)**

- **FR-014**: When total build count is less than 10, the report MUST display a Preview Bar below the header containing an explanatory message and a toggle switch.
- **FR-015**: The Preview Bar MUST include a toggle styled as a Tailwind CSS switch component with label "Show preview".
- **FR-016**: When the toggle is activated, charts MUST display synthetic demonstration data that shows a realistic trend pattern.
- **FR-017**: Synthetic data MUST generate 20 data points spanning 60 days with a plausible trend (gradual increase/decrease with minor fluctuations).
- **FR-018**: Toggle state changes MUST animate the chart transition smoothly.
- **FR-019**: Summary statistics MUST update to reflect the currently displayed data (real or synthetic).
- **FR-020**: When build count is 10 or more, the toggle MUST NOT be displayed.

**Data Quality Indicators**

- **FR-021**: Metrics with fewer than 5 data points MUST display a "sparse data" warning indicator.
- **FR-022**: Reports with zero metrics MUST display an empty state with guidance on how to start collecting data.

**Styling and Responsiveness**

- **FR-023**: Report MUST be responsive across mobile (320px+), tablet (640px+), and desktop (1024px+) breakpoints.
- **FR-024**: Report MUST support both light and dark modes based on user's system preference.
- **FR-025**: Report MUST be printable with appropriate print stylesheet.

**Accessibility**

- **FR-026**: Report MUST meet WCAG 2.1 AA accessibility standards for color contrast and keyboard navigation.
- **FR-027**: Charts MUST have ARIA labels describing their content for screen readers.
- **FR-028**: Toggle switch MUST be keyboard accessible with visible focus indicator.

**Synchronized Tooltips**

- **FR-029**: When hovering over a data point on any chart, all other charts MUST simultaneously display tooltips for the same build.
- **FR-030**: Tooltip synchronization MUST work across both line charts (numeric metrics) and bar charts (label metrics).
- **FR-031**: When the hovered build has no data for a particular metric, that chart MUST display a tooltip indicating "No data for this build".
- **FR-032**: When the mouse leaves all chart areas, all tooltips MUST be dismissed.

**Zoom and Pan**

- **FR-033**: Charts MUST support mouse wheel zoom, centered on the cursor position.
- **FR-034**: Charts MUST support click-and-drag horizontal panning when zoomed in.
- **FR-035**: When any chart is zoomed, all charts MUST synchronize to the same zoom level and X-axis range.
- **FR-036**: A "Reset zoom" button MUST appear on each chart when zoomed in.
- **FR-037**: Clicking "Reset zoom" MUST return all charts to the current filter's full range.
- **FR-038**: Charts with fewer than 3 data points MUST have zoom functionality disabled.
- **FR-039**: Report MUST load chartjs-plugin-zoom from CDN to enable zoom/pan functionality.

**Date Range Filtering**

- **FR-040**: Report MUST display filter buttons in the header: "7 days", "30 days", "90 days", "All".
- **FR-041**: Clicking a filter button MUST update all charts to display only data within that time range.
- **FR-042**: The active filter MUST be visually highlighted (e.g., different background color).
- **FR-043**: The default active filter MUST be "All" when the report is first opened.
- **FR-044**: When no data exists within the selected range, charts MUST display "No data in selected range" message.
- **FR-045**: Date range filtering MUST be calculated relative to the most recent build timestamp in the database.

**Chart Export**

- **FR-046**: Each chart card MUST display a "Download PNG" button.
- **FR-047**: Clicking "Download PNG" MUST trigger a browser download of the chart as a PNG image.
- **FR-048**: The exported image MUST include the metric name as a title.
- **FR-049**: When dummy data is active, the exported image MUST include a "(Preview Data)" watermark.
- **FR-050**: The exported image MUST reflect the current zoom level and date range filter.

### Key Entities

- **MetricSection**: A visual card containing a single metric's chart, statistics, and metadata. Attributes: metric name, description, chart type, data points, summary stats, sparse flag.

- **BuildContext**: A single CI/CD run that may contain values for one or more metrics. Attributes: timestamp, commit SHA, branch, run number.

- **SyntheticDataSet**: Generated demonstration data used when toggle is active. Attributes: 20 data points with timestamps, values following a realistic pattern.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can identify metric trends at a glance within 5 seconds of viewing a report.

- **SC-002**: 100% of reports with fewer than 10 builds display the dummy data toggle.

- **SC-003**: Charts load and render interactively within 2 seconds on standard desktop browsers.

- **SC-004**: Reports are visually consistent across all 4 test fixtures (minimal, full-featured, sparse-data, edge-cases).

- **SC-005**: Users can understand their project's metric health without referring to external documentation.

- **SC-006**: Reports remain fully functional and readable when printed or saved as PDF.

- **SC-007**: Toggle switch responds to user input within 100ms and charts update smoothly within 500ms.

- **SC-008**: Hovering on any chart displays synchronized tooltips on all other charts within 50ms.

- **SC-009**: Zoom and pan interactions respond within 100ms across all synchronized charts.

- **SC-010**: Date range filter updates all charts within 300ms of button click.

- **SC-011**: Chart PNG export completes within 1 second for standard chart sizes.

## Assumptions

- The report is a self-contained HTML file that can be opened in any modern browser.
- CDN resources (Tailwind CSS, Chart.js, chartjs-plugin-zoom) are available; if unavailable, a graceful fallback message is shown.
- Synthetic data generation uses deterministic patterns based on the current metric configuration to ensure consistency.
- Synthetic data spans 60 days from the current date, regardless of actual data range.
- The toggle persists only for the current session (reloading the page resets to real data).
- Build contexts are ordered chronologically by timestamp for X-axis display.
- All interactive features (tooltips, zoom, filters) are rendered client-side using embedded data from the database or pre-generated dummy data.
- Zoom synchronization applies to all visible charts; there is no option for independent zoom per chart.
