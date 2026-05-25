## Overview

Multi-metric charts allow users to plot multiple related metrics on a single chart with a shared X-axis. This enables side-by-side comparison of related metrics (e.g., LOC per programming language, modern vs legacy classes) without requiring the viewer to mentally correlate separate charts.

## ADDED Requirements

### Requirement: Multi-Metric Chart Configuration

As a user, I want to combine multiple metrics into a single chart so that I can compare related metrics directly.

The system SHALL support chart definitions that reference multiple metrics, rendered as distinct data series with automatic color differentiation.

#### Scenario: Chart with two metrics

- **GIVEN** a chart configuration referencing "typescript-loc" and "javascript-loc" metrics
- **WHEN** the report is generated
- **THEN** a single chart displays both metrics as separate lines
- **THEN** each line uses a distinct color
- **THEN** a legend identifies each metric by name

#### Scenario: Chart with four metrics

- **GIVEN** a chart configuration referencing four different size metrics
- **WHEN** the report is generated
- **THEN** the chart displays all four metrics as separate data series
- **THEN** the legend shows all four metric names

#### Scenario: Invalid metric reference

- **GIVEN** a chart configuration references a metric that does not exist in the database
- **WHEN** the report is generated
- **THEN** the missing metric is omitted from the chart
- **THEN** the remaining valid metrics are rendered normally

### Requirement: Custom Chart Titles

The system SHALL support an optional `title` property on chart definitions, used as the display title for the chart card. When absent, the system SHALL derive a title from the metric names.

#### Scenario: Explicit chart title

- **GIVEN** a multi-metric chart configuration with `title: "Modern vs Legacy Classes"`
- **WHEN** the report is generated
- **THEN** the chart card displays "Modern vs Legacy Classes" as its title

#### Scenario: Auto-generated chart title

- **GIVEN** a multi-metric chart configuration without a `title` property referencing "typescript-loc" and "javascript-loc"
- **WHEN** the report is generated
- **THEN** the chart card displays a title derived from the metric names (e.g., "typescript-loc, javascript-loc")

#### Scenario: Single-metric chart title

- **GIVEN** a single-metric chart configuration with `title: "Bundle Size"`
- **WHEN** the report is generated
- **THEN** the chart card displays "Bundle Size" as its title, overriding the metric's display name

### Requirement: Shared Axis Rendering

The system SHALL render multi-metric charts with a shared X-axis (build timeline) and independent Y-axes when metrics have incompatible units or scales.

#### Scenario: Metrics with same unit

- **GIVEN** a multi-metric chart with two metrics measured in "lines of code"
- **WHEN** the chart is rendered
- **THEN** both metrics share a single Y-axis with appropriate scale

#### Scenario: Metrics with different units

- **GIVEN** a multi-metric chart with one metric in "bytes" and another in "count"
- **WHEN** the chart is rendered
- **THEN** the chart displays two Y-axes: left axis for bytes, right axis for count
- **THEN** each metric line is visually associated with its corresponding axis

#### Scenario: Metrics with vastly different scales

- **GIVEN** a multi-metric chart with one metric ranging 0-10 and another ranging 0-10000
- **WHEN** the chart is rendered
- **THEN** both metrics are clearly visible and distinguishable
- **THEN** neither metric appears as a flat line due to scale compression

### Requirement: Legend and Tooltip Integration

The system SHALL display a legend for multi-metric charts and include metric-specific data in synchronized crosshair tooltips.

#### Scenario: Legend display

- **GIVEN** a multi-metric chart with three metrics
- **WHEN** the report is generated
- **THEN** a legend appears above or beside the chart showing each metric name with its color
- **THEN** clicking a legend item toggles the visibility of that metric

#### Scenario: Tooltip with multiple values

- **GIVEN** a multi-metric chart with two metrics
- **WHEN** the user hovers over a build point
- **THEN** the tooltip displays both metric values for that build
- **THEN** each value is labeled with its metric name

#### Scenario: Missing data in multi-metric tooltip

- **GIVEN** a multi-metric chart where one metric has no data for a specific build
- **WHEN** the user hovers over that build
- **THEN** the tooltip shows the available metric value
- **THEN** the tooltip indicates "No data" for the missing metric

## Key Entities

- **Multi-Metric Chart**: A chart configuration referencing multiple metrics to be plotted together.
- **Legend**: UI element identifying each metric series by name and color.
- **Dual Y-Axis**: Separate left and right Y-axes for metrics with incompatible units or scales.

## Related

- `reporting` — Multi-metric charts modify how chart rendering and tooltips behave.
- `report-sections` — Multi-metric charts can be placed within report sections.
