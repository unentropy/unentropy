## Overview

Chart ordering in Unentropy reports follows the natural definition order from the configuration file. No explicit ordering property is required — sections appear in the order defined in the `sections` array, and charts appear in the order defined within each section's `charts` array.

## ADDED Requirements

### Requirement: Definition Order

The system SHALL render sections and charts in the same order as they appear in the configuration file.

#### Scenario: Sections in definition order

- **GIVEN** a report configuration with sections "Build Metrics", "Quality", "Performance" defined in that order
- **WHEN** the report is generated
- **THEN** the sections appear in the report in the order: "Build Metrics", "Quality", "Performance"

#### Scenario: Charts in definition order

- **GIVEN** a section with charts referencing "bundle-size", "build-time", "dependencies" in that order
- **WHEN** the report is generated
- **THEN** the charts appear in the section in the order: "bundle-size", "build-time", "dependencies"

## Key Entities

- **Definition Sequence**: The natural ordering based on the position of elements in the configuration file.

## Related

- `report-sections` — Sections and charts follow definition order.
- `reporting` — Report structure respects definition order.
