**Domain**: reporting

## Overview

Visual acceptance testing ensures the HTML reports meet design, usability, and accessibility standards through manual review of generated artifacts from standardized test fixtures.

---

## Test Fixture Specifications

### Fixture 1: Minimal Data

**Purpose**: Verify report renders with minimal viable data

**Data Characteristics**:

- 5 builds over 5 consecutive days
- Single metric with gradually increasing values (82.1 → 85.5)
- Upward trend
- No sparse data warnings

### Fixture 2: Full Featured

**Purpose**: Verify report handles multiple metrics of different types with rich data

**Configuration**: 4 metrics (2 numeric, 2 label)

**Data Characteristics**:

- 25 builds over 30 days
- Numeric metrics with varying trends (one up, one down)
- Label metrics with realistic distributions
- Mix of daily and sparse builds

### Fixture 3: Sparse Data

**Purpose**: Verify warning indicators and sparse data handling

**Data Characteristics**:

- 3 builds over 14 days
- Triggers sparse data warning (< 5 data points)
- Large gaps between data points

### Fixture 4: Edge Cases

**Purpose**: Verify handling of edge cases and boundary conditions

**Data Characteristics**:

- Metric names with special characters: "test/coverage%", "bundle.size-kb"
- Very long metric descriptions (200+ characters)
- Extreme values (0, very large numbers)
- Flatline data (no trend)
- Single data point metric

---

## Visual Review Checklist

### Layout & Responsiveness

**Mobile (320px - 640px)**:

- [ ] Header stacks vertically, all text readable
- [ ] Metric cards display in single column
- [ ] Summary statistics grid adapts (2x2 layout)
- [ ] Charts maintain 16:9 aspect ratio
- [ ] No horizontal scrolling
- [ ] Touch targets min 44x44px

**Tablet (640px - 1024px)**:

- [ ] Header displays side-by-side on larger tablets
- [ ] Metric cards display in 1-2 columns
- [ ] Summary statistics display in single row (4 columns)

**Desktop (1024px+)**:

- [ ] Metrics display in 2-column grid
- [ ] All content fits within max-width container (1280px)

### Visual Design & Styling

- [ ] Heading hierarchy clear (h1 > h2)
- [ ] Text meets WCAG AA contrast (4.5:1 minimum)
- [ ] Chart colors distinguishable
- [ ] Trend indicators use appropriate colors (green=up, red=down, gray=flat)
- [ ] Dark mode colors have sufficient contrast
- [ ] Consistent padding/margins throughout

### Charts & Data Visualization

- [ ] All charts render without errors
- [ ] Line charts show smooth curves with tension
- [ ] Bar charts have appropriate bar widths
- [ ] Hover tooltips appear on all data points showing exact values and timestamps
- [ ] Tooltips include commit SHA (first 7 chars)
- [ ] Chart data matches summary statistics
- [ ] Trends direction matches visual slope

### Interactive Features

**Preview Data Toggle**:

- [ ] Toggle appears when < 10 builds
- [ ] Toggle hidden when ≥ 10 builds
- [ ] Toggling switches between real and synthetic data
- [ ] Stats update to reflect displayed data

**Synchronized Crosshair**:

- [ ] Vertical alignment line appears on all charts on hover
- [ ] Line updates in real-time as cursor moves
- [ ] All charts show tooltips for the same build
- [ ] Line and tooltips dismiss when leaving chart area
- [ ] Missing data shows "No data for this build"

**Drag-to-Zoom**:

- [ ] Selection box appears during drag
- [ ] Charts zoom to selected range on release
- [ ] All charts synchronize zoom range
- [ ] Zoom disabled for < 10 data points

**Date Filters**:

- [ ] All filter buttons present (7d/30d/90d/All/Custom)
- [ ] Active filter visually highlighted
- [ ] "All" is default active filter
- [ ] Custom popover opens/closes correctly
- [ ] Date validation prevents from > to
- [ ] Out-of-range dates grayed out

**Chart Export**:

- [ ] "Download PNG" button visible on each chart
- [ ] PNG downloads with chart content
- [ ] Preview watermark shown when preview data active

### Accessibility

- [ ] Proper heading hierarchy (no skipped levels)
- [ ] Canvas elements have aria-label
- [ ] All interactive elements keyboard-accessible
- [ ] Focus indicators visible
- [ ] Tab order logical
- [ ] Summary statistics readable without charts
- [ ] Information not conveyed by color alone

### Dark Mode

- [ ] All text readable in dark mode
- [ ] Chart colors adjusted for dark background
- [ ] No white/light flashes
- [ ] Consistent color scheme throughout

### Edge Cases

- [ ] Zero builds: empty state with guidance message
- [ ] Single data point: renders as dot, trend shows "N/A"
- [ ] Special characters in metric names: displayed correctly, no XSS
- [ ] Very large numbers formatted readably
- [ ] No data in selected range: message displayed

### Print & Export

- [ ] Print stylesheet loads
- [ ] Page breaks avoid splitting charts
- [ ] All content visible when saved as PDF

---

## Acceptance Criteria

### Must Pass Before Merging

1. All checklist items verified manually
2. All four fixtures generate without errors
3. At least one reviewer completes full checklist
4. Screenshots captured for documentation (mobile, tablet, desktop)
5. No console errors in any browser
6. WCAG AA compliance verified with automated tool (e.g., axe DevTools)

### Browser Compatibility

- [ ] Chrome/Edge 90+
- [ ] Firefox 88+
- [ ] Safari 14+ (macOS)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)
