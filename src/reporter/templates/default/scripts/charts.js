/* eslint-disable @typescript-eslint/no-unused-vars */
// This script is inlined into generated HTML reports and runs in the browser.
// Variables are used by the initializeCharts function called from the data script.

var LINE_STYLE = {
  borderColor: "rgb(59, 130, 246)",
  backgroundColor: "rgba(59, 130, 246, 0.1)",
  tension: 0.4,
  fill: true,
  pointRadius: 4,
  pointHoverRadius: 6,
  spanGaps: false,
};

var BAR_STYLE = {
  backgroundColor: "rgba(59, 130, 246, 0.8)",
  borderColor: "rgb(59, 130, 246)",
  borderWidth: 1,
};

var COMMON_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index", intersect: false },
  plugins: {
    legend: { display: false },
    crosshair: {
      enabled: true,
      sync: {
        enabled: true,
        group: 1,
      },
      line: {
        color: "rgba(59, 130, 246, 0.3)",
        width: 1,
      },
      zoom: {
        enabled: true,
        minDataPoints: 10,
        minZoomRange: 4,
      },
    },
  },
};

/**
 * Format values for chart tooltips based on semantic unit types.
 *
 * NOTE: This function duplicates logic from src/metrics/unit-formatter.ts
 * because this script runs in the browser without module support.
 *
 * IMPORTANT: When updating this function, also update:
 * - src/metrics/unit-formatter.ts (TypeScript server-side version)
 * - src/reporter/templates/default/components/formatUtils.ts (legacy unit parsing)
 *
 * @param {number|null|undefined} value - The numeric value to format
 * @param {string|null} unit - The semantic unit type (percent, integer, bytes, duration, decimal)
 * @returns {string} Formatted value string
 */
function formatChartValue(value, unit) {
  if (value === null || value === undefined) return "N/A";

  if (!unit) {
    return value.toFixed(2);
  }

  // Handle semantic unit types
  if (unit === "percent") {
    return (
      value.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%"
    );
  }

  if (unit === "integer") {
    return Math.round(value).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }

  if (unit === "bytes") {
    var absValue = Math.abs(value);
    var sign = value < 0 ? "-" : "";

    if (absValue < 1024) {
      return sign + Math.round(absValue) + " B";
    }
    if (absValue < 1024 * 1024) {
      var kb = absValue / 1024;
      var decimals = kb % 1 === 0 ? 0 : 1;
      return (
        sign +
        kb.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: 1 }) +
        " KB"
      );
    }
    if (absValue < 1024 * 1024 * 1024) {
      var mb = absValue / (1024 * 1024);
      var decimals = mb % 1 === 0 ? 0 : 1;
      return (
        sign +
        mb.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: 1 }) +
        " MB"
      );
    }
    var gb = absValue / (1024 * 1024 * 1024);
    var decimals = gb % 1 === 0 ? 0 : 1;
    return (
      sign +
      gb.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: 1 }) +
      " GB"
    );
  }

  if (unit === "duration") {
    var absSeconds = Math.abs(value);
    var sign = value < 0 ? "-" : "";

    if (absSeconds < 1) {
      var ms = Math.round(absSeconds * 1000);
      return sign + ms + "ms";
    }
    if (absSeconds < 60) {
      var rounded = Math.round(absSeconds);
      return sign + rounded + "s";
    }
    if (absSeconds < 3600) {
      var minutes = Math.floor(absSeconds / 60);
      var secs = Math.round(absSeconds % 60);
      return sign + minutes + "m " + secs + "s";
    }
    var hours = Math.floor(absSeconds / 3600);
    var mins = Math.round((absSeconds % 3600) / 60);
    return sign + hours + "h " + mins + "m";
  }

  if (unit === "decimal") {
    return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Legacy unit support (e.g., "%", "KB", etc.)
  return value.toFixed(2) + (unit ? unit : "");
}

function createTimeSeriesTooltip(metricName, unit, timeline, metadata) {
  return {
    callbacks: {
      title: function (items) {
        if (!items.length) return "";
        var date = new Date(timeline[items[0].dataIndex]);
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      },
      label: function (ctx) {
        if (ctx.raw === null || ctx.raw === undefined) {
          return "No data recorded for this build";
        }
        var meta = metadata && metadata[ctx.dataIndex];
        var formattedValue = formatChartValue(ctx.raw, unit);
        var label = metricName + ": " + formattedValue;
        if (meta) {
          label += " (Build #" + meta.run + ", " + meta.sha + ")";
        }
        return label;
      },
    },
  };
}

function buildLineChart(chart, timeline, metadata) {
  return {
    type: "line",
    data: {
      labels: timeline,
      datasets: [
        {
          label: chart.name,
          data: chart.values,
          borderColor: LINE_STYLE.borderColor,
          backgroundColor: LINE_STYLE.backgroundColor,
          tension: LINE_STYLE.tension,
          fill: LINE_STYLE.fill,
          pointRadius: LINE_STYLE.pointRadius,
          pointHoverRadius: LINE_STYLE.pointHoverRadius,
          spanGaps: LINE_STYLE.spanGaps,
        },
      ],
    },
    options: {
      responsive: COMMON_OPTIONS.responsive,
      maintainAspectRatio: COMMON_OPTIONS.maintainAspectRatio,
      interaction: COMMON_OPTIONS.interaction,
      plugins: {
        legend: COMMON_OPTIONS.plugins.legend,
        tooltip: createTimeSeriesTooltip(chart.name, chart.unit, timeline, metadata),
        crosshair: COMMON_OPTIONS.plugins.crosshair,
      },
      scales: {
        x: {
          type: "time",
          time: { unit: "day", displayFormats: { day: "MMM d" } },
          title: { display: true, text: "Build Date" },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: chart.name },
        },
      },
    },
  };
}

function buildBarChart(chart) {
  return {
    type: "bar",
    data: {
      labels: chart.labels,
      datasets: [
        {
          label: "Occurrences",
          data: chart.counts,
          backgroundColor: BAR_STYLE.backgroundColor,
          borderColor: BAR_STYLE.borderColor,
          borderWidth: BAR_STYLE.borderWidth,
        },
      ],
    },
    options: {
      responsive: COMMON_OPTIONS.responsive,
      maintainAspectRatio: COMMON_OPTIONS.maintainAspectRatio,
      interaction: COMMON_OPTIONS.interaction,
      plugins: {
        legend: COMMON_OPTIONS.plugins.legend,
        crosshair: { enabled: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 },
          title: { display: true, text: "Count" },
        },
      },
    },
  };
}

function initializeCharts(
  timeline,
  metadata,
  lineCharts,
  barCharts,
  previewLineCharts,
  previewBarCharts,
  showToggle,
  previewData
) {
  var chartInstances = {};

  // Register crosshair plugin globally with Chart.js
  Chart.register(crosshairPlugin);

  // Render REAL charts
  lineCharts.forEach(function (chart) {
    var ctx = document.getElementById("chart-" + chart.id);
    if (ctx) {
      var chartInstance = new Chart(ctx, buildLineChart(chart, timeline, metadata));
      chartInstances[chart.id] = chartInstance;
    }
  });

  barCharts.forEach(function (chart) {
    var ctx = document.getElementById("chart-" + chart.id);
    if (ctx) {
      var chartInstance = new Chart(ctx, buildBarChart(chart));
      chartInstances[chart.id] = chartInstance;
    }
  });

  // Render PREVIEW charts (if toggle enabled)
  if (showToggle) {
    previewLineCharts.forEach(function (chart, index) {
      var ctx = document.getElementById("chart-" + chart.id);
      if (ctx) {
        var previewTimeline = previewData[index]?.timestamps || timeline;
        var chartInstance = new Chart(ctx, buildLineChart(chart, previewTimeline, null));
        chartInstances[chart.id] = chartInstance;
      }
    });

    previewBarCharts.forEach(function (chart) {
      var ctx = document.getElementById("chart-" + chart.id);
      if (ctx) {
        var chartInstance = new Chart(ctx, buildBarChart(chart));
        chartInstances[chart.id] = chartInstance;
      }
    });
  }

  // Toggle handler - pure CSS visibility toggle
  var toggle = document.getElementById("preview-toggle");
  if (toggle && showToggle) {
    toggle.addEventListener("change", function (e) {
      var showPreview = e.target.checked;

      // Toggle visibility of metric cards
      document.querySelectorAll('[data-view="real"]').forEach(function (el) {
        el.classList.toggle("hidden", showPreview);
        el.setAttribute("aria-hidden", showPreview ? "true" : "false");
      });
      document.querySelectorAll('[data-view="preview"]').forEach(function (el) {
        el.classList.toggle("hidden", !showPreview);
        el.setAttribute("aria-hidden", showPreview ? "false" : "true");
      });
    });
  }

  // Return chart instances for date filter integration
  return chartInstances;
}
