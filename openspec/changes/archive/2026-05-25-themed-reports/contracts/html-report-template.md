**Domain**: reporting

Extends: openspec/specs/reporting/contracts/report-layout.md

## Overview

This contract defines the updated HTML report template structure to support the CSS-variable-driven theme system. All visual styling is now expressed through semantic `uent-*` classes that consume CSS variables, while Tailwind utilities remain responsible for layout primitives only.

---

## 1. CSS Variable System

The report inline stylesheet contains a `:root` block with 12 theme variables:

```css
:root {
  --bg: #1c2230; /* page background */
  --surface: #161b27; /* title bar, toolbar, status bar */
  --surface-card: #11151f; /* card background */
  --border: #2a3148; /* card + divider borders */
  --border-soft: #262d42; /* dashed inner dividers */
  --text: #cad3e0; /* primary text */
  --text-dim: #9aa6bb; /* secondary text */
  --text-muted: #5a6680; /* labels, comments */
  --accent: #6fb3d2; /* active elements, chart lines */
  --up: #8ec07c; /* positive trend */
  --down: #e08490; /* negative trend */
  --warn: #d4a663; /* warning indicators */
}
```

### Mode Blocks

- **`mode: "auto"`**: Emits `prefers-color-scheme: light` media query, plus `[data-theme="light"]` and `[data-theme="dark"]` override blocks.
- **`mode: "light"`**: Emits only light variables on `:root`; sets `<html data-theme="light">`.
- **`mode: "dark"`**: Emits only dark variables on `:root`; sets `<html data-theme="dark">`.

---

## 2. Semantic Component Classes

All theme-sensitive styling uses `uent-*` classes:

| Class                   | Purpose                                        |
| ----------------------- | ---------------------------------------------- |
| `.uent-titlebar`        | Window title bar background and border         |
| `.uent-toolbar`         | Sub-toolbar background and border              |
| `.uent-toolbar-label`   | Uppercase muted labels (`range`, `From`, `To`) |
| `.uent-chip`            | Date filter chip base state                    |
| `.uent-chip-active`     | Active date filter chip                        |
| `.uent-builds`          | Build counter text                             |
| `.uent-section-head`    | Section heading container                      |
| `.uent-section-marker`  | `▾` marker before section name                 |
| `.uent-section-comment` | `// description` comment line                  |
| `.uent-card`            | Metric card shell                              |
| `.uent-metric-name`     | Metric title text                              |
| `.uent-metric-desc`     | Metric description text                        |
| `.uent-stats`           | Stats row with dashed borders                  |
| `.uent-stat-l`          | Stat label (uppercase, muted)                  |
| `.uent-stat-v`          | Stat value (mono)                              |
| `.uent-trend-up`        | Positive trend color                           |
| `.uent-trend-down`      | Negative trend color                           |
| `.uent-trend-stable`    | Stable trend color                             |
| `.uent-statusbar`       | Footer status bar                              |
| `.uent-preview-banner`  | Preview data banner                            |
| `.uent-popover`         | Custom date picker popover                     |
| `.uent-input`           | Date input fields                              |
| `.uent-empty-flourish`  | ASCII empty-state decoration                   |
| `.uent-mono`            | Monospace font stack                           |
| `.uent-toggle-track`    | Toggle switch track                            |
| `.uent-toggle-on`       | Toggle switch active state                     |

---

## 3. Component Restyling Summary

### Header → Window Title Bar

- Three decorative dots (colored `--down`, `--warn`, `--up`)
- Repo path as filesystem breadcrumb: `~/<owner>/<repo> · report.html`
- Slash separator colored `--accent`

### DateRangeFilter → Toolbar Chips

- Label `range` in `.uent-toolbar-label`
- Chips: `all`, `7d`, `30d`, `90d`, `custom…`
- Active chip: `.uent-chip-active` (background `--border`, text `--accent`)
- Inactive chip: transparent background, `--text-dim` text

### Section → Vim-fold Header

- Name preceded by `.uent-section-marker` (`▾`)
- Description rendered as `// {description}` in `.uent-section-comment`

### StatsGrid → Mono Numerals

- Dashed top/bottom borders via `.uent-stats`
- Labels in `.uent-stat-l` (uppercase, muted)
- Values in `.uent-stat-v` with `.uent-mono`
- Trend uses `.uent-trend-up` / `.uent-trend-down` / `.uent-trend-stable`

### MetricCard / MultiMetricChartCard

- Shell: `.uent-card.metric-card`
- Name: `.uent-metric-name`
- Description: `.uent-metric-desc`

### PreviewBar

- Background: `.uent-preview-banner`
- Warning icon: `.uent-preview-icon` (colored `--warn`)
- Toggle track: `.uent-toggle-track` / `.uent-toggle-on`

### Footer → Status Bar

- `.uent-statusbar` with `.uent-version` (colored `--accent`) and `.uent-tracking` (colored `--up`)

### EmptyState

- ASCII flourish in `.uent-empty-flourish`
- Replaces previous SVG icon

---

## 4. Chart.js Theming

Chart colors are read from CSS variables at initialization:

```javascript
function themeVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

var ACCENT = themeVar("--accent");
var UP = themeVar("--up");
var DOWN = themeVar("--down");
```

Used for:

- `LINE_STYLE.borderColor` → `ACCENT`
- `LINE_STYLE.backgroundColor` → `ACCENT` with opacity
- Crosshair line color → `ACCENT`
- Tooltip styling → derived from surface/text variables
- Multi-metric palette: stays on Chart.js defaults for 2nd+ datasets

---

## 5. Print Rules

Print rules are inlined in the same stylesheet:

```css
@media print {
  body {
    background: white !important;
    color: black !important;
  }
  .no-print {
    display: none !important;
  }
  .metric-card {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  canvas {
    max-height: 300px;
  }
}
```

---

## 6. Typography

```css
body {
  font-family:
    "Inter",
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
}

.uent-mono {
  font-family: "JetBrains Mono", "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
}
```

No external font CDN requests. System stacks are used as fallbacks.

---

## 7. Deleted Artifacts

- `PrintStyles.tsx` component — absorbed into `styles.ts`
