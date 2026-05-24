## Why

Current Unentropy reports render all metrics in a flat, auto-generated layout. As projects grow, this becomes unwieldy — unrelated metrics clutter the view, and users cannot group related metrics (e.g., all size metrics, all test metrics) or compare multiple related metrics side-by-side on the same chart. This change introduces optional, advanced report configuration so teams can organize their dashboards meaningfully.

## What Changes

- Add optional `report` configuration block to `unentropy.json`.
- Introduce **sections** — named, visually separated groups of charts with optional descriptions.
- Introduce **multi-metric charts** — ability to plot multiple metrics on a single chart with shared axes, distinct colors, and an optional custom title.
- Charts and sections follow the natural definition order in the configuration file.
- Update HTML report generator to render sections and combined metrics.
- Update `unentropy preview` to respect the new layout configuration.
- Maintain full backward compatibility: absence of `report` config yields current flat behavior.

## Capabilities

### New Capabilities

- `report-sections`: Named, visually separated groups of charts in the HTML report.
- `multi-metric-charts`: Plotting multiple metrics on a single chart with a shared axis, distinct colors, and optional custom title.

### Modified Capabilities

- `reporting`: REQUIREMENTS change to support optional `report` configuration block in `unentropy.json` and new rendering behavior for sections and combined charts.

## Impact

- `unentropy.json` schema gains optional `report` property.
- HTML report generator (`src/reporters/html-reporter.ts`) refactored to support sections and multi-metric charts.
- `unentropy preview` command updated to read and validate `report` config.
- TypeScript interfaces for configuration expanded.
- Documentation site updated with new configuration examples.

### Documentation Impact

- [ ] No user-facing doc changes
- [x] Contracts affect: `docs/configuration.md`, `docs/reports.md`, `unentropy.json` JSON Schema

## Non-goals

- Custom chart types (e.g., pie charts, bar charts) — line charts remain the default.
- Custom color palettes per metric — automatic color cycling is sufficient for now.
- Drag-and-drop UI configuration — configuration is JSON-only.
- Explicit chart ordering property — definition order is sufficient.
- Collapsible sections — not in current scope.
- Changes to metric collection or storage — this is purely a presentation-layer change.
