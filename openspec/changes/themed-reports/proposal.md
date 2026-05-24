## Why

The Unentropy HTML report currently uses a generic Tailwind-default appearance with hard-coded colors. It lacks a distinctive visual identity and offers no way for users to customize the color palette. A CSS-variable-driven theme system will give the report a unique "editor-pane" aesthetic that developers recognize while letting teams brand reports to match their preferences — all without touching component code.

## What Changes

- Add a 12-variable CSS theme system (`--bg`, `--surface`, `--surface-card`, `--border`, `--border-soft`, `--text`, `--text-dim`, `--text-muted`, `--accent`, `--up`, `--down`, `--warn`) consumed by semantic component classes.
- Ship four built-in palettes: **Lattice** (default), **Flux**, **Halftone**, and **Specimen** — each with dark and light variants.
- Allow users to supply a custom palette override in `unentropy.json`; missing variables fall back to Lattice defaults.
- Add `report.theme` and `report.mode` config keys for palette selection and light/dark/auto mode.
- Restyle all report components (header, toolbar, cards, stats, sections, footer, empty state, preview banner, date picker) with semantic `uent-*` classes that consume CSS variables.
- Replace hard-coded Chart.js colors with runtime reads from CSS variables.
- Keep Tailwind CDN for layout primitives; migrate all color/border/text styling to the variable layer.
- Delete `PrintStyles.tsx`; absorb print rules into the new styles module.

## Capabilities

### New Capabilities

- `report-theming`: Theme system with built-in palettes, custom overrides, and light/dark mode switching.

### Modified Capabilities

- `reporting`: REQUIREMENTS updated for visual styling — colors, typography, and component appearance now derive from CSS variables instead of hard-coded Tailwind utilities. Dark mode behavior expanded from `prefers-color-scheme` only to include explicit `mode` override and per-theme dark/light variants.

## Impact

- **Code**: New `themes.ts` and `styles.ts` modules; all report components refactored to semantic classes; `generator.ts` updated to resolve and inject theme; `config/schema.ts` extended with `report.theme` / `report.mode`.
- **Tests**: New unit tests for theme resolution and stylesheet generation; existing template tests updated for new class names.
- **Fixtures**: Visual-review fixtures regenerated to reflect new styling; at least one fixture exercises a custom palette and another `mode: "light"`.
- **Dependencies**: No new dependencies.

### Documentation Impact

- [ ] Contracts affect: user-facing `unentropy.json` configuration docs (new `report.theme` and `report.mode` keys).

## Non-goals

- No runtime theme toggle button inside the report; switching is driven by `prefers-color-scheme` or config only.
- No replacement of Chart.js or the custom crosshair plugin.
- No changes to the data pipeline, storage layer, or metric collection.
- No changes to section/layout configuration schema.
- No external font CDN requests; fonts remain system-stacked.
