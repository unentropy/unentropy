# Report Layout Specification

**Feature**: 006-metrics-report  
**Date**: 2025-12-07  
**Updated**: 2025-12-14 (Added custom date range picker)  
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
│  Repository name, date filters (7d/30d/90d/All/Custom)          │
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
│  Build count, date range, version info, documentation link      │
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
- Date filter buttons (right-aligned on desktop)
  - Five options: "7 days", "30 days", "90 days", "All", "Custom"
  - One button is always active (highlighted)
  - Default: "All" is active on page load

**Date Filter Buttons**:
- **Preset filters**: "7 days", "30 days", "90 days", "All"
  - Click to apply immediate filter
  - Clears any custom date range when clicked
  - Button text remains static (e.g., "7 days")
- **Custom filter**: Opens date picker popover
  - **Button text dynamically updates** to show selected date range
  - When inactive: Shows "Custom"
  - When active: Shows "YYYY-MM-DD – YYYY-MM-DD" (e.g., "2025-12-01 – 2025-12-14")
  - Becomes active when dates are selected or when chart is zoomed via drag

**Custom Date Picker Popover**:
- **Trigger**: Click on "Custom" button
- **Position**: 
  - Desktop: Below the Custom button, right-aligned
  - Tablet: Below Custom button, adjusted if near viewport edge
  - Mobile: Intelligently positioned to stay within viewport (may appear above if bottom space limited)
- **Contains**:
  - "From" date picker (calendar dropdown)
  - "To" date picker (calendar dropdown)
  - "Clear" button (resets to "All" filter)
- **Behavior**:
  - Opens immediately on Custom button click
  - Applies filter immediately when valid date range is selected
  - Updates in real-time as user adjusts dates
  - Closes when:
    - User clicks outside the popover
    - User clicks "Clear" (reverts to "All")
    - User selects another preset filter (7 day, 30 day, etc.)
  - Stays open while user is selecting dates
- **Validation**:
  - "From" date cannot be after "To" date
  - Shows inline error message for invalid ranges
  - Error prevents filter from applying
- **Date Constraints**:
  - Calendar picker disables (grays out) dates before earliest data point
  - Calendar picker disables (grays out) dates after latest data point
  - Only dates within available data range are selectable
- **Default Values**:
  - When first opened: "From" and "To" default to current filter range (or full range if "All")
  - When reopened: Shows last selected custom range if Custom was active

**Date Picker Component**:
- Library: To be researched (see `research.md` Section 12)
- Requirements: Works offline, no external CDN, bundled in HTML
- Appearance: Matches report theme (light/dark mode support)
- Format: Dates displayed in user-friendly format (e.g., "Dec 7, 2025")
- Returns: ISO format dates (YYYY-MM-DD) for internal state
- Touch-friendly: Calendar optimized for mobile interaction

**States**:
| State | Appearance | Button Label |
|-------|------------|--------------|
| Default button | Neutral background (gray), dark gray text | "Custom" |
| Active preset (7/30/90/All) | Primary blue background, white text | Static text (e.g., "7 days") |
| Active custom | Primary blue background, white text | "YYYY-MM-DD – YYYY-MM-DD" |
| Hover | Slight darkening of background | No change |
| Popover open | Custom button highlighted, popover visible with shadow | Shows current state |
| Invalid date range | Red border on date inputs, error message below pickers | No change until valid |
| Disabled dates in picker | Grayed out, not clickable | N/A |

**Responsive Behavior**:
| Breakpoint | Layout Changes |
|------------|----------------|
| **Mobile** (< 640px) | Filter buttons may wrap to multiple rows; popover full width or intelligently positioned |
| **Tablet** (640px - 1024px) | Filter buttons in single row if space allows; popover below Custom button |
| **Desktop** (> 1024px) | All filters in single row; popover positioned below Custom button, right-aligned |

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

**Vertical Alignment Indicator**:
- Appears on hover over any chart
- Positioned at the exact X-axis coordinate of the cursor
- Extends from top to bottom of the chart area
- Rendered as a thin semi-transparent line to avoid obscuring data
- Synchronized across all charts on the page
- Dismisses when cursor leaves chart areas

Visual representation:
```
┌─────────────────────────────────┐  ┌─────────────────────────────────┐
│ Coverage %                      │  │ Bundle Size (KB)                │
│ 90 │         ┃ •                │  │ 550 │         ┃ •               │
│ 80 │    •────┃────•             │  │ 500 │    •────┃────•            │
│ 70 │   /     ┃    \             │  │ 450 │   /     ┃    \            │
│    └────────┬┴──────────────────┘  │    └────────┬┴─────────────────┘
│      Oct 1  ↑Oct 5  Oct 15         │      Oct 1  ↑Oct 5  Oct 15
│      (vertical line synced across both charts)
```

**Interactive Behaviors**:

| Action | Response |
|--------|----------|
| Hover on any chart area | A vertical alignment line appears on ALL charts at the cursor's X position; all charts show tooltips for the same build (synchronized) |
| Move cursor horizontally | Vertical line updates in real-time on all charts, synchronized to the same X position; tooltips update accordingly |
| Click and drag (10+ data points) | Semi-transparent selection box appears; on release, zooms to selected range (all charts zoom together) |
| Click "Reset Zoom" button | All charts return to original scale; button disappears |
| Mouse leaves all charts | Vertical alignment line and all tooltips simultaneously dismiss |

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

### 3.4.1 Vertical Alignment Indicator

**Purpose**: Provides a precise visual anchor that helps users identify the exact X-axis position across multiple metric charts simultaneously, reducing eye strain and improving accuracy when comparing cross-metric trends.

**Trigger**: Appears when the user's cursor hovers over any chart area.

**Appearance**:
- Width: 1 pixel
- Color: Semi-transparent blue (light mode) or adjusted for dark mode
- Opacity: 30% (allows data and gridlines to be visible behind the line)
- Style: Solid, vertical line extending from top to bottom of chart area

**Position**:
- X-coordinate: Aligns with the cursor's horizontal position within the chart
- Y-range: Extends across the full visible chart area (from top gridline to bottom gridline)

**Behavior**:
- **On hover**: Line appears immediately when cursor enters any chart area
- **On movement**: Line position updates in real-time as cursor moves horizontally
- **On leave**: Line dismisses when cursor leaves all chart areas
- **Synchronization**: When one chart is hovered, the line appears on all visible charts at the same X position (synchronized within <50ms)
- **Respect zoom**: When charts are zoomed, the line appears within the current zoomed chart area bounds
- **Respect filters**: The line is visual only (not data-dependent) and appears even when date filters hide data

**Interaction with Other Elements**:
- **Behind data**: Line is drawn behind data points and lines so it doesn't obscure metrics
- **With tooltips**: Vertical line appears alongside synchronized tooltips (both appear on hover)
- **With zoom controls**: Works transparently with zoomed charts

**Accessibility**:
- The line serves as a visual aid and is supplemented by synchronized tooltips (which provide textual data)
- Color contrast meets WCAG AA standards against both light and dark backgrounds
- The indicator position is redundant with the X-axis label (user can read timestamp from axis)

**Configuration**:
```
Color (light mode): rgba(59, 130, 246, 0.3)  // semi-transparent blue
Color (dark mode): rgba(147, 197, 253, 0.3)  // lighter blue for contrast
Width: 1 pixel
Opacity: 30%
```

---

### 3.5 Action Buttons

**Export Button [📥]**:
- Location: Top-right of metric card
- Icon: Download arrow
- Behavior: Downloads chart as PNG image
- Filename: `{metric-name}-chart.png`
- If preview mode is active: Image includes "(Preview Data)" watermark

**Reset Zoom Button**:
- Location: Top-right corner of the chart canvas container (positioned absolutely)
- Visibility: Only visible when chart is zoomed in
- Behavior: Returns ALL synced charts to the original scale
- Label: "Reset Zoom" (text only)
- Style: Gray background (#f3f4f6), 1px border, 4px border-radius, 12px font
- Note: Button is dynamically created/removed by the crosshair plugin

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

### 3.7 Footer

```
┌─────────────────────────────────────────────────────────────────┐
│  Builds: 47 · 2025-10-01 – 2025-12-07                           │
│  Generated by Unentropy v1.2.3 · Documentation                  │
└─────────────────────────────────────────────────────────────────┘
```

**Elements**:
- Build count and **total database date range** (top row)
  - **Static**: Shows total data available in database (not affected by filters)
  - Format: "Builds: {total count} · {earliest date} – {latest date}"
  - Dates in ISO format (YYYY-MM-DD)
- Tool name, version, and documentation link (bottom row)

**Behavior**:
- **Remains static** regardless of filter changes
- Shows **total** build count in database
- Date range shows **full database range** (earliest to latest build)
- **Does NOT update** when filters are applied
- **Rationale**: Footer is not visible enough to be the primary indicator of active filters. Active filter state is displayed in the Custom button label in the header.

**Appearance**: Subtle, doesn't compete with main content.

---

### 3.8 Global Date Filter State

**Purpose**: Single source of truth for date range filtering across all charts and UI elements.

**State Properties**:
```typescript
interface GlobalDateFilterState {
  activeFilter: "7day" | "30day" | "90day" | "all" | "custom";
  customRange: {
    from: string | null;  // ISO date string (YYYY-MM-DD)
    to: string | null;    // ISO date string (YYYY-MM-DD)
  };
  effectiveDateRange: {
    start: string;  // ISO date string (computed)
    end: string;    // ISO date string (computed)
  };
}
```

**State Synchronization**:

All interactive elements update the same global state:

| User Action | State Update | Custom Button Label Update |
|-------------|--------------|---------------------------|
| Click "7 days" | Set `activeFilter="7day"`, clear `customRange` | Reset to "Custom" |
| Click "30 days" | Set `activeFilter="30day"`, clear `customRange` | Reset to "Custom" |
| Click "90 days" | Set `activeFilter="90day"`, clear `customRange` | Reset to "Custom" |
| Click "All" | Set `activeFilter="all"`, clear `customRange` | Reset to "Custom" |
| Click "Custom" button | Open popover (state unchanged until dates selected) | No change |
| Select custom dates (valid) | Set `activeFilter="custom"`, update `customRange.from` and `customRange.to` | Update to "YYYY-MM-DD – YYYY-MM-DD" |
| Click "Clear" in popover | Set `activeFilter="all"`, clear `customRange`, close popover | Reset to "Custom" |
| Drag-to-zoom on chart | Set `activeFilter="custom"`, update `customRange` based on zoom range | Update to "YYYY-MM-DD – YYYY-MM-DD" |
| Click "Reset Zoom" | Restore previous `activeFilter` and `customRange` (before zoom) | Restore previous label |

**State Effects**:

When state changes, the following updates occur synchronously:

1. **All chart X-axes** update to show filtered range
2. **Stats grids** recalculate (min/max/trend) for visible range
3. **Custom button label** updates to show date range (or "Custom" when cleared)
4. **Active button** highlights in header (appropriate filter button)
5. **Footer** remains static (shows total database stats, not affected by filters)

**Computed Properties**:

`effectiveDateRange` is computed based on current state:

```javascript
function computeEffectiveDateRange(state, allBuilds) {
  if (state.activeFilter === "all") {
    return {
      start: allBuilds[0].timestamp,
      end: allBuilds[allBuilds.length - 1].timestamp
    };
  }
  
  if (state.activeFilter === "custom") {
    return {
      start: state.customRange.from,
      end: state.customRange.to
    };
  }
  
  // For preset filters (7day, 30day, 90day)
  const days = { "7day": 7, "30day": 30, "90day": 90 }[state.activeFilter];
  const endDate = allBuilds[allBuilds.length - 1].timestamp;
  const startDate = new Date(new Date(endDate) - days * 24 * 60 * 60 * 1000);
  
  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate
  };
}
```

**State Persistence**:
- Does NOT persist across page reloads
- Resets to `{ activeFilter: "all", customRange: { from: null, to: null } }` on page load
- Zoom state is temporary and can be cleared

---

## 4. Interaction Behaviors

### Synchronization Rules

All charts and controls in the report are interconnected through global state:

| User Action | Scope | Effect |
|-------------|-------|--------|
| Hover on any chart | All charts | Show tooltip for the same build timestamp |
| Drag to zoom | All charts + state | Zoom to selected X-axis range (synced), update global state to `activeFilter="custom"` |
| Click date filter (preset) | All charts + state | Update visible range, reset any zoom, clear custom range |
| Click "Custom" button | Header only | Open date picker popover |
| Select custom date range | All charts + state | Apply filter immediately, update all charts, stay popover open for adjustments |
| Click "Clear" in popover | All charts + state | Reset to "All" filter, close popover |
| Toggle preview | All charts | Switch between real and sample data (preserves filter state) |
| Click reset zoom | All charts + state | Return to pre-zoom filter state |
| Click export | Single chart | Download that chart with current filter applied |

### Date Filter Interaction Flow

**Preset Filters (7/30/90/All)**:
1. User clicks preset button
2. Global state updates: `activeFilter` = clicked preset, `customRange` = `{ from: null, to: null }`
3. All charts re-render with new date range
4. Stats recalculate for visible range
5. Footer updates build count and date range
6. If Custom popover is open, it closes

**Custom Date Filter**:
1. User clicks "Custom" button
2. Popover opens below button
3. User selects "From" date → validated but filter not applied yet
4. User selects "To" date → immediately validated
5. If valid: Global state updates to `activeFilter="custom"`, charts filter, popover stays open
6. If invalid: Error message shown, no state update
7. User can continue adjusting dates (immediate updates on each change)
8. User clicks outside or "Clear" → popover closes

**Drag-to-Zoom**:
1. User drags on any chart (when ≥ 10 data points visible)
2. Selection box appears on all charts
3. On release: 
   - Global state updates to `activeFilter="custom"`
   - `customRange` set based on zoom range (extracted from data timestamps)
   - All charts zoom to selected range
4. "Custom" button becomes active (highlighted)
5. Footer shows zoomed range and visible build count

**Reset Zoom**:
1. User clicks "Reset Zoom" button
2. If previous state was a preset filter: Restore that preset
3. If previous state was custom: Restore previous custom range
4. All charts return to pre-zoom scale
5. Footer updates to reflect restored state

**Empty Range Handling**:
- When custom date range contains no data points:
  - Charts display empty state message: "No data in selected range"
  - Stats show "N/A" for all values
  - Footer shows "Builds: 0 · {start date} – {end date}"
  - Filter remains active (user can adjust dates or clear)

### State Persistence

| State | Persists across page reload? |
|-------|------------------------------|
| Date filter selection (preset) | No (defaults to "All") |
| Custom date range | No (defaults to cleared) |
| Preview toggle | No (defaults to OFF / real data) |
| Zoom position | No (resets to current filter) |

---

## 5. Visual States & Conditions

### Element Visibility Matrix

| Element | Condition | Visible |
|---------|-----------|---------|
| Preview Bar | Build count < 10 | ✓ |
| Preview Bar | Build count ≥ 10 | ✗ |
| Custom Date Popover | "Custom" button clicked | ✓ |
| Custom Date Popover | Click outside, Clear, or preset filter clicked | ✗ |
| Clear button (in popover) | Always visible in popover | ✓ |
| Date range error message | Invalid date range entered (from > to) | ✓ |
| Reset Zoom Button | Chart is zoomed via drag | ✓ |
| Reset Zoom Button | Chart at filtered state (not zoomed) | ✗ |
| Drag-to-zoom | Metric has ≥ 10 data points in visible range | Enabled |
| Drag-to-zoom | Metric has < 10 data points in visible range | Disabled |

### Empty States

| Scenario | Display |
|----------|---------|
| No metrics collected | Friendly message with guidance on how to start tracking |
| Date filter yields no data | "No data in selected range" message in chart area |
| Custom range with no data | "No data in selected range" message; footer shows "Builds: 0" |
| Single data point | Show as dot, trend shows "N/A" |

---

## 6. Color & Theme

### Color Usage (Generic)

| Purpose | Color Family |
|---------|--------------|
| Chart line/fill | Primary blue |
| Active filter button | Primary blue |
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
| Date filter update (preset) | Instant (< 300ms) |
| Date filter update (custom) | Instant (< 300ms) on date selection |
| Popover open/close | ~150ms fade in/out |
| Zoom/pan | Real-time (follows cursor) |
| Button hover state | ~150ms transition |
| Footer update | Instant (< 100ms) when filter changes |

**Principle**: Prioritize responsiveness. Data updates should feel instant. Only decorative transitions (hover states, popover animations) have subtle animation.

---

## 8. Accessibility

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Tab | Move between interactive elements (filters, toggle, buttons, date pickers) |
| Enter/Space | Activate buttons, toggle, and open/close popover |
| Arrow keys | Navigate within filter button group; navigate calendar in date picker |
| Escape | Close Custom date picker popover |

### Screen Reader Support

- Charts have descriptive ARIA labels summarizing the data
- Stats grid is readable as a data table
- Toggle announces its state ("Show preview, switch, off")
- Filter buttons announce active state ("7 days, button, selected")
- Custom popover announces when opened/closed
- Date pickers have proper labels ("From date" / "To date")
- Error messages announced when invalid date range entered

### Visual Accessibility

- All text meets WCAG AA contrast requirements
- Information is not conveyed by color alone (arrows supplement trend colors)
- Focus indicators are clearly visible on all interactive elements
- Date picker disabled dates are distinguishable by reduced opacity and cursor change

---

## 9. Print Considerations

When printed or saved as PDF:
- Charts render as static images
- Interactive elements (buttons, toggle) are hidden
- Page breaks occur between metric cards, not within them
- Dark mode converts to light for printing
