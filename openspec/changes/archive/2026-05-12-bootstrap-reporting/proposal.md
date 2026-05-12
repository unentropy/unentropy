## Why

HTML report generation is implemented (basic rendering in 001-metrics-tracking-poc, advanced features in 006-metrics-report) but lacks a formal specification. Behavior is scattered across two chronological spec-kit files with a legacy format. This change consolidates all report-related behavior — metric visualization, interactive tooltips, synchronized crosshair, drag-to-zoom, date filtering, chart export, and preview data toggle — into a single OpenSpec domain.

## What Changes

- Create `openspec/specs/reporting/` as the canonical behavior specification for HTML report generation
- Consolidate report behavior from spec-kit 001 (basic report rendering) and 006 (advanced features: synchronized tooltips, zoom, date filtering, export, preview toggle)
- Create `contracts/report-data-schema.md` defining the embedded JSON data structure
- Create `contracts/report-layout.md` defining visual structure and component behavior
- Create `contracts/visual-acceptance-criteria.md` defining test fixtures and review checklist
- No code changes — this is a specification-only bootstrap

## Capabilities

### New Capabilities

- `reporting`: Generate interactive HTML metric reports with charts, synchronized crosshair tooltips, drag-to-zoom, preset and custom date range filtering, preview data toggle, and chart PNG export

### Modified Capabilities

- None (this is a bootstrap of existing behavior)

## Impact

- Affected: `openspec/specs/reporting/` and related contracts
- No source code, APIs, or user-facing behavior changes
- Existing generated reports remain valid

### Documentation Impact

- Contracts affect: `reference/reports.md` (report structure and data schema), `guides/visual-review.md`

### Non-goals

- Modify any implementation code
- Add new chart types or visualizations
- Change the embedded report data schema
- Add new interactive features beyond what 006 specifies
