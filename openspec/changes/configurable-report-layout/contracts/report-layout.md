# Report Layout

**Domain**: reporting

**Extends**: `openspec/specs/reporting/contracts/report-layout.md`

## Overview

This contract extends the HTML report layout to support configurable sections and multi-metric charts while preserving the existing component catalog and responsive behavior.

---

## Extended Page Layout

### Section-Based Structure

When a report configuration with sections is present:

```
┌─────────────────────────────────────────────────────────────────┐
│                           HEADER                                 │
│  Repository name, date filters (7d/30d/90d/All/Custom)          │
├─────────────────────────────────────────────────────────────────┤
│                       PREVIEW BAR (conditional)                  │
│  Toggle to show sample data when < 10 builds                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │  SECTION: Code Size                                     │     │
│  │  Source code metrics by language                        │     │
│  ├─────────────────────────────────────────────────────────┤     │
│  │  ┌─────────────────────────┐  ┌─────────────────────────┐  │
│  │  │    METRIC CARD          │  │    METRIC CARD          │  │
│  │  │  Chart + Stats + Actions│  │  Chart + Stats + Actions│  │
│  │  └─────────────────────────┘  └─────────────────────────┘  │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │  SECTION: Test Coverage                                   │     │
│  ├─────────────────────────────────────────────────────────┤     │
│  │  ┌─────────────────────────┐  ┌─────────────────────────┐  │
│  │  │    METRIC CARD          │  │    METRIC CARD          │  │
│  │  └─────────────────────────┘  └─────────────────────────┘  │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                           FOOTER                                 │
│  Build count, date range, version info, documentation link      │
└─────────────────────────────────────────────────────────────────┘
```

### Flat Structure (Default)

When no report configuration is present, the existing flat layout is preserved:

```
┌─────────────────────────────────────────────────────────────────┐
│                           HEADER                                 │
├─────────────────────────────────────────────────────────────────┤
│                       PREVIEW BAR (conditional)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────┐  ┌─────────────────────────┐       │
│  │      METRIC CARD        │  │      METRIC CARD        │       │
│  └─────────────────────────┘  └─────────────────────────┘       │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                           FOOTER                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Catalog

### Section Header

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  Code Size                                                       │
│  Source code metrics by language                                 │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
```

**Elements**:

- Section name (H2, prominent, left-aligned)
- Optional description (subtitle, muted color, left-aligned)
- Visual separator line below (subtle, 1px)

**Spacing**:

- 48px margin-top before first section
- 32px margin-top between subsequent sections
- 24px padding-bottom after description

### Multi-Metric Chart Card

```
┌─────────────────────────────────────────────────────────────────┐
│  Modern vs Legacy Classes                           [📥]         │
├─────────────────────────────────────────────────────────────────┤
│                         CHART AREA                               │
│      ╭──────────────────────────────────────╮                   │
│      │    ── modern-classes                 │                   │
│      │    ·· legacy-classes                 │                   │
│      │                                    │                   │
│      │  ──       ··      ──       ··       │                   │
│      │                                    │                   │
│      ╰──────────────────────────────────────╯                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ modern-...  │  │ legacy-...  │  │             │            │
│  │ Latest: 42  │  │ Latest: 18  │  │             │            │
│  │ Min: 35     │  │ Min: 20     │  │             │            │
│  │ Max: 48     │  │ Max: 25     │  │             │            │
│  │ Trend: ↑    │  │ Trend: ↓    │  │             │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

**Elements**:

- Title row: Chart title (from `title` property or derived from metric names), export button [📥]
- Chart area: Multi-line chart with legend and distinct colors per series
- Stats row: Summary statistics for each metric in the chart, displayed as mini-cards

**Legend Position**: Top-right within chart area, above the plot.

**Stats Layout**:

- One mini-stat card per metric
- Each card shows metric name, Latest, Min, Max, Trend
- Cards flow horizontally, wrapping on narrow screens

### Chart Grid Within Section

**Responsive Breakpoints** (per section):

| Breakpoint                  | Layout                          |
| --------------------------- | ------------------------------- |
| **Mobile** (< 640px)        | Single column, full-width cards |
| **Tablet** (640px - 1024px) | 1-2 columns                     |
| **Desktop** (> 1024px)      | 2-column grid                   |

---

## Multi-Metric Chart Interaction

### Tooltip Content

```
┌─────────────────────────┐
│ Dec 7, 2025             │
│ Build #47, abc1234      │
│ ── modern-classes: 42   │
│ ·· legacy-classes: 18   │
└─────────────────────────┘
```

**Behavior**:

- Tooltip shows all metric values for the hovered build
- Each value prefixed with series color indicator
- Missing metrics show "No data"

### Legend Interaction

- Click a legend item to toggle visibility of that series
- Hidden series is dimmed in legend
- Chart Y-axis rescales to fit visible series

### Synchronized Crosshair

- Vertical alignment line appears on ALL charts (including multi-metric)
- Multi-metric chart tooltip includes all visible series values
- Latency remains under 50ms

---

## Visual States & Conditions

| Element             | Condition                     | Visible                      |
| ------------------- | ----------------------------- | ---------------------------- |
| Section header      | `report.sections` configured  | ✓                            |
| Section description | `section.description` present | ✓                            |
| Multi-metric chart  | `metrics` is array in config  | ✓                            |
| Multi-metric stats  | Always                        | ✓ (one mini-card per metric) |
| Flat layout         | `report` absent               | ✓                            |

**Empty States**:

- Section with no valid charts: Displays "No metrics configured for this section"
- Multi-metric chart with all missing metrics: Displays "No data available"

---

## Accessibility

### Section Headers

- Section names use `<h2>` tags for document outline
- Description text uses `<p>` with `aria-describedby` linking to section content

### Multi-Metric Charts

- Chart has `aria-label` describing the combined metrics (e.g., "Chart showing modern-classes and legacy-classes over time")
- Legend buttons are keyboard-accessible and announce toggle state
- Each stat mini-card is a `<dl>` with `<dt>`/`<dd>` for screen reader structure

### Keyboard Navigation

| Key         | Action                                             |
| ----------- | -------------------------------------------------- |
| Tab         | Move between sections, filter buttons, chart cards |
| Enter/Space | Activate legend toggle, export button              |
| Arrow keys  | Navigate within legend items                       |
