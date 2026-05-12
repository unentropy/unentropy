## Context

This change consolidates report-related behavior from spec-kit into OpenSpec format. The behavior spans two original specs:

- **001-metrics-tracking-poc**: Basic HTML report generation with metric cards, line/bar charts, summary statistics, interactive tooltips, responsive design, dark mode
- **006-metrics-report**: Advanced features — preview data toggle, synchronized crosshair, drag-to-zoom, preset and custom date filtering, chart PNG export

The implementation is already complete. This is a retroactive specification.

## Goals / Non-Goals

**Goals:**

- Establish `openspec/specs/reporting/` as the canonical behavior specification for HTML report generation
- Create discrete contracts for the report data schema, report layout, and visual acceptance criteria
- Enable future report-related changes to use OpenSpec delta specs

**Non-Goals:**

- Modify any implementation code
- Add new chart types, visualizations, or interactive features
- Change the embedded report data schema
- Change the generated HTML structure

## Decisions

### Decision: Single Domain Spec

**Chosen**: Merge 001 (basic report) and 006 (advanced features) into a single `reporting/` domain.

**Rationale**: Both describe the same user capability — viewing metric trends in an HTML report. The advanced features in 006 are enhancements of the same report, not a separate capability. Splitting them would create artificial boundaries and make it harder to understand the full report behavior.

**Alternative**: Keep 001 and 006 as separate specs — rejected because it preserves the legacy chronological structure rather than organizing by behavior.

### Decision: Three Contracts

**Chosen**: Create three contracts — data schema, layout, and visual acceptance criteria.

**Rationale**: Each serves a distinct audience and purpose:

- `report-data-schema.md` — For implementation (TypeScript interfaces, CDN deps, feature flags)
- `report-layout.md` — For UX review (visual structure, component behavior, interaction flows)
- `visual-acceptance-criteria.md` — For QA (test fixtures, review checklist, browser compatibility)

**Alternative**: Combine layout and data schema — rejected because they serve different stakeholders (UX vs engineering).

## Risks / Trade-offs

- [Risk] Full layout contract is verbose (670 lines in source) → Mitigation: Distilled into essential behavioral specs
- [Risk] Visual acceptance is inherently manual → Mitigation: Standardized fixtures and detailed checklist

## Contracts Referenced

- `contracts/report-data-schema.md` — embedded JSON data structure, CDN dependencies, feature flags
- `contracts/report-layout.md` — visual structure, component behavior, interaction flows, accessibility
- `contracts/visual-acceptance-criteria.md` — test fixtures, visual review checklist, acceptance criteria

## File Changes

No source code changes.

## Open Questions

None.
