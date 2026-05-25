## Overview

This delta updates the `reporting` specification to integrate with the new `report-theming` capability. The report's visual layer now derives all colors from a CSS-variable theme system instead of hard-coded Tailwind utilities. Dark mode behavior is expanded from `prefers-color-scheme` only to include explicit mode locking and per-palette light/dark variants.

## ADDED Requirements

### Requirement: Semantic Component Styling

As a user, I want the report to have a consistent, distinctive visual identity that looks intentional rather than generic.

The report SHALL use semantic CSS classes (prefixed `uent-*`) for all color, border, and text styling. These classes SHALL consume CSS variables only and SHALL NOT hard-code palette values. Layout primitives (flex, grid, spacing, responsive breakpoints) MAY continue to use Tailwind utilities.

#### Scenario: Component colors use variables

- **GIVEN** a report is generated with the Lattice palette
- **WHEN** the HTML is inspected
- **THEN** no Tailwind color utilities (e.g., `text-gray-900`, `bg-blue-600`) appear on theme-sensitive elements
- **THEN** semantic classes like `uent-card`, `uent-section-head`, `uent-stat-v` are present

#### Scenario: Typography uses designated stacks

- **GIVEN** a report is generated
- **WHEN** the page renders
- **THEN** monospace text (stats, headings, status bar) uses a `JetBrains Mono` / system-mono stack
- **THEN** sans-serif text (metric names, descriptions) uses an `Inter` / system-sans stack

## MODIFIED Requirements

### Requirement: Dark Mode

As a user viewing reports in different environments, I want the report to adapt to my system preference or stay locked to a specific mode so that it is readable in any context.

The report SHALL support both light and dark modes. When `report.mode` is "auto" or unset, the mode SHALL follow the user's system preference via `prefers-color-scheme`. When `report.mode` is "light" or "dark", the report SHALL lock to that mode by setting `data-theme` on the `<html>` element, overriding `prefers-color-scheme`. The active palette (determined by `report.theme`) SHALL provide both dark and light variants. Chart colors SHALL read from CSS variables at initialization time.

#### Scenario: Dark mode rendering

- **GIVEN** the user's system has dark mode enabled and `report.mode` is "auto"
- **WHEN** the report is opened
- **THEN** the active theme's dark palette is applied
- **THEN** all text is readable on dark backgrounds
- **THEN** chart colors are adjusted for the dark background using the theme's variables
- **THEN** card backgrounds use the theme's `--surface-card` value
- **THEN** there are no white or light flashes

#### Scenario: Light mode rendering

- **GIVEN** the user's system has light mode enabled and `report.mode` is "auto"
- **WHEN** the report is opened
- **THEN** the active theme's light palette is applied
- **THEN** dark text is readable on light backgrounds
- **THEN** chart colors use the theme's light variant variables

#### Scenario: Explicit dark mode override

- **GIVEN** `report.mode` is "dark" regardless of system preference
- **WHEN** the report is opened
- **THEN** the `<html>` element has `data-theme="dark"`
- **THEN** the active theme's dark palette is applied
- **THEN** `prefers-color-scheme` is ignored

#### Scenario: Chart colors from CSS variables

- **GIVEN** a report is generated with the Lattice palette
- **WHEN** charts initialize
- **THEN** the default line color reads `--accent` from computed CSS variables
- **THEN** trend up/down colors read `--up` and `--down`
- **THEN** crosshair line color reads `--accent`

## REMOVED Requirements

None.

## Key Entities

- **Semantic Class**: A CSS class prefixed `uent-*` that references CSS variables for theming.
- **Theme Variable**: One of 12 CSS custom properties (`--bg`, `--surface`, `--surface-card`, `--border`, `--border-soft`, `--text`, `--text-dim`, `--text-muted`, `--accent`, `--up`, `--down`, `--warn`) resolved from the active palette.

## Related

- `report-theming` — Provides the palette definitions and resolution logic consumed by this spec.
