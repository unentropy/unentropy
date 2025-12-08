/* eslint-disable @typescript-eslint/no-unused-vars */
// Unified Chart.js plugin for synchronized crosshair line and tooltips
// Based on chartjs-plugin-crosshair by AbelHeinsbroek
//
// Features:
// - Draws a vertical crosshair line on hover
// - Synchronizes line position and tooltips across all charts in the same sync group
// - Snaps to nearest data point when enabled
// - Configurable line appearance

var crosshairPlugin = (function () {
  var defaultOptions = {
    enabled: true,
    line: {
      color: "rgba(59, 130, 246, 0.5)",
      width: 1,
      dashPattern: [],
    },
    sync: {
      enabled: true,
      group: 1,
      suppressTooltips: false,
    },
    snap: {
      enabled: true,
    },
  };

  function isPluginEnabled(chart) {
    var pluginOpts = chart.options.plugins.crosshair || {};
    if (pluginOpts.enabled !== undefined) {
      return pluginOpts.enabled;
    }
    return defaultOptions.enabled;
  }

  function getOption(chart, category, name) {
    var pluginOpts = chart.options.plugins.crosshair || {};
    var categoryOpts = pluginOpts[category];
    if (categoryOpts && categoryOpts[name] !== undefined) {
      return categoryOpts[name];
    }
    return defaultOptions[category][name];
  }

  function getXScale(chart) {
    if (!chart.data.datasets.length) return null;
    var meta = chart.getDatasetMeta(0);
    return meta ? chart.scales[meta.xAxisID] : null;
  }

  function getYScale(chart) {
    if (!chart.data.datasets.length) return null;
    var meta = chart.getDatasetMeta(0);
    return meta ? chart.scales[meta.yAxisID] : null;
  }

  function handleSyncEvent(chart, e) {
    if (!isPluginEnabled(chart)) {
      return;
    }

    var syncGroup = getOption(chart, "sync", "group");

    // Stop if the sync event was fired from this chart
    if (e.chartId === chart.id) {
      return;
    }

    // Stop if the sync event was fired from a different group
    if (e.syncGroup !== syncGroup) {
      return;
    }

    if (e.original.type === "mouseout") {
      chart.crosshair.x = null;
      chart.setActiveElements([]);
      chart.tooltip.setActiveElements([], { x: 0, y: 0 });
      chart.update("none");
      return;
    }

    // Use data index for syncing tooltips (more reliable than x value for different scales)
    var dataIndex = e.dataIndex;
    if (dataIndex === undefined || dataIndex < 0) {
      return;
    }

    // Build active elements for this chart at the same data index
    var activeElements = [];
    for (var i = 0; i < chart.data.datasets.length; i++) {
      if (dataIndex < chart.data.datasets[i].data.length) {
        activeElements.push({ datasetIndex: i, index: dataIndex });
      }
    }

    if (activeElements.length > 0) {
      // Get pixel position for crosshair line
      var meta = chart.getDatasetMeta(0);
      if (meta.data[dataIndex]) {
        chart.crosshair.x = meta.data[dataIndex].x;
      }

      chart.setActiveElements(activeElements);

      var suppressTooltips = getOption(chart, "sync", "suppressTooltips");
      if (!suppressTooltips) {
        var point = meta.data[dataIndex];
        var tooltipPoint = point ? { x: point.x, y: point.y } : { x: 0, y: 0 };
        chart.tooltip.setActiveElements(activeElements, tooltipPoint);
      }
    }

    chart.update("none");
  }

  function handleSyncClear(chart, e) {
    if (!isPluginEnabled(chart)) {
      return;
    }

    var syncGroup = getOption(chart, "sync", "group");

    if (e.chartId === chart.id) {
      return;
    }

    if (e.syncGroup !== syncGroup) {
      return;
    }

    chart.crosshair.x = null;
    chart.setActiveElements([]);
    chart.tooltip.setActiveElements([], { x: 0, y: 0 });
    chart.update("none");
  }

  return {
    id: "crosshair",

    defaults: defaultOptions,

    afterInit: function (chart) {
      chart.crosshair = {
        x: null,
      };

      if (!isPluginEnabled(chart)) {
        return;
      }

      var syncEnabled = getOption(chart, "sync", "enabled");
      if (syncEnabled) {
        chart.crosshair.syncEventHandler = function (e) {
          handleSyncEvent(chart, e);
        };
        chart.crosshair.syncClearHandler = function (e) {
          handleSyncClear(chart, e);
        };

        window.addEventListener("crosshair-sync", chart.crosshair.syncEventHandler);
        window.addEventListener("crosshair-clear", chart.crosshair.syncClearHandler);
      }
    },

    beforeDestroy: function (chart) {
      if (!isPluginEnabled(chart)) {
        return;
      }

      var syncEnabled = getOption(chart, "sync", "enabled");
      if (syncEnabled && chart.crosshair) {
        window.removeEventListener("crosshair-sync", chart.crosshair.syncEventHandler);
        window.removeEventListener("crosshair-clear", chart.crosshair.syncClearHandler);
      }
    },

    afterEvent: function (chart, args) {
      if (!isPluginEnabled(chart)) {
        return;
      }

      var xScale = getXScale(chart);
      if (!xScale) {
        return;
      }

      var e = args.event;
      var syncEnabled = getOption(chart, "sync", "enabled");
      var syncGroup = getOption(chart, "sync", "group");

      if (e.type === "mouseout") {
        chart.crosshair.x = null;

        // Broadcast clear to synced charts
        if (syncEnabled) {
          var clearEvent = new CustomEvent("crosshair-clear");
          clearEvent.chartId = chart.id;
          clearEvent.syncGroup = syncGroup;
          window.dispatchEvent(clearEvent);
        }
        return;
      }

      // Only handle events inside the chart area
      if (!args.inChartArea) {
        return;
      }

      chart.crosshair.x = e.x;

      // Fire sync event for all other linked charts
      if (syncEnabled) {
        // Get the data index at this position for reliable cross-chart syncing
        var elements = chart.getElementsAtEventForMode(e, "index", { intersect: false }, true);
        var dataIndex = elements.length > 0 ? elements[0].index : -1;

        var syncEvent = new CustomEvent("crosshair-sync");
        syncEvent.chartId = chart.id;
        syncEvent.syncGroup = syncGroup;
        syncEvent.original = e;
        syncEvent.xValue = xScale.getValueForPixel(e.x);
        syncEvent.dataIndex = dataIndex;
        window.dispatchEvent(syncEvent);
      }
    },

    afterDatasetsDraw: function (chart) {
      if (!isPluginEnabled(chart)) {
        return;
      }

      if (chart.crosshair.x === null) {
        return;
      }

      var xScale = getXScale(chart);
      var yScale = getYScale(chart);
      if (!xScale || !yScale) {
        return;
      }

      var ctx = chart.ctx;
      var lineX = chart.crosshair.x;

      // Snap to nearest data point if enabled
      var snapEnabled = getOption(chart, "snap", "enabled");
      if (snapEnabled && chart._active && chart._active.length) {
        lineX = chart._active[0].element.x;
      }

      // Clamp to chart area
      if (lineX < chart.chartArea.left || lineX > chart.chartArea.right) {
        return;
      }

      var lineColor = getOption(chart, "line", "color");
      var lineWidth = getOption(chart, "line", "width");
      var dashPattern = getOption(chart, "line", "dashPattern");

      ctx.save();
      ctx.beginPath();
      ctx.setLineDash(dashPattern);
      ctx.moveTo(lineX, chart.chartArea.top);
      ctx.lineTo(lineX, chart.chartArea.bottom);
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = lineColor;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    },
  };
})();
