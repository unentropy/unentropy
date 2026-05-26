## Why

Currently, crosshairs and drag-to-zoom synchronize across all charts in a report, regardless of section boundaries. When a report has multiple sections (e.g., "Code Health" and "Refactor Sprint"), hovering or zooming in one section scatters all others — making sections feel coupled rather than independent.

## What Changes

- Crosshairs are scoped to the section the user is hovering over (not global)
- Drag-to-zoom affects only charts within the same section
- Global time range presets (7d, 30d, 90d, Custom) continue to apply to all sections
- Changing a global preset clears any per-section zoom states
- No changes to the config schema or server-side generation — purely a client-side behavioral change
- Flat (non-section) layout is unaffected (remains global behavior)

## Capabilities

### New Capabilities

- `section-scoped-interactions`: Client-side chart interaction model where crosshairs and zoom are scoped to individual report sections, while global time range filters remain available

### Modified Capabilities

- None

## Impact

- `src/reporter/templates/default/scripts/crosshair-plugin.js`: Sync groups must be assigned per-section instead of globally. Zoom sync dispatches must be section-scoped.
- `src/reporter/templates/default/scripts/charts.js`: `initializeCharts` must pass section index into each chart's crosshair plugin options as the sync group.
- `src/reporter/templates/default/scripts/date-filters.js`: Must clear per-section zoom state when a global preset is applied. Must update logic to not treat zoom-sync events as global.
- No config schema changes, no server-side changes, no database changes.

### Documentation Impact

- No user-facing doc changes

## Non-goals

- Per-section default time ranges (sections will auto-scale to their own data, which already happens)
- UI indicators showing which section has an active zoom (crosshair presence is sufficient visual feedback)
- Config schema changes or new configuration options
- Server-side filtering or data changes
- Changes to the flat (non-section) layout
