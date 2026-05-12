# Contract: HTML Report Template

**Purpose**: Define the structure, styling, and interactive behavior of generated HTML reports for metric visualization.

**Related Requirements**: FR-013 through FR-025, SC-006, SC-008, SC-009

## Overview

The HTML report is a self-contained, single-file document that displays metric trends with interactive charts. It uses Tailwind CSS for responsive styling and Chart.js for data visualization, both loaded from CDN.

## Template Structure

### Document Layout

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unentropy Metrics Report - {repository_name}</title>
  
  <!-- Tailwind CSS from CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  
  <!-- Chart.js from CDN -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
  
  <!-- Inline custom styles for print and additional theming -->
  <style>
    @media print {
      /* Print-specific styles */
    }
    /* Additional custom styles if needed */
  </style>
</head>
<body class="bg-gray-50 dark:bg-gray-900">
  <!-- Header Section -->
  <!-- Metrics Grid Section -->
  <!-- Footer Section -->
  <!-- Inline JavaScript for Chart Rendering -->
</body>
</html>
```

## Section Specifications

### 1. Header Section

**Purpose**: Display report metadata and context

**Layout**: Full-width header with repository info and report details

```html
<header class="bg-white dark:bg-gray-800 shadow-sm">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          Unentropy Metrics Report
        </h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {repository_name}
        </p>
      </div>
      <div class="mt-4 sm:mt-0 text-sm text-gray-600 dark:text-gray-400">
        <div>Generated: {generation_timestamp}</div>
        <div>Data Range: {first_build_date} - {last_build_date}</div>
        <div>Total Builds: {build_count}</div>
      </div>
    </div>
  </div>
</header>
```

**Required Data**:
- `repository_name`: String (e.g., "username/repo-name")
- `generation_timestamp`: ISO 8601 format (e.g., "2025-10-16T14:30:00Z")
- `first_build_date`: ISO 8601 format
- `last_build_date`: ISO 8601 format
- `build_count`: Integer

### 2. Metrics Grid Section

**Purpose**: Display individual metric cards with charts and statistics

**Layout**: Responsive grid (1 column on mobile, 2 on tablet, 2-3 on desktop)

```html
<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Metric Card (repeat for each metric) -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <!-- Metric Header -->
      <div class="mb-4">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
          {metric_name}
        </h2>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {metric_description}
        </p>
      </div>
      
      <!-- Summary Statistics -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div class="text-center">
          <div class="text-2xl font-bold text-gray-900 dark:text-white">
            {latest_value}
          </div>
          <div class="text-xs text-gray-600 dark:text-gray-400">Latest</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-gray-900 dark:text-white">
            {min_value}
          </div>
          <div class="text-xs text-gray-600 dark:text-gray-400">Min</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-gray-900 dark:text-white">
            {max_value}
          </div>
          <div class="text-xs text-gray-600 dark:text-gray-400">Max</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold {trend_color}">
            {trend_arrow} {trend_percent}%
          </div>
          <div class="text-xs text-gray-600 dark:text-gray-400">Trend</div>
        </div>
      </div>
      
      <!-- Chart Canvas -->
      <div class="relative h-64 sm:h-80">
        <canvas id="chart-{metric_id}"></canvas>
      </div>
      
      <!-- Data Quality Indicators (if sparse data) -->
      {if sparse_data}
      <div class="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm text-yellow-700 dark:text-yellow-200">
              Limited data available ({data_point_count} builds). More data will improve trend accuracy.
            </p>
          </div>
        </div>
      </div>
      {/if}
    </div>
  </div>
  
  <!-- Empty State (if no metrics) -->
  {if no_metrics}
  <div class="text-center py-12">
    <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
    </svg>
    <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">No metrics data</h3>
    <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
      No metrics have been collected yet. Run your CI pipeline to start collecting data.
    </p>
  </div>
  {/if}
</main>
```

**Required Data per Metric**:
- `metric_id`: String (unique identifier for canvas ID)
- `metric_name`: String
- `metric_description`: String (optional)
- `latest_value`: Number or String
- `min_value`: Number
- `max_value`: Number
- `average_value`: Number
- `trend_arrow`: "↑" | "↓" | "→"
- `trend_percent`: Number (absolute value)
- `trend_color`: "text-green-600" | "text-red-600" | "text-gray-600"
- `sparse_data`: Boolean
- `data_point_count`: Integer

### 3. Footer Section

**Purpose**: Branding and version information

```html
<footer class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 mt-8 border-t border-gray-200 dark:border-gray-700">
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600 dark:text-gray-400">
    <div>
      Generated by <span class="font-semibold">Unentropy</span> v{version}
    </div>
    <div class="mt-2 sm:mt-0">
      <a href="https://github.com/unentropy/unentropy" class="hover:text-gray-900 dark:hover:text-white">
        View Documentation
      </a>
    </div>
  </div>
</footer>
```

## Chart Configuration

### Chart.js Setup

**Numeric Metrics** (Line Chart):

```javascript
{
  type: 'line',
  data: {
    labels: [/* ISO timestamps */],
    datasets: [{
      label: '{metric_name}',
      data: [/* numeric values */],
      borderColor: 'rgb(59, 130, 246)', // blue-500
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4,
      fill: true,
      pointRadius: 4,
      pointHoverRadius: 6
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      tooltip: {
        callbacks: {
          title: function(context) {
            // Format timestamp to readable date
            return new Date(context[0].label).toLocaleString();
          },
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y}`;
          },
          afterLabel: function(context) {
            // Add commit SHA if available
            return `Commit: ${context.raw.commitSha?.substring(0, 7) || 'N/A'}`;
          }
        }
      },
      legend: {
        display: false
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day',
          displayFormats: {
            day: 'MMM d'
          }
        },
        title: {
          display: true,
          text: 'Build Date'
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: '{metric_name}'
        }
      }
    }
  }
}
```

**Categorical/Label Metrics** (Bar Chart):

```javascript
{
  type: 'bar',
  data: {
    labels: [/* category names */],
    datasets: [{
      label: 'Occurrences',
      data: [/* counts */],
      backgroundColor: 'rgba(59, 130, 246, 0.8)',
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 1
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.label}: ${context.parsed.y} occurrences`;
          }
        }
      },
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        },
        title: {
          display: true,
          text: 'Count'
        }
      }
    }
  }
}
```

## Responsive Breakpoints

Following Tailwind CSS conventions:

- **Mobile**: `< 640px` (sm) - Single column, stacked stats, compressed header
- **Tablet**: `640px - 1024px` (sm-lg) - 1-2 columns, side-by-side stats
- **Desktop**: `> 1024px` (lg+) - 2 columns, full layout with all details

## Accessibility Requirements

### WCAG 2.1 AA Compliance

1. **Color Contrast**:
   - Text on background: minimum 4.5:1 ratio
   - Chart colors: distinguishable for colorblind users
   - Use blue (#3B82F6), green (#10B981), red (#EF4444) from Tailwind palette

2. **Semantic HTML**:
   - Proper heading hierarchy (h1 → h2)
   - ARIA labels on charts: `<canvas aria-label="Line chart showing {metric_name} over time">`
   - Skip links for keyboard navigation

3. **Keyboard Navigation**:
   - All interactive elements (chart tooltips) accessible via keyboard
   - Focus indicators visible

4. **Screen Reader Support**:
   - Alternative text for data visualizations
   - Summary statistics readable without viewing charts

## Security Considerations

### XSS Prevention

All user-provided data MUST be sanitized before insertion into HTML:

```typescript
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
```

**Sanitize**: metric names, descriptions, repository names, commit messages

### Content Security Policy

Recommended CSP headers (informational, not enforced in MVP):

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net;
style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com;
```

### Subresource Integrity (SRI)

Include SRI hashes for CDN resources:

```html
<script 
  src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"
  integrity="sha384-[HASH]"
  crossorigin="anonymous">
</script>
```

## Print Stylesheet

Support for browser-based PDF export:

```css
@media print {
  body {
    background: white !important;
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

## Dark Mode Support

Automatic based on user's system preference:

```html
<script>
  // Tailwind handles dark mode via 'dark:' classes
  // Uses prefers-color-scheme media query
</script>
```

All colors use Tailwind's dark mode variants:
- `text-gray-900 dark:text-white`
- `bg-white dark:bg-gray-800`
- `border-gray-200 dark:border-gray-700`

## Error States

### Missing Data

When a metric has no data points:

```html
<div class="text-center py-8 text-gray-500 dark:text-gray-400">
  <svg class="mx-auto h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
  </svg>
  <p class="text-sm">No data collected for this metric yet</p>
</div>
```

## Implementation Notes

### Template Rendering

The template system should use string interpolation with the following placeholders:

- `{variable}` - Simple substitution
- `{if condition}...{/if}` - Conditional blocks
- Loop over metrics array to generate multiple cards

### Data Format

Chart data embedded as JSON in script tag:

```html
<script>
  const metricsData = {
    metrics: [
      {
        id: "test-coverage",
        name: "Test Coverage",
        type: "numeric",
        description: "Percentage of code covered by tests",
        values: [
          { timestamp: "2025-10-01T12:00:00Z", value: 85.2, commitSha: "abc123" },
          { timestamp: "2025-10-02T12:00:00Z", value: 86.1, commitSha: "def456" }
        ],
        stats: {
          latest: 86.1,
          min: 85.2,
          max: 86.1,
          average: 85.65,
          trend: { direction: "up", percent: 1.1 }
        },
        sparse: false
      }
    ],
    metadata: {
      repository: "username/repo",
      generatedAt: "2025-10-16T14:30:00Z",
      buildCount: 45,
      dateRange: {
        start: "2025-09-01T00:00:00Z",
        end: "2025-10-16T12:00:00Z"
      }
    }
  };
  
  // Render charts using Chart.js
  metricsData.metrics.forEach(metric => {
    renderChart(metric);
  });
</script>
```

## Validation Checklist

- [ ] Renders correctly on mobile (320px width)
- [ ] Renders correctly on tablet (768px width)
- [ ] Renders correctly on desktop (1920px width)
- [ ] All CDN resources load (Chart.js, Tailwind CSS)
- [ ] Charts are interactive (tooltips work on hover)
- [ ] Dark mode toggles correctly
- [ ] Print stylesheet produces readable PDF
- [ ] No XSS vulnerabilities with malicious metric names
- [ ] WCAG 2.1 AA color contrast requirements met
- [ ] Keyboard navigation works for all interactive elements
- [ ] Screen readers can access all data
- [ ] Empty state displays when no metrics exist
- [ ] Sparse data warnings appear when appropriate
- [ ] SRI hashes included for CDN resources
