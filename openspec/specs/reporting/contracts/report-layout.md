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

```
┌─────────────────────────────────────────────────────────────────┐
│                           HEADER                                 │
│  Repository name, date filters (7d/30d/90d/All/Custom)          │
├─────────────────────────────────────────────────────────────────┤
│                       PREVIEW BAR (conditional)                  │
│  Toggle to show sample data when < 10 builds                    │
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
│  Build count, date range, version info, documentation link      │
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
┌─────────────────────────────────────────────────────────────────┐
│  REPOSITORY NAME                                                 │
│                                                                  │
│  ┌─────┬─────┬─────┬─────┬────────┐                             │
│  │7 day│30day│90day│ All │ Custom │                             │
│  └─────┴─────┴─────┴─────┴────────┘                             │
│                              ↓ (when clicked)                    │
│                    ┌──────────────────────┐                      │
│                    │ From: [📅 picker]    │                      │
│                    │ To:   [📅 picker]    │                      │
│                    │         [Clear]      │                      │
│                    └──────────────────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

**Elements**:
- Repository name (prominent, left-aligned)
- Date filter buttons (right-aligned on desktop): "7 days", "30 days", "90 days", "All", "Custom"
- One button is always active (highlighted); default: "All" on page load

**Custom Date Picker Popover**:
- **Trigger**: Click on "Custom" button
- **Position**: Below Custom button, right-aligned on desktop; intelligently positioned on mobile
- **Contains**: "From"/"To" date pickers (native HTML5 `<input type="date">`), "Clear" button
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

### 3.3 Metric Card

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

### 3.4 Chart Area

**Chart Types**:
- **Line chart**: Numeric metrics with smooth curve, filled area, point dots, gaps for missing data
- **Bar chart**: Label metrics with occurrence counts

**Vertical Alignment Indicator**:
- Appears on hover over any chart
- 1px solid vertical line, 30% opacity, semi-transparent blue
- Extends full chart height
- Synchronized across all charts
- Dismissed when cursor leaves chart areas

**Tooltip Content**:
```
┌─────────────────────────┐      ┌─────────────────────────┐
│ Dec 7, 2025             │      │ Dec 5, 2025             │
│ Coverage: 82.5%         │      │ No data for this build  │
│ Build #47, abc1234      │      └─────────────────────────┘
└─────────────────────────┘
```

### 3.5 Footer

```
┌─────────────────────────────────────────────────────────────────┐
│  Builds: 47 · 2025-10-01 – 2025-12-07                           │
│  Generated by Unentropy v1.2.3 · Documentation                  │
└─────────────────────────────────────────────────────────────────┘
```

**Behavior**:
- Remains static regardless of filter changes
- Shows total database build count and full date range

### 3.6 Global Date Filter State

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
| Preview Bar | Build count < 10 | ✓ |
| Preview Bar | Build count ≥ 10 | ✗ |
| Custom Date Popover | "Custom" button clicked | ✓ |
| Custom Date Popover | Click outside, Clear, or preset filter clicked | ✗ |
| Drag-to-zoom | Metric has ≥ 10 data points | Enabled |
| Drag-to-zoom | Metric has < 10 data points | Disabled |

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
