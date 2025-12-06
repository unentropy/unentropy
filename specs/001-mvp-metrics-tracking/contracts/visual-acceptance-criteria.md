# Contract: Visual Acceptance Criteria

**Purpose**: Define visual test fixtures, manual review checklist, and acceptance criteria for HTML report template quality assurance.

**Related Requirements**: FR-013 through FR-025, SC-006, SC-008, SC-009

## Overview

Visual acceptance testing ensures the HTML reports meet design, usability, and accessibility standards through manual review of generated artifacts from standardized test fixtures.

## Test Fixture Specifications

### Fixture 1: Minimal Data

**Purpose**: Verify report renders with minimal viable data

**Location**: `tests/fixtures/visual-review/minimal/`

**Files**:
- `unentropy.json` - Single numeric metric definition
- `minimal.db` - SQLite database with 5 data points across 5 days

**Configuration**:
```json
{
  "metrics": [
    {
      "name": "test-coverage",
      "type": "numeric",
      "description": "Code coverage percentage",
      "command": "echo '85.5'"
    }
  ]
}
```

**Data Characteristics**:
- 5 builds over 5 consecutive days
- Single metric with gradually increasing values (82.1 → 85.5)
- Upward trend
- No sparse data warnings

---

### Fixture 2: Full Featured

**Purpose**: Verify report handles multiple metrics of different types with rich data

**Location**: `tests/fixtures/visual-review/full-featured/`

**Files**:
- `unentropy.json` - 4 metrics (2 numeric, 2 label)
- `full-featured.db` - SQLite database with 100 data points (25 builds × 4 metrics)

**Configuration**:
```json
{
  "metrics": [
    {
      "name": "test-coverage",
      "type": "numeric",
      "description": "Percentage of code covered by tests"
    },
    {
      "name": "size",
      "type": "numeric",
      "description": "JavaScript bundle size in KB"
    },
    {
      "name": "build-status",
      "type": "label",
      "description": "CI build result"
    },
    {
      "name": "primary-language",
      "type": "label",
      "description": "Most used programming language"
    }
  ]
}
```

**Data Characteristics**:
- 25 builds over 30 days
- Numeric metrics with varying trends (one up, one down)
- Label metrics with realistic distributions
- Mix of daily and sparse builds

---

### Fixture 3: Sparse Data

**Purpose**: Verify warning indicators and sparse data handling

**Location**: `tests/fixtures/visual-review/sparse-data/`

**Files**:
- `unentropy.json` - 2 metrics
- `sparse-data.db` - SQLite database with only 3 data points

**Data Characteristics**:
- Only 3 builds over 14 days
- Triggers sparse data warning (< 5 data points)
- Large gaps between data points
- Tests informative messaging

---

### Fixture 4: Edge Cases

**Purpose**: Verify handling of edge cases and boundary conditions

**Location**: `tests/fixtures/visual-review/edge-cases/`

**Files**:
- `unentropy.json` - Metrics with special characteristics
- `edge-cases.db` - SQLite database with edge case data

**Data Characteristics**:
- Metric names with special characters: "test/coverage%", "bundle.size-kb"
- Very long metric descriptions (200+ characters)
- Extreme values (0, very large numbers, negative if applicable)
- Flatline data (no trend)
- Single data point metric

---

## Visual Review Checklist

### Layout & Responsiveness

**Mobile (320px - 640px)**:
- [ ] Header stacks vertically, all text readable
- [ ] Metric cards display in single column
- [ ] Summary statistics grid adapts (2×2 layout)
- [ ] Charts maintain 16:9 aspect ratio
- [ ] No horizontal scrolling
- [ ] Touch targets min 44×44px

**Tablet (640px - 1024px)**:
- [ ] Header displays side-by-side on larger tablets
- [ ] Metric cards display in 1-2 columns
- [ ] Summary statistics display in single row (4 columns)
- [ ] Charts scale appropriately

**Desktop (1024px+)**:
- [ ] Metrics display in 2-column grid
- [ ] All content fits within max-width container (7xl = 1280px)
- [ ] Summary statistics clearly visible
- [ ] Charts use full card width

---

### Visual Design & Styling

**Typography**:
- [ ] Heading hierarchy clear (h1 > h2)
- [ ] Font sizes readable at all breakpoints
- [ ] Line heights provide good readability
- [ ] Numbers in statistics are prominent

**Color & Contrast**:
- [ ] Text on background meets WCAG AA (4.5:1 minimum)
- [ ] Chart colors distinguishable
- [ ] Trend indicators use appropriate colors (green=up, red=down, gray=flat)
- [ ] Dark mode colors have sufficient contrast

**Spacing & Alignment**:
- [ ] Consistent padding/margins throughout
- [ ] Cards have uniform spacing in grid
- [ ] Content doesn't touch edges
- [ ] Visual hierarchy clear

---

### Charts & Data Visualization

**Chart Rendering**:
- [ ] All charts render without errors
- [ ] Line charts show smooth curves with tension
- [ ] Bar charts have appropriate bar widths
- [ ] Axes labeled clearly
- [ ] Grid lines subtle but visible

**Interactivity**:
- [ ] Hover tooltips appear on all data points
- [ ] Tooltips show exact values and timestamps
- [ ] Tooltips include commit SHA (first 7 chars)
- [ ] Tooltip positioning doesn't clip off screen
- [ ] Chart responds to hover within 100ms

**Data Accuracy**:
- [ ] Chart data matches summary statistics
- [ ] Trends direction matches visual slope
- [ ] Time axis shows correct date progression
- [ ] Value axis scales appropriately

---

### Accessibility

**Semantic HTML**:
- [ ] Proper heading hierarchy (no skipped levels)
- [ ] Canvas elements have aria-label
- [ ] Landmark regions used (header, main, footer)

**Keyboard Navigation**:
- [ ] All interactive elements keyboard-accessible
- [ ] Focus indicators visible
- [ ] Tab order logical

**Screen Reader Support**:
- [ ] Summary statistics readable without charts
- [ ] Alternative data representation available
- [ ] Status messages announced

**Color Independence**:
- [ ] Information not conveyed by color alone
- [ ] Trend arrows supplement color coding

---

### Dark Mode

- [ ] All text readable in dark mode
- [ ] Chart colors adjusted for dark background
- [ ] No white/light flashes
- [ ] Consistent color scheme throughout
- [ ] Tooltips styled for dark mode

---

### Edge Cases & Error States

**Sparse Data**:
- [ ] Warning banner displays when < 5 data points
- [ ] Warning message clear and actionable
- [ ] Chart still renders correctly
- [ ] Icon/visual indicator present

**Empty Metrics**:
- [ ] "No data" message displays for metrics with 0 points
- [ ] Empty state has helpful illustration
- [ ] Guidance text explains next steps

**Special Characters**:
- [ ] Metric names with special chars display correctly
- [ ] No XSS vulnerabilities (HTML escaped)
- [ ] No broken layouts from long names

**Extreme Values**:
- [ ] Very large numbers formatted readably
- [ ] Charts scale appropriately
- [ ] No layout breaks

---

### Print & Export

**Print Layout**:
- [ ] Print stylesheet loads
- [ ] Background colors removed/adjusted
- [ ] Page breaks avoid splitting charts
- [ ] Content fits on standard paper sizes
- [ ] Headers/footers appropriate

**PDF Export** (browser "Save as PDF"):
- [ ] All content visible
- [ ] Charts render as images
- [ ] Links removed or converted
- [ ] File size reasonable

---

### Performance & Loading

**Initial Load**:
- [ ] CDN resources load (Tailwind CSS, Chart.js)
- [ ] No console errors
- [ ] Charts render within 2 seconds
- [ ] No layout shift after charts render

**Offline Behavior**:
- [ ] After initial load, report viewable offline
- [ ] CDN resources cached by browser
- [ ] No broken functionality when offline

**Fallbacks**:
- [ ] Graceful degradation if CDN unavailable
- [ ] Error message if Chart.js fails to load
- [ ] Core content still readable

---

## Generation Commands

### Generate All Fixtures

```bash
# Generate minimal fixture
bun run generate-fixture -- --fixture=minimal --output=tests/fixtures/visual-review/minimal/report.html

# Generate full-featured fixture
bun run generate-fixture -- --fixture=full-featured --output=tests/fixtures/visual-review/full-featured/report.html

# Generate sparse data fixture
bun run generate-fixture -- --fixture=sparse-data --output=tests/fixtures/visual-review/sparse-data/report.html

# Generate edge cases fixture
bun run generate-fixture -- --fixture=edge-cases --output=tests/fixtures/visual-review/edge-cases/report.html
```

### Review All Reports

```bash
# Open all generated reports in default browser
open tests/fixtures/visual-review/*/report.html
```

---

## Acceptance Criteria

### Must Pass Before Merging

1. **All checklist items** above verified manually
2. **All four fixtures** generate without errors
3. **At least one reviewer** completes full checklist
4. **Screenshots captured** for documentation (mobile, tablet, desktop)
5. **No console errors** in any browser
6. **WCAG AA compliance** verified with automated tool (e.g., axe DevTools)

### Browser Compatibility

Test in:
- [ ] Chrome/Edge 90+
- [ ] Firefox 88+
- [ ] Safari 14+ (macOS)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

---

## Review Process

1. **Generate Fixtures**: Run generation commands to create HTML reports
2. **Desktop Review**: Open each report and complete desktop checklist items
3. **Responsive Review**: Use browser DevTools to test mobile/tablet breakpoints
4. **Dark Mode Review**: Toggle system dark mode, verify appearance
5. **Print Review**: Use browser print preview to verify print layout
6. **Accessibility Review**: Run axe DevTools, complete keyboard navigation test
7. **Browser Testing**: Repeat key checks in Firefox and Safari
8. **Document Results**: Create review notes with screenshots and any issues found

---

## Notes

- Visual acceptance is **manual** and requires human judgment
- Tests should be performed by someone other than the implementer when possible
- Findings should be documented as GitHub issues if blocking
- Re-review required after template changes
- Fixtures checked into repository for reproducibility
