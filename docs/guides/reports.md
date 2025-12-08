---
title: Reports
description: Generate and customize interactive HTML reports showing metric trends over time
sidebar:
  order: 4
unentropy_docs:
  generated: 2025-12-08T14:32:00Z
  sources:
    - specs/006-metrics-report/spec.md
  scope: all
---

Unentropy generates interactive HTML reports showing how your metrics evolve over time. Reports include charts, statistics, and tools for exploring your data.

## Generating Reports

Reports are automatically generated after metric collection in your CI workflow.

### In GitHub Actions

The `track-metrics` action generates a report and uploads it as a workflow artifact:

```yaml
- name: Track metrics
  uses: unentropy/track-metrics-action@v1
```

After the workflow completes:

1. Go to the **Actions** tab in your repository
2. Click on the latest workflow run
3. Download `unentropy-report.html` from artifacts
4. Open the HTML file in your browser

### Local Preview

Preview your report structure locally without collecting real data:

```bash
bunx unentropy preview
```

This generates an empty report showing all configured metrics with placeholder data, then opens it in your browser.

## Report Structure

Each report contains:

### Header Section

- Repository name
- Generation timestamp
- Data range (first to last build)
- Total build count

### Metric Cards

Each metric gets its own card with:

- **Chart**: Interactive visualization of trends
- **Statistics**: Latest, Min, Max, and Trend
- **Description**: Metric purpose (if configured)

### Controls

- **Date range filters**: View last 7, 30, 90 days, or all data
- **Zoom/pan**: Examine specific time periods in detail
- **Export**: Download charts as PNG images

## Chart Types

### Numeric Metrics

Displayed as line charts with:

- Smooth curves showing trends over time
- Filled area under the line
- Interactive tooltips with exact values
- X-axis: Build dates
- Y-axis: Metric values (auto-scaled)

Example metrics: Coverage, LOC, bundle size

### Label Metrics

Displayed as bar charts with:

- Bars showing occurrence counts per label
- X-axis: Label values
- Y-axis: Count of occurrences

Example metrics: Build status (success/failure), environment

## Interactive Features

### Synchronized Tooltips

Hover over any chart to see tooltips on all charts for the same build:

```
Coverage: 87.5% → 88.2% (+0.7%)
Bundle Size: 240 KB → 238 KB (-2 KB)
LOC: 4,521 → 4,580 (+59)
```

This helps you correlate changes across metrics (e.g., "when coverage dropped, did bundle size increase?").

### Zoom and Pan

Examine specific time periods in detail:

1. **Zoom**: Scroll mouse wheel over a chart
2. **Pan**: Click and drag horizontally when zoomed
3. **Reset**: Click "Reset zoom" to restore original view

Zoom synchronizes across all charts automatically.

### Date Range Filters

Quickly focus on recent data:

- **7 days**: Last week
- **30 days**: Last month
- **90 days**: Last quarter
- **All**: Complete history

The active filter is highlighted. Charts update immediately when you select a new range.

### Export Charts

Download individual charts as PNG images:

1. Click **Download PNG** on any metric card
2. Image downloads with chart title
3. Use in presentations, docs, or reports

Exported images reflect current zoom level and date range filter.

## Preview Mode

When you have less than 10 builds, the report includes a preview toggle to show what charts will look like with more data.

### Toggle Preview Data

The toggle appears below the report header:

```
📊 Preview Mode
Show how charts will look with more data
[Toggle Switch: Show preview]
```

- **ON**: Shows 20 synthetic data points demonstrating realistic trends
- **OFF**: Shows your actual collected data

This helps you:

- Validate report setup before collecting real data
- Understand chart appearance with sufficient history
- Test visualization features

> **Note**: The toggle disappears once you have 10+ builds.

### Preview Data Watermark

Charts exported while preview mode is active include a "(Preview Data)" watermark to indicate synthetic data.

## Sparse Data Handling

Reports handle incomplete data gracefully:

### Missing Data Points

If a metric has no value for a specific build:

- Chart shows a gap (no line/point)
- Synchronized tooltip shows "No data for this build"
- X-axis maintains consistent timeline across all charts

### Few Data Points

Metrics with fewer than 5 data points show a "sparse data" warning indicator. Collect more data to see meaningful trends.

### Empty Charts

When no data exists in the selected date range:

```
No data in selected range
Try selecting a different time period
```

## Report Styling

### Responsive Design

Reports adapt to different screen sizes:

- **Mobile** (320px+): Single column, stacked cards
- **Tablet** (640px+): Two columns
- **Desktop** (1024px+): Three columns

### Dark Mode

Reports automatically use dark mode if your system preference is set to dark. No configuration needed.

### Print Support

Reports are print-friendly:

1. Open report in browser
2. Print or save as PDF
3. Charts and statistics render correctly

## Publishing to GitHub Pages

Host your reports on GitHub Pages for easy team access.

### Add Deployment Job

Update `.github/workflows/metrics.yml`:

```yaml
jobs:
  track-metrics:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests with coverage
        run: bun test --coverage
      - name: Track metrics
        uses: unentropy/track-metrics-action@v1

  deploy:
    name: Deploy to GitHub Pages
    runs-on: ubuntu-latest
    needs: track-metrics
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Enable GitHub Pages

1. Go to repository **Settings** → **Pages**
2. Source: **GitHub Actions**
3. Save

After the next workflow run, your report will be available at:

```
https://<username>.github.io/<repo>/
```

## Example Reports

### Minimal Data

Report with 3 builds showing early trends:

- Preview toggle available
- All charts display sparse data warning
- Metrics show "N/A" for trend (insufficient data)

### Full History

Report with 100+ builds showing rich trends:

- No preview toggle (enough data)
- Clear trends visible (↑ increasing, ↓ decreasing, → stable)
- Zoom/pan useful for examining specific periods

### Multiple Metrics

Report tracking 5+ metrics:

- Grid layout shows all metrics at once
- Synchronized tooltips help correlate changes
- Date filters let you focus on recent activity

## Accessibility

Reports meet WCAG 2.1 AA standards:

- Color contrast for readability
- Keyboard navigation support
- Screen reader labels for charts
- Focus indicators on interactive elements

## Troubleshooting

### Report Shows No Data

**Problem**: Empty charts despite successful metric collection

**Solutions**:

- Verify metrics were collected successfully in workflow logs
- Check storage backend is working (database accessible)
- Ensure `track-metrics` action completed without errors
- Download database artifact and verify it contains data

### Charts Not Interactive

**Problem**: Tooltips, zoom, or filters don't work

**Solutions**:

- Ensure JavaScript is enabled in browser
- Check browser console for errors
- Verify CDN resources loaded (Chart.js, chartjs-plugin-zoom)
- Try a different browser (Chrome, Firefox, Safari, Edge)

### Preview Toggle Doesn't Appear

**Problem**: Expected preview toggle but not visible

**Possible reasons**:

- You have 10+ builds (toggle only shows for <10 builds)
- Report was generated with older version
- JavaScript error prevented toggle from rendering

**Solution**: Check build count in report header. If <10, check browser console for errors.

### Exported Charts Are Blank

**Problem**: Downloaded PNG files are empty or corrupted

**Solutions**:

- Wait for chart to fully render before exporting
- Disable browser extensions that might interfere
- Try exporting from a different chart
- Check browser console for export errors

### Dark Mode Not Working

**Problem**: Report doesn't use dark mode

**Solution**: Dark mode follows system preference. Check your OS dark mode setting. Some browsers may need to be restarted after changing system preferences.

## Related Resources

- [Metrics Guide](metrics.md) - Configure metrics to track
- [Getting Started](../getting-started.md) - Initial setup
- [Storage Guide](storage.md) - Where reports are stored
