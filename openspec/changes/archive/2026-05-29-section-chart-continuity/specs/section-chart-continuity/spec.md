## Overview

When a report is organized into sections, each section may track metrics collected on a different set of builds than other sections. This capability makes each section's charts render continuously across the builds that section actually has data for, so a build belonging only to another section never appears as a break in this section's lines. It builds on report sections and section-scoped interactions, which already treat sections as visually independent units.

## ADDED Requirements

### Requirement: Per-Section Timeline Derivation

As a user viewing a multi-section report, I want each section's charts to span only the builds where that section's metrics have data, so that builds collected for other sections do not appear as empty gaps in this section.

The system SHALL derive, for each section, a section timeline consisting of the builds (and their timestamps) for which at least one metric referenced by that section has a recorded value. Charts within a section SHALL be rendered against that section timeline rather than the global all-builds timeline. The section timeline SHALL preserve chronological order.

#### Scenario: Sections with disjoint build sets

- **GIVEN** a report with two sections, "Section A" and "Section B"
- **AND** Section A's metrics have data only on builds 1, 3, and 5
- **AND** Section B's metrics have data only on builds 2 and 4
- **WHEN** the report is generated and opened
- **THEN** Section A's charts plot a continuous line across builds 1, 3, and 5 with no break at builds 2 or 4
- **AND** Section B's charts plot a continuous line across builds 2 and 4 with no break at builds 1, 3, or 5

#### Scenario: Sections with overlapping build sets

- **GIVEN** a report with two sections whose metrics share some builds and differ on others
- **WHEN** the report is generated
- **THEN** each section's timeline contains the union of builds where any of its own metrics have data
- **AND** neither section's charts contain breaks caused solely by builds unique to the other section

#### Scenario: Build axis reflects real dates

- **GIVEN** a section whose builds are unevenly spaced in time
- **WHEN** its charts are rendered
- **THEN** points are positioned along the time axis according to their actual build dates
- **AND** consecutive points are connected without intervening empty slots for builds outside the section timeline

### Requirement: Intra-Section Gap Preservation

As a user, I want a genuinely missing data point for one metric to still appear as a gap, so that I can tell the difference between continuous tracking and a metric that was skipped on a build its peers recorded.

The system SHALL continue to render a break in an individual metric's line when that metric has no value for a build that is part of its section timeline. Continuity SHALL only be added by excluding builds outside the section timeline, not by interpolating or bridging genuinely missing points within it.

#### Scenario: One metric missing a shared build

- **GIVEN** a section containing metrics X and Y
- **AND** build 3 has a value for Y but not for X
- **WHEN** the section's charts are rendered
- **THEN** build 3 is part of the section timeline because Y has data there
- **AND** Y's line passes through build 3
- **AND** X's line shows a break at build 3

### Requirement: Section-Scoped Interactions Over Section Timeline

As a user, I want crosshairs, zoom, and date-range filters to keep working after timelines become section-scoped, so that interactive features behave consistently across the report.

The system SHALL keep per-section crosshair synchronization, drag-to-zoom, and global date-range filters (presets and custom range) functional when charts render against section timelines. The default ("All") date range for a section SHALL correspond to the bounds of that section's timeline.

#### Scenario: Crosshair within a section after scoping

- **GIVEN** a multi-section report rendered with section timelines
- **WHEN** the user hovers over a chart in one section
- **THEN** crosshairs and tooltips appear on all charts within that section and align to the same build
- **AND** no crosshair appears in other sections

#### Scenario: Global date preset across sections

- **GIVEN** a multi-section report rendered with section timelines
- **WHEN** the user applies a "30d" preset
- **THEN** every section's charts constrain their visible range to the last 30 days
- **AND** a section with no builds in that window shows the "No data in selected range" overlay

### Requirement: Flat Layout Unaffected

As a user with a report that has no sections, I want chart rendering to behave exactly as before, so that this change introduces no regression for unsectioned reports.

The system SHALL leave the flat (no-section) layout rendering unchanged, rendering all charts against the global timeline.

#### Scenario: Report without sections

- **GIVEN** a report configuration with no sections
- **WHEN** the report is generated
- **THEN** all charts render against the global all-builds timeline with the previous gap behavior

## Key Entities

- **Section timeline**: The chronologically ordered set of builds for which at least one of a section's metrics has a recorded value.
- **Global timeline**: The full chronologically ordered set of all builds with any metric data, used for flat layouts and as the source from which section timelines are derived.
- **Gap**: A break in a single metric's line at a build that is in scope but has no recorded value for that metric.

## Related

- `report-sections` — defines how metrics are grouped into sections.
- `section-scoped-interactions` — defines per-section crosshair and zoom behavior that this capability must preserve.
- `reporting` — overall HTML report generation this capability renders within.
