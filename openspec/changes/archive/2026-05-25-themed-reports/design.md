## Context

The Unentropy HTML report currently uses Tailwind utility classes for both layout and visual styling. Colors are hard-coded (e.g., `text-gray-900`, `bg-blue-600`, `dark:bg-gray-700`), which makes the report look generic and prevents customization. The redesign introduces a CSS-variable layer between the palette and the components, keeping Tailwind for layout while expressing all color, border, and typography styling through semantic `uent-*` classes.

## Goals / Non-Goals

**Goals:**

- Implement a 12-variable CSS theme system with four built-in palettes.
- Support custom palette overrides with Lattice fallback.
- Add `report.theme` and `report.mode` config keys.
- Restyle all report components to the "editor-pane" aesthetic.
- Read Chart.js colors from CSS variables at init time.
- Keep Tailwind CDN for layout primitives only.

**Non-Goals:**

- No runtime theme toggle in the report.
- No replacement of Chart.js or crosshair plugin.
- No changes to data pipeline, storage, or metric collection.
- No changes to section/layout configuration schema.
- No external font CDN requests.

## Decisions

### Decision 1: Hybrid styling (Tailwind + CSS variables) rather than pure CSS

**Rationale**: Removing Tailwind entirely would require rewriting ~400 lines of layout classes across 14 components. Keeping Tailwind for `flex`, `grid`, `gap-*`, `max-w-7xl`, and responsive prefixes lets us focus the redesign on color and typography. The semantic `uent-*` layer is only ~30 classes (~3KB minified), making the total stylesheet small.

**Alternative considered**: Inline all CSS — rejected because Tailwind's responsive breakpoint system is battle-tested and would require significant custom CSS to replicate.

### Decision 2: Static theme resolution at generation time

**Rationale**: The report is a static HTML file. Resolving the palette at build time and inlining the CSS keeps the report self-contained with no runtime JS dependencies for theming. This matches Unentropy's serverless philosophy.

**Alternative considered**: Ship a JS theme loader that runs in the browser — rejected because it adds complexity and a flash-of-unstyled-content risk for a feature that changes rarely.

### Decision 3: `data-theme` attribute on `<html>` overrides `prefers-color-scheme`

**Rationale**: When `mode` is "light" or "dark", the generator sets `data-theme` and emits only that variant. The CSS selector `[data-theme="light"]` has higher specificity than `@media (prefers-color-scheme: light)`, so it reliably overrides. This gives users precise control when sharing screenshots or reports.

**Alternative considered**: Use a `<meta name="color-scheme">` tag — rejected because it doesn't provide per-variable control and doesn't support custom palettes.

### Decision 4: Chart.js reads CSS variables at init time, not reactively

**Rationale**: `themeVar()` reads `getComputedStyle(document.documentElement)` once when charts initialize. If a user manually changes `data-theme` in DevTools, charts won't re-color until reload. This is acceptable because no runtime toggle is shipped.

**Alternative considered**: Wrap Chart.js colors in a MutationObserver on `data-theme` — rejected as over-engineering for a static report.

### Decision 5: System font stacks instead of CDN-loaded fonts

**Rationale**: JetBrains Mono and Inter are common on developer machines. Falling back to `ui-monospace` and `system-ui` keeps the report self-contained, zero-latency, and offline-capable. The mockups still read well with system fonts.

**Alternative considered**: Load fonts from Google Fonts CDN — rejected because it introduces an external dependency and network latency for a file that should be fully self-contained.

## Risks / Trade-offs

- **[Risk] Tailwind CDN warning in production** → Already present today; the smaller component surface makes it easier to drop Tailwind later if desired.
- **[Risk] Custom palette with poor contrast** → We validate hex format but not contrast ratios. Users can supply unreadable colors. Document the 12 variables and their semantic meaning.
- **[Risk] `mode: "auto"` ships ~600 extra bytes** → Acceptable; both variants are needed for proper system preference support.
- **[Risk] Existing snapshot/template tests break** → All component class names change. We update assertions as part of the implementation. Template tests are low-effort to fix.

## Migration Plan

No migration needed. This is a backward-compatible enhancement:

- Existing configs without `report.theme` or `report.mode` continue to work; they default to Lattice dark with auto mode.
- No database schema changes.
- No CLI breaking changes.
- Visual-review fixtures will be regenerated as part of the implementation.

## Open Questions

- Should we add a visual-review fixture for each of the four built-in palettes? Yes — this ensures visual regression coverage.
- Should the `themeVar()` helper also read `--text` and `--surface` for tooltip styling? Yes — tooltip background should use `--surface` and text `--text`.

## Contracts Referenced

- `contracts/config-schema.md` — `report.theme` and `report.mode` validation schema.
- `contracts/html-report-template.md` — Semantic component class catalog and CSS variable system.

## File Changes

**New files:**

- `src/reporter/templates/default/themes.ts` — Palette definitions for `lattice`, `flux`, `halftone`, `specimen`; theme resolution helpers.
- `src/reporter/templates/default/styles.ts` — Exports the inlined CSS string (variable block + component layer + print rules).
- `tests/unit/reporter/themes.test.ts` — Theme resolution unit tests.
- `tests/unit/reporter/styles.test.ts` — Sanity tests for the styles module.

**Modified files:**

- `src/config/schema.ts` — Extend `ReportConfigSchema` with `theme` and `mode`.
- `src/reporter/generator.ts` — Resolve theme from config, pass to `HtmlDocument`.
- `src/reporter/templates/default/components/HtmlDocument.tsx` — Inject variable block, set `data-theme`, remove `PrintStyles` import.
- `src/reporter/templates/default/components/Header.tsx` — Restyle as window title bar.
- `src/reporter/templates/default/components/DateRangeFilter.tsx` — Restyle as sub-toolbar chips + build counter.
- `src/reporter/templates/default/components/CustomDatePickerPopover.tsx` — Restyle popover.
- `src/reporter/templates/default/components/Section.tsx` — Restyle as vim-fold header.
- `src/reporter/templates/default/components/StatsGrid.tsx` — Restyle stat blocks (dashed dividers, mono numbers).
- `src/reporter/templates/default/components/MetricCard.tsx` — Restyle card shell.
- `src/reporter/templates/default/components/MultiMetricChartCard.tsx` — Restyle card shell.
- `src/reporter/templates/default/components/PreviewBar.tsx` — Restyle as warn banner.
- `src/reporter/templates/default/components/EmptyState.tsx` — Swap SVG for ASCII flourish, restyle.
- `src/reporter/templates/default/components/Footer.tsx` — Restyle as status bar.
- `src/reporter/templates/default/components/formatUtils.ts` — `getTrendColor()` returns semantic class names.
- `src/reporter/templates/default/scripts/charts.js` — Read theme colors from CSS variables.
- `src/reporter/templates/default/scripts/date-filters.js` — Toggle `uent-chip-active` class; use CSS variables for overlay.
- `src/reporter/templates/default/components/index.ts` — Export `Styles` and remove `PrintStyles` export.
- `tests/unit/config/schema.test.ts` — Add tests for new config fields.
- `tests/unit/reporter/templates.test.ts` — Update assertions to match new class names.

**Deleted files:**

- `src/reporter/templates/default/components/PrintStyles.tsx` — Rules absorbed into `styles.ts`.
