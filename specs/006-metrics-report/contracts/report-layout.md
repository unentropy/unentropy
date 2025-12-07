# Report Layout Specification

**Feature**: 006-metrics-report  
**Date**: 2025-12-07  
**Purpose**: Visual and behavioral contract for UX review

## 1. Overview

### Purpose
The Metrics Report is a self-contained HTML file that visualizes code metrics trends over time. It helps developers and engineering managers understand project health at a glance.

### Target Users
- **Developers**: Quick check on metrics after CI runs
- **Engineering Managers**: Track team progress over time
- **Technical Leads**: Identify trends and anomalies

### Design Principles
- **Glanceable**: Key insights visible within 5 seconds
- **Interconnected**: All charts work together (synced tooltips, zoom, filters)
- **Responsive**: Works on mobile, tablet, and desktop
- **Accessible**: Keyboard navigable, screen reader friendly
- **Self-contained**: Works offline after initial load

---

## 2. Page Layout

### Overall Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                           HEADER                                 │
│  Repository name, build count, generation date, date filters    │
├─────────────────────────────────────────────────────────────────┤
│                       PREVIEW BAR (conditional)                  │
│  Toggle to show sample data when < 10 builds                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────┐  ┌─────────────────────────┐       │
│  │      METRIC CARD        │  │      METRIC CARD        │       │
│  │                         │  │                         │       │
│  │  Chart + Stats + Actions│  │  Chart + Stats + Actions│       │
│  │                         │  │                         │       │
│  └─────────────────────────┘  └─────────────────────────┘       │
│                                                                  │
│  ┌─────────────────────────┐  ┌─────────────────────────┐       │
│  │      METRIC CARD        │  │      METRIC CARD        │       │
│  │                         │  │                         │       │
│  └─────────────────────────┘  └─────────────────────────┘       │
│                                                                  │
│                          ... more cards ...                      │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                           FOOTER                                 │
│  Version info, documentation link                                │
└─────────────────────────────────────────────────────────────────┘
```

### Responsive Behavior

| Breakpoint | Layout Changes |
|------------|----------------|
| **Mobile** (< 640px) | Single column cards, stacked header elements, full-width charts |
| **Tablet** (640px - 1024px) | Single or two column cards depending on width, side-by-side header |
| **Desktop** (> 1024px) | Two column card grid, horizontal header, max-width container |

---

## 3. Component Catalog

### 3.1 Header

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  REPOSITORY NAME                      ┌─────┬─────┬─────┬─────┐ │
│  Builds: 47 · Oct 1 – Dec 7, 2025    │7 day│30day│90day│ All │ │
│                                       └─────┴─────┴─────┴─────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Elements**:
- Repository name (prominent, left-aligned)
- Build count
- Date range of data
- Date filter buttons (right-aligned on desktop)

**Date Filter Buttons**:
- Four options: "7 days", "30 days", "90 days", "All"
- One button is always active (highlighted)
- Default: "All" is active on page load

**States**:
| State | Appearance |
|-------|------------|
| Default button | Neutral background |
| Active button | Primary color background, white text |
| Hover | Slight darkening |

---

### 3.2 Preview Bar

```
┌─────────────────────────────────────────────────────────────────┐
│  ℹ️  Limited data (5 builds). Toggle to see how charts will     │
│      look with more data.                        [ Show preview ]│
└─────────────────────────────────────────────────────────────────┘
```

**Visibility**: Only appears when total build count is less than 10.

**Elements**:
- Info icon
- Explanatory message
- Toggle switch with label "Show preview"

**Behavior**:
- When toggled ON: All charts display synthetic sample data (20 points over 60 days)
- When toggled OFF: Charts show actual recorded data
- Stats update to reflect currently displayed data
- Transition is instant (no animation)

**Purpose**: Helps new users understand the value of the tool before they have enough real data.

---

### 3.3 Metric Card

```
┌─────────────────────────────────────────────────────────────────┐
│  Metric Name                                        [📥] [↺]    │
│  Optional description text                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                         CHART AREA                               │
│                                                                  │
│      ╭──────────────────────────────────────╮                   │
│      │                    ·  ·              │                   │
│      │              ·  ·      ·  ·          │                   │
│      │         ·  ·              ·          │                   │
│      │    ·  ·                      ·  ·    │                   │
│      ╰──────────────────────────────────────╯                   │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  Latest: 82.5%    Min: 71.2%    Max: 89.1%    Trend: ↑ +3.2%   │
└─────────────────────────────────────────────────────────────────┘
```

**Elements**:
- **Title row**: Metric name, export button [📥], reset zoom button [↺]
- **Description**: Optional explanatory text (if provided in config)
- **Chart area**: Interactive chart (line or bar)
- **Stats row**: Latest value, Min, Max, Trend (direction + percentage)

**Card States**:
| State | Appearance |
|-------|------------|
| Default | Clean card with subtle shadow |
| Sparse data (< 5 points) | Yellow warning banner below title |
| Zoomed | Reset zoom button becomes visible |

---

### 3.4 Chart Area

**Chart Types**:
- **Line chart**: For numeric metrics (coverage %, bundle size, etc.)
- **Bar chart**: For label/category metrics (status distribution, etc.)

**Line Chart Appearance**:
- Primary color line with subtle fill underneath
- Smooth curves connecting data points
- Visible dots at each data point
- Gaps (not connected lines) where data is missing

**Interactive Behaviors**:

| Action | Response |
|--------|----------|
| Hover on data point | Tooltip appears showing: date, value, build number, commit SHA |
| Hover on any chart | ALL charts show tooltips for the same build (synchronized) |
| Mouse wheel scroll | Zoom in/out on X-axis (all charts zoom together) |
| Click and drag | Pan horizontally when zoomed (all charts pan together) |
| Mouse leaves chart | All tooltips dismiss |

**Tooltip Content**:
```
┌─────────────────────────┐
│ Dec 7, 2025             │
│ Coverage: 82.5%         │
│ Build #47, abc1234      │
└─────────────────────────┘
```

For missing data points:
```
┌─────────────────────────┐
│ Dec 5, 2025             │
│ No data for this build  │
└─────────────────────────┘
```

---

### 3.5 Action Buttons

**Export Button [📥]**:
- Location: Top-right of metric card
- Icon: Download arrow
- Behavior: Downloads chart as PNG image
- Filename: `{metric-name}-chart.png`
- If preview mode is active: Image includes "(Preview Data)" watermark

**Reset Zoom Button [↺]**:
- Location: Top-right of metric card (next to export)
- Visibility: Only visible when chart is zoomed in
- Behavior: Returns ALL charts to the current filter's full range
- Label: "Reset zoom" (icon + text or just icon depending on space)

---

### 3.6 Stats Grid

```
┌──────────────┬──────────────┬──────────────┬──────────────────┐
│   Latest     │     Min      │     Max      │      Trend       │
│   82.5%      │    71.2%     │    89.1%     │    ↑ +3.2%       │
└──────────────┴──────────────┴──────────────┴──────────────────┘
```

**Values**:
- **Latest**: Most recent recorded value
- **Min**: Lowest value in the displayed range
- **Max**: Highest value in the displayed range
- **Trend**: Direction arrow (↑/↓/→) plus percentage change

**Trend Indicators**:
| Direction | Arrow | Color Hint |
|-----------|-------|------------|
| Increasing | ↑ | Context-dependent (green for coverage, red for bundle size) |
| Decreasing | ↓ | Context-dependent |
| Stable (< 1% change) | → | Neutral |
| Not enough data | — | Muted text "N/A" |

**Behavior**: Stats update when:
- Date filter changes (recalculated for visible range)
- Preview toggle changes (shows preview data stats)

---

### 3.7 Sparse Data Warning

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️  Limited data (3 data points). Trends will be more          │
│      accurate with more builds.                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Visibility**: Appears within a metric card when that metric has fewer than 5 data points.

**Appearance**: Yellow/amber background, warning icon, helpful message.

**Purpose**: Sets expectations that trend calculations may not be reliable yet.

---

### 3.8 Footer

```
┌─────────────────────────────────────────────────────────────────┐
│  Generated by Unentropy v1.2.3 · Documentation                  │
└─────────────────────────────────────────────────────────────────┘
```

**Elements**:
- Tool name and version
- Link to documentation

**Appearance**: Subtle, doesn't compete with main content.

---

## 4. Interaction Behaviors

### Synchronization Rules

All charts in the report are interconnected:

| User Action | Scope | Effect |
|-------------|-------|--------|
| Hover on any chart | All charts | Show tooltip for the same build timestamp |
| Zoom (mouse wheel) | All charts | Zoom to same X-axis range |
| Pan (drag) | All charts | Pan to same X-axis position |
| Click date filter | All charts | Update visible range, reset any zoom |
| Toggle preview | All charts | Switch between real and sample data |
| Click reset zoom | All charts | Return to filter's full range |
| Click export | Single chart | Download that chart only |

### State Persistence

| State | Persists across page reload? |
|-------|------------------------------|
| Date filter selection | No (defaults to "All") |
| Preview toggle | No (defaults to OFF / real data) |
| Zoom/pan position | No (resets to full range) |

---

## 5. Visual States & Conditions

### Element Visibility Matrix

| Element | Condition | Visible |
|---------|-----------|---------|
| Preview Bar | Build count < 10 | ✓ |
| Preview Bar | Build count ≥ 10 | ✗ |
| Reset Zoom Button | Chart is zoomed/panned | ✓ |
| Reset Zoom Button | Chart at default zoom | ✗ |
| Sparse Warning | Metric has < 5 data points | ✓ |
| Sparse Warning | Metric has ≥ 5 data points | ✗ |
| Zoom/Pan controls | Metric has ≥ 3 data points | Enabled |
| Zoom/Pan controls | Metric has < 3 data points | Disabled |

### Empty States

| Scenario | Display |
|----------|---------|
| No metrics collected | Friendly message with guidance on how to start tracking |
| Date filter yields no data | "No data in selected range" message in chart area |
| Single data point | Show as dot, trend shows "N/A" |

---

## 6. Color & Theme

### Color Usage (Generic)

| Purpose | Color Family |
|---------|--------------|
| Chart line/fill | Primary blue |
| Active filter button | Primary blue |
| Warning banner | Amber/yellow |
| Positive trend | Green |
| Negative trend | Red |
| Neutral/stable | Gray |
| Card background | White (light) / Dark gray (dark mode) |

### Dark Mode

The report respects the user's system preference for light/dark mode:
- All text remains readable
- Chart colors adjust for contrast
- Card backgrounds invert appropriately
- No manual toggle (automatic based on OS setting)

---

## 7. Animation & Timing

| Interaction | Timing |
|-------------|--------|
| Tooltip appear/update | Instant |
| Chart data switch (preview toggle) | Instant |
| Date filter update | Instant (< 300ms) |
| Zoom/pan | Real-time (follows cursor) |
| Button hover state | ~150ms transition |

**Principle**: Prioritize responsiveness. Data updates should feel instant. Only decorative transitions (hover states) have subtle animation.

---

## 8. Accessibility

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Tab | Move between interactive elements (filters, toggle, buttons) |
| Enter/Space | Activate buttons and toggle |
| Arrow keys | Navigate within filter button group |

### Screen Reader Support

- Charts have descriptive ARIA labels summarizing the data
- Stats grid is readable as a data table
- Toggle announces its state ("Show preview, switch, off")
- Filter buttons announce active state

### Visual Accessibility

- All text meets WCAG AA contrast requirements
- Information is not conveyed by color alone (arrows supplement trend colors)
- Focus indicators are clearly visible

---

## 9. Print Considerations

When printed or saved as PDF:
- Charts render as static images
- Interactive elements (buttons, toggle) are hidden
- Page breaks occur between metric cards, not within them
- Dark mode converts to light for printing
