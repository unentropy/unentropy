**Domain**: reporting

## 1. Overview

### Purpose
The Metrics Report is a self-contained HTML file that visualizes code metrics trends over time. It helps developers and engineering managers understand project health at a glance.

### Design Principles
- **Glanceable**: Key insights visible within 5 seconds
- **Interconnected**: All charts work together (synced tooltips, zoom, filters)
- **Responsive**: Works on mobile, tablet, and desktop
- **Accessible**: Keyboard navigable, screen reader friendly
- **Self-contained**: Works offline after initial load

---

## 2. Page Layout

### Overall Structure

The report supports two layout modes: **section-based** (when `report.sections` is configured) and **flat** (default/backward compatible).

#### Section-Based Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                           HEADER                                 │
│  Repository name, date filters (7d/30d/90d/All/Custom)          │
├─────────────────────────────────────────────────────────────────┤
│                       PREVIEW BAR (conditional)                  │
│  Toggle to show sample data when < 10 builds                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ▾ Code Size                                                     │
│  // Source code metrics by language                              │
│  ┌─────────────────────────┐  ┌─────────────────────────┐       │
│  │      METRIC CARD        │  │      METRIC CARD        │       │
│  │  Chart + Stats + Actions│  │  Chart + Stats + Actions│       │
│  └─────────────────────────┘  └─────────────────────────┘       │
│                                                                  │
│  ▾ Test Coverage                                                 │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │  MULTI-METRIC CHART CARD                                 │     │
│  │  Shared chart + per-metric stat mini-cards               │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                           FOOTER                                 │
│  Build count, date range, version info, documentation link      │
└─────────────────────────────────────────────────────────────────┘
```

#### Flat Layout (Default)

When no `report` configuration is present, all metrics render in a flat grid:

```
┌─────────────────────────────────────────────────────────────────┐
│                           HEADER                                 │
│  Repository name, date filters (7d/30d/90d/All/Custom)          │
├─────────────────────────────────────────────────────────────────┤
│                       PREVIEW BAR (conditional)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────┐  ┌─────────────────────────┐       │
│  │      METRIC CARD        │  │      METRIC CARD        │       │
│  │  Chart + Stats + Actions│  │  Chart + Stats + Actions│       │
│  └─────────────────────────┘  └─────────────────────────┘       │
│                                                                  │
│                          ... more cards ...                      │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                           FOOTER                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Responsive Breakpoints

| Breakpoint | Layout Changes |
|------------|----------------|
| **Mobile** (< 640px) | Single column cards, stacked header elements, full-width charts |
| **Tablet** (640px - 1024px) | 1-2 column cards depending on width, side-by-side header |
| **Desktop** (> 1024px) | Two column card grid, horizontal header, max-width container |

---

## 3. Component Catalog

### 3.1 Header

```
┌─────────────────────────────────────────────────────────────────────┐
│  [logo]  ~/owner/repo · report.html                  [🌙 theme]    │
│                                                                     │
│  RANGE                                                              │
│  [all]  [7d]  [30d]  [90d]  [custom…]              42 builds       │
│                                                                     │
│                          ↓ (when custom clicked)                    │
│                ┌──────────────────────────┐                          │
│                │ From: [📅 date input]    │                          │
│                │ To:   [📅 date input]    │                          │
│                │        [clear]           │                          │
│                └──────────────────────────┘                          │
└─────────────────────────────────────────────────────────────────────┘
```

**Elements**:
- Logo: Unentropy brand mark, links to unentropy.dev
- Repo path breadcrumb: `~/owner/repo · report.html`
- Theme toggle button: cycles system → light → dark, persisted to localStorage
- Date range label: "RANGE" in muted uppercase
- Filter chips: "all", "7d", "30d", "90d", "custom…" — active chip highlighted
- Build count: shown in header toolbar

**Custom Date Picker Popover**:
- **Trigger**: Click on "custom…" button
- **Position**: Below chips, right-aligned on desktop; intelligently positioned on mobile
- **Contains**: "From"/"To" date pickers (native HTML5 `<input type="date">`), "clear" button
- **Behavior**: Opens immediately on click; applies filter on valid selection; closes on outside click, Clear, or preset filter click
- **Validation**: "From" cannot be after "To"; shows inline error; dates outside data range grayed out

### 3.2 Preview Bar

```
┌─────────────────────────────────────────────────────────────────┐
│  ℹ️  Limited data (5 builds). Toggle to see how charts will     │
│      look with more data.                        [ Show preview ]│
└─────────────────────────────────────────────────────────────────┘
```

**Visibility**: Only appears when total build count < 10.

**Behavior**:
- Toggle ON: All charts display synthetic data (20 points over 60 days)
- Toggle OFF: Charts show actual recorded data
- Stats update to reflect currently displayed data

### 3.3 Section Header

```
▾ Code Size
// Source code metrics by language
```

**Elements**:
- Section marker: `▾` in accent color
- Section name: prominent text
- Optional description: prefixed with `//`, muted color, monospace font

### 3.4 Multi-Metric Chart Card

```
┌──────────────────────────────────────────────────────────────────────┐
│  Modern vs Legacy Classes                              [📥 export]   │
├──────────────────────────────────────────────────────────────────────┤
│                         CHART AREA                                    │
│      ╭─────────────────────────────────────────────╮                 │
│      │     ── modern-classes                       │                 │
│      │     ·· legacy-classes                       │                 │
│      │                                             │                 │
│      │   ──       ··      ──       ··              │                 │
│      │                                             │                 │
│      ╰─────────────────────────────────────────────╯                 │
├──────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ modern-classes│  │ legacy-classes│  │              │               │
│  │ Latest: 42    │  │ Latest: 18    │  │              │               │
│  │ Min: 35       │  │ Min: 20       │  │              │               │
│  │ Max: 48       │  │ Max: 25       │  │              │               │
│  │ Trend: ↑ +20% │  │ Trend: ↓ -10% │  │              │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
└──────────────────────────────────────────────────────────────────────┘
```

**Elements**:
- Title row: Chart title (from `title` property or derived from metric names), export button
- Chart area: Multi-line chart with legend, distinct colors per series
- Stats row: One mini-stat card per metric (metric name, Latest, Min, Max, Trend)

**Interaction**:
- Tooltip shows all metric values for the hovered build with color indicators
- Legend click toggles series visibility, chart rescales Y-axis
- Synchronized crosshair across all charts including multi-metric

### 3.5 Metric Card (Single-Metric)

```
┌─────────────────────────────────────────────────────────────────┐
│  Metric Name                                        [📥]         │
│  Optional description text                                       │
├─────────────────────────────────────────────────────────────────┤
│                         CHART AREA                               │
│      ╭──────────────────────────────────────╮                   │
│      │                    ·  ·              │                   │
│      │              ·  ·      ·  ·          │                   │
│      │         ·  ·              ·          │                   │
│      │    ·  ·                      ·  ·    │                   │
│      ╰──────────────────────────────────────╯                   │
├─────────────────────────────────────────────────────────────────┤
│  Latest: 82.5%    Min: 71.2%    Max: 89.1%    Trend: ↑ +3.2%   │
└─────────────────────────────────────────────────────────────────┘
```

**Elements**:
- Title row: Metric name, export button [📥]
- Description: Optional explanatory text
- Chart area: Interactive chart (line or bar)
- Stats row: Latest, Min, Max, Trend (direction + percentage)

### 3.6 Chart Area

**Chart Types**:
- **Line chart**: Numeric metrics with smooth curve, filled area, point dots, gaps for missing data
- **Bar chart**: Label metrics with occurrence counts

**Vertical Alignment Indicator**:
- Appears on hover over any chart
- 1px solid vertical line, 30% opacity
- Synchronized across all charts
- Dismissed when cursor leaves chart areas

**Tooltip Content**:
```
Single-metric:
┌─────────────────────────┐      ┌─────────────────────────┐
│ Dec 7, 2025             │      │ Dec 5, 2025             │
│ Coverage: 82.5%         │      │ No data for this build  │
│ Build #47, abc1234      │      └─────────────────────────┘
└─────────────────────────┘

Multi-metric:
┌─────────────────────────┐
│ Dec 7, 2025             │
│ Build #47, abc1234      │
│ ── modern-classes: 42   │
│ ·· legacy-classes: 18   │
└─────────────────────────┘
```

### 3.7 Footer

```
┌─────────────────────────────────────────────────────────────────┐
│  Builds: 47 · 2025-10-01 – 2025-12-07                           │
│  Generated by Unentropy v1.2.3 · Documentation                  │
└─────────────────────────────────────────────────────────────────┘
```

**Behavior**:
- Remains static regardless of filter changes
- Shows total database build count and full date range

### 3.8 Global Date Filter State

```typescript
interface GlobalDateFilterState {
  activeFilter: "7day" | "30day" | "90day" | "all" | "custom";
  customRange: {
    from: string | null;
    to: string | null;
  };
}
```

State does not persist across page reloads. All interactive elements update this single global state.

---

## 4. Visual States & Conditions

| Element | Condition | Visible |
|---------|-----------|---------|
| Section header | `report.sections` configured | ✓ |
| Section description | `section.description` present | ✓ |
| Multi-metric chart | `metrics` is array in config | ✓ |
| Flat layout | `report` absent | ✓ |
| Preview Bar | Build count < 10 | ✓ |
| Preview Bar | Build count ≥ 10 | ✗ |
| Custom Date Popover | "Custom" button clicked | ✓ |
| Custom Date Popover | Click outside, Clear, or preset filter clicked | ✗ |
| Drag-to-zoom | Metric has ≥ 10 data points | Enabled |
| Drag-to-zoom | Metric has < 10 data points | Disabled |
| Section with no valid charts | All metrics unreferenced | Shows "No metrics configured" |
| Multi-metric chart, all missing | All referenced metrics absent | Shows "No data available" |

**Empty States**:
- No metrics collected: Friendly message with guidance
- Date filter yields no data: "No data in selected range"
- Single data point: Show as dot, trend shows "N/A"

---

## 5. Accessibility

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Tab | Move between filters, toggle, buttons, date pickers |
| Enter/Space | Activate buttons, toggle, open/close popover |
| Arrow keys | Navigate filter group; navigate calendar in date picker |
| Escape | Close Custom date picker popover |

### Screen Reader Support
- Charts have descriptive ARIA labels
- Stats grid readable as data table
- Toggle announces its state
- Filter buttons announce active state
- Error messages announced when invalid date range entered
