## Context

Unentropy currently generates flat HTML reports where all metrics appear in a single responsive grid. The report is built using Preact JSX templating (`src/reporter/templates/default/components/`) with Chart.js for visualization. Configuration is loaded from `unentropy.json` and validated via Zod schemas (`src/config/schema.ts`).

Users have requested the ability to:

1. Group related metrics into visually distinct sections (e.g., "Code Size", "Test Coverage")
2. Plot multiple metrics on a single chart for direct comparison
3. Optionally specify custom chart titles

This change is purely presentational — no metric collection or storage behavior changes.

## Goals / Non-Goals

**Goals:**

- Add optional `report` configuration to `unentropy.json`
- Support named sections with descriptions
- Support multi-metric charts (multiple series on one chart) with optional custom titles
- Maintain full backward compatibility when `report` is absent
- Update `unentropy preview` to respect the new layout

**Non-Goals:**

- New chart types (bar/line remain the only types)
- Custom color palettes per metric
- Drag-and-drop UI configuration
- Explicit chart ordering property — definition order is sufficient
- Collapsible sections — not in current scope
- Changes to metric collection, storage, or quality gates
- Changes to PR comment format

## Decisions

### 1. Config Schema: Optional Top-Level `report` Block

**Decision**: Add `report?: ReportConfig` as an optional top-level property in `unentropy.json`.

**Rationale**: Keeping it at the top level makes the configuration intuitive. Using an optional block means zero breaking changes — existing configs work unchanged.

**Alternative considered**: Nesting under `qualityGate` or `storage`. Rejected because report layout is independent of both.

### 2. Chart Titles: Optional `title` Property

**Decision**: Allow an optional `title` property on `ChartConfig`. When absent, the title is derived from the metric name(s).

**Rationale**: Multi-metric charts need meaningful titles (e.g., "Modern vs Legacy Classes" rather than "modern-classes, legacy-classes"). Single-metric charts can also benefit from custom titles that differ from the metric display name.

**Alternative considered**: Auto-generate titles only. Rejected because auto-generated titles for multi-metric charts are often awkward or too long.

### 3. Report Data Structure: Layout-Optional Embedded JSON

**Decision**: Extend the `ChartsData` interface with an optional `layout` field containing section/chart metadata. The server-side generator computes the layout structure; the client-side JS consumes it.

**Rationale**: Preact-render-to-string runs server-side in GitHub Actions. Computing layout structure at generation time avoids client-side complexity and keeps the HTML self-contained. The existing shared timeline and metadata arrays remain untouched.

**Alternative considered**: Client-side layout computation from config. Rejected because the config is not currently embedded in the report HTML, and we want reports to be self-contained snapshots.

### 4. Multi-Metric Charts: Reference Shared Line Chart Data by ID

**Decision**: Multi-metric charts reference `lineCharts` array entries by `metricId` rather than duplicating values in `ChartsData`.

**Rationale**: Preserves the existing size optimization principle of shared data. The client-side JS maps `metricIds` to the `lineCharts` array.

**Alternative considered**: Embedding duplicated values per multi-metric chart. Rejected because it bloats report size.

### 5. Ordering: Definition Order Only

**Decision**: Sections and charts appear in their natural definition order from the configuration file. No explicit `order` property.

**Rationale**: Users can already control order by rearranging their configuration. Adding an explicit ordering property adds complexity without significant benefit for the initial implementation.

**Alternative considered**: Explicit `order` property with stable sort. Rejected to keep the initial implementation simple; can be added later if users request it.

### 6. Unreferenced Metrics: Silent Omission

**Decision**: Metrics defined but not referenced in any report section are omitted from the report with no warning.

**Rationale**: Metrics may be used exclusively for quality gates or other purposes outside the report. A warning would be noisy for legitimate use cases.

**Alternative considered**: Warn on unreferenced metrics. Rejected because it would annoy users who intentionally use metrics only for quality gates.

### 7. Preview Command: Synthetic Data with Layout Support

**Decision**: `generateEmptyReport` (used by `preview`) will generate synthetic data that respects the `report` layout configuration if present.

**Rationale**: Users should see the sectioned layout in preview mode when they've configured it.

## Risks / Trade-offs

- **[Risk]** Multi-metric charts with incompatible scales become unreadable
  - **Mitigation**: Auto-detect unit mismatch and render dual Y-axes
- **[Risk]** Large `report` configs bloat report data size
  - **Mitigation**: `layout` only included when configured; flat reports are unchanged
- **[Risk]** Existing custom templates (if any) break
  - **Mitigation**: No changes to single-metric card structure; new components are additive

## Contracts Referenced

- `contracts/config-schema.md` — `report` block JSON schema
- `contracts/report-data-schema.md` — extended `ChartsData` with `layout`
- `contracts/report-layout.md` — section and multi-metric chart visual structure

## File Changes

### Configuration

- `src/config/schema.ts`
  - Add `ReportConfigSchema`, `ReportSectionSchema`, `ChartConfigSchema`
  - Extend `UnentropyConfigSchema` with optional `report` property
  - Add `ReportConfig`, `ReportSection`, `ChartConfig` types

- `src/config/loader.ts`
  - Extend `ResolvedUnentropyConfig` with optional `report` property
  - Pass through `report` from validated config to resolved config

### Report Generator

- `src/reporter/types.ts`
  - Add `ReportLayout`, `SectionData`, `ChartData` interfaces
  - Extend `ChartsData` with optional `layout` field

- `src/reporter/generator.ts`
  - Add `buildReportLayout()` function to construct `layout` from `config.report`
  - Include `layout` in `ChartsData` when `config.report` is present
  - When `config.report` is absent, behavior is identical to current implementation

### Report Templates

- `src/reporter/templates/default/components/index.ts`
  - Export `Section` and `MultiMetricChartCard` components

- `src/reporter/templates/default/components/Section.tsx` (new)
  - Render section header (name + optional description)
  - Render chart grid containing child charts

- `src/reporter/templates/default/components/MultiMetricChartCard.tsx` (new)
  - Render chart card with multiple data series
  - Render mini stat cards per metric
  - Include legend and export button

- `src/reporter/templates/default/components/HtmlDocument.tsx` (modified)
  - When `chartsData.layout` is present, render sections
  - When absent, render flat grid (existing behavior)

### Preview Command

- `src/reporter/empty-report.ts`
  - Update `generateEmptyReport` to accept optional `report` config
  - Generate synthetic data that respects section layout when present

- `src/cli/cmd/preview.ts`
  - Pass `config.report` to `generateEmptyReport`

### Tests

- `tests/config/schema.test.ts` (modified)
  - Add test cases for `report` block validation

- `tests/reporter/generator.test.ts` (modified)
  - Add test cases for layout generation

- `tests/reporter/templates/Section.test.ts` (new)
  - Test section rendering

- `tests/reporter/templates/MultiMetricChartCard.test.ts` (new)
  - Test multi-metric card rendering
