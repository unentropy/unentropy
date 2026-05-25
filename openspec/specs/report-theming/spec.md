# report-theming Specification

## Purpose
TBD - created by archiving change themed-reports. Update Purpose after archive.
## Requirements
### Requirement: Built-in Palette Selection

As a user, I want to select from professionally designed color palettes so that my reports match my team's aesthetic without manual CSS work.

The system SHALL support four built-in palette names — "lattice", "flux", "halftone", "specimen" — selectable via `report.theme` in `unentropy.json`. Each palette SHALL provide both a dark and a light variant covering 12 CSS variables.

#### Scenario: Default palette is Lattice

- **GIVEN** no `report.theme` is configured
- **WHEN** the report is generated
- **THEN** the Lattice dark palette is applied as the default

#### Scenario: Selecting Flux palette

- **GIVEN** the user sets `report.theme` to "flux"
- **WHEN** the report is generated
- **THEN** the Flux palette is used, with dark and light variants emitted according to `report.mode`

#### Scenario: Invalid palette name falls back to Lattice

- **GIVEN** the user sets `report.theme` to an unknown name
- **WHEN** the report is generated
- **THEN** the system emits a warning and falls back to the Lattice palette

### Requirement: Custom Palette Override

As a user with specific branding needs, I want to override individual color variables so that reports match my organization's colors.

The system SHALL accept a custom palette object under `report.theme` containing `dark` and/or `light` partial variable maps. Any omitted variables SHALL fall back to Lattice defaults.

#### Scenario: Custom accent color only

- **GIVEN** the user provides a custom theme with only `--accent` overridden in dark and light
- **WHEN** the report is generated
- **THEN** the custom accent color is used
- **THEN** all other variables use Lattice defaults

#### Scenario: Full custom palette

- **GIVEN** the user provides all 12 variables for both dark and light
- **WHEN** the report is generated
- **THEN** no Lattice fallback values are used

### Requirement: Light/Dark Mode Control

As a user, I want to control whether the report respects my system preference or locks to a specific mode so that screenshots and shared reports look consistent.

The system SHALL support `report.mode` values "auto", "light", and "dark". "auto" SHALL emit both palette variants and rely on `prefers-color-scheme`. "light" and "dark" SHALL set `data-theme` on `<html>` and emit only that variant's CSS.

#### Scenario: Auto mode with system preference

- **GIVEN** `report.mode` is "auto"
- **WHEN** the report is opened on a system with dark mode enabled
- **THEN** the dark palette is active
- **WHEN** the same report is opened on a system with light mode enabled
- **THEN** the light palette is active

#### Scenario: Locked dark mode

- **GIVEN** `report.mode` is "dark"
- **WHEN** the report is opened on a system with light mode enabled
- **THEN** the dark palette is still active because `data-theme="dark"` overrides `prefers-color-scheme`

#### Scenario: Locked light mode saves bytes

- **GIVEN** `report.mode` is "light"
- **WHEN** the report HTML is inspected
- **THEN** only the light variant's 12 CSS variables are present in the stylesheet
- **THEN** no dark palette variables are emitted

