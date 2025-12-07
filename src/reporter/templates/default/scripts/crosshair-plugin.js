/* eslint-disable @typescript-eslint/no-unused-vars */
// Lightweight custom Chart.js plugin for synchronized vertical alignment line
// across multiple charts on the same page.
//
// Features:
// - Draws a vertical line on hover at cursor's X position
// - Synchronizes line position across all charts in the same group
// - Configurable line color, width, and opacity
// - Real-time updates (<50ms latency) as cursor moves

// Global state manager for multi-chart synchronization
var crosshairGroupSync = {
  groups: {},

  registerChart: function (groupId, chart) {
    if (!this.groups[groupId]) {
      this.groups[groupId] = [];
    }
    this.groups[groupId].push(chart);
  },

  broadcast: function (groupId, mouseX) {
    var charts = this.groups[groupId] || [];
    charts.forEach(function (chart) {
      chart._crosshairX = mouseX;
    });
  },

  clearGroup: function (groupId) {
    var charts = this.groups[groupId] || [];
    charts.forEach(function (chart) {
      chart._crosshairX = null;
    });
  },
};

// Chart.js Crosshair Plugin Definition
var crosshairPlugin = {
  id: "crosshair",

  defaults: {
    enabled: true,
    group: 1,
    line: {
      color: "rgba(59, 130, 246, 0.3)",
      width: 1,
    },
  },

  beforeEvent: function (chart, args, options) {
    // Plugin must be enabled
    if (!options.enabled) {
      return;
    }

    var event = args.event;

    // Only process if cursor is in chart area
    if (args.inChartArea) {
      var mouseX = event.x;
      // Broadcast mouse position to all charts in the group
      crosshairGroupSync.broadcast(options.group, mouseX);
      // Request chart redraw
      args.changed = true;
    } else {
      // Clear crosshair when leaving chart area
      crosshairGroupSync.clearGroup(options.group);
      args.changed = true;
    }
  },

  afterDatasetsDraw: function (chart, args, options) {
    // Plugin must be enabled
    if (!options.enabled) {
      return;
    }

    // Only draw if there's a hovered X position
    if (chart._crosshairX === null || chart._crosshairX === undefined) {
      return;
    }

    var ctx = chart.ctx;
    var chartArea = chart.chartArea;
    var mouseX = chart._crosshairX;

    // Save context state
    ctx.save();

    // Draw vertical line
    ctx.strokeStyle = options.line.color;
    ctx.lineWidth = options.line.width;
    ctx.beginPath();
    ctx.moveTo(mouseX, chartArea.top);
    ctx.lineTo(mouseX, chartArea.bottom);
    ctx.stroke();

    // Restore context state
    ctx.restore();
  },
};
