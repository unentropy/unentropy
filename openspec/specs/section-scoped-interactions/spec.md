## Overview

When a report uses sections to organize charts, crosshairs and drag-to-zoom should scope their interaction to the section the user is currently engaging with. This keeps sections visually independent — hovering or zooming in one section does not affect charts in other sections. Global time range presets (7d, 30d, 90d, Custom) remain available as top-level commands that apply to all sections.

## Requirements

### Requirement: Per-Section Crosshair Synchronization

As a user viewing a multi-section report, I want crosshairs to only appear on charts within the section I'm hovering, so that each section's charts stay visually independent.

When a report has sections, the system SHALL synchronize crosshair position and tooltips only among charts within the same section. A hover event in one section SHALL NOT cause crosshairs or tooltips to appear in other sections.

#### Scenario: Single-section hover

- **GIVEN** a report with two sections ("Code Health" and "Refactor Sprint")
- **WHEN** the user hovers over a chart in "Code Health"
- **THEN** a crosshair line and tooltip appear on all charts within "Code Health"
- **AND** no crosshair or tooltip appears on any chart in "Refactor Sprint"

#### Scenario: Cross-section hover transition

- **GIVEN** a report with two sections and the user is hovering over a chart in "Code Health" (crosshairs active there)
- **WHEN** the user moves their mouse into "Refactor Sprint"
- **THEN** crosshairs in "Code Health" clear
- **AND** crosshairs appear on charts in "Refactor Sprint"

#### Scenario: Mouse leaves all charts

- **GIVEN** a report with sections and crosshairs active in "Code Health"
- **WHEN** the user moves their mouse outside any chart area
- **THEN** all crosshairs clear

#### Scenario: Flat layout unaffected

- **GIVEN** a report with no sections (flat layout)
- **WHEN** the user hovers over any chart
- **THEN** crosshairs synchronize across all charts as before (global behavior, unchanged)

### Requirement: Per-Section Drag-to-Zoom

As a user viewing a multi-section report, I want drag-to-zoom to only affect the section where I performed the zoom, so that I can explore a specific time window in one section without disrupting other sections.

When a report uses sections, the system SHALL apply drag-to-zoom only to charts within the section where the zoom gesture was performed. Zoom applied in one section SHALL NOT affect charts in other sections.

#### Scenario: Zoom within a section

- **GIVEN** a report with two sections
- **WHEN** the user clicks and drags to zoom on a chart in "Code Health"
- **THEN** all charts in "Code Health" zoom to the selected range
- **AND** no charts in "Refactor Sprint" are affected

#### Scenario: Zoom requires minimum data

- **GIVEN** a chart with fewer than 10 data points in a section
- **WHEN** the user attempts to drag-to-zoom
- **THEN** the zoom is not applied

### Requirement: Global Presets Override Section Zooms

As a user, I want global time range presets to always apply to all sections, so that I can quickly switch between overall report views.

When a global preset (7d, 30d, 90d, All) or Custom date range is applied, the system SHALL reset all per-section zoom states before applying the global filter.

#### Scenario: Global preset clears section zoom

- **GIVEN** "Refactor Sprint" has been zoomed to a custom range via drag-to-zoom
- **WHEN** the user clicks "90d" in the global filter bar
- **THEN** the "Refactor Sprint" zoom is cleared
- **AND** all sections display the 90d range

#### Scenario: "All" resets

- **GIVEN** "Code Health" has been zoomed to a custom range
- **WHEN** the user clicks "All"
- **THEN** "Code Health" returns to its full data range

#### Scenario: Custom date applies globally

- **GIVEN** a report with multiple sections
- **WHEN** the user selects a custom date range
- **THEN** all sections display that date range
- **AND** any per-section zooms are cleared

## Key Entities

- **Section Sync Group**: A logical group of charts within the same report section that share crosshair and zoom synchronization
- **Global Preset**: A time range filter (All, 7d, 30d, 90d, Custom) applied from the toolbar, affecting all sections
- **Per-Section Zoom**: A zoom state applied to a single section via drag-to-zoom, independent of other sections
