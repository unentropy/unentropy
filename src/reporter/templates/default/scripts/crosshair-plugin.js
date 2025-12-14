/* eslint-disable @typescript-eslint/no-unused-vars */
// Unified Chart.js plugin for synchronized crosshair line, tooltips, and drag-to-zoom
// Based on https://chartjs-plugin-crosshair.netlify.app/
//
// Features:
// - Draws a vertical crosshair line on hover
// - Synchronizes line position and tooltips across all charts in the same sync group
// - Snaps to nearest data point when enabled
// - Configurable line appearance
// - Drag-to-zoom: click and drag to select a range, then zoom to that range
// - Reset zoom button: appears when zoomed, clicking resets all charts
// - Synchronized zoom: all charts zoom together

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
    zoom: {
      enabled: true,
      zoomboxBackgroundColor: "rgba(59, 130, 246, 0.2)",
      zoomboxBorderColor: "rgba(59, 130, 246, 0.5)",
      minDataPoints: 10,
      minZoomRange: 4,
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

  function countNonNullDataPoints(chart) {
    if (!chart.data.datasets.length) return 0;
    var data = chart.data.datasets[0].data;
    var count = 0;
    for (var item of data) {
      if (item !== null && item !== undefined) {
        count++;
      }
    }
    return count;
  }

  function isZoomEnabled(chart) {
    if (!getOption(chart, "zoom", "enabled")) {
      return false;
    }
    var minDataPoints = getOption(chart, "zoom", "minDataPoints");
    return countNonNullDataPoints(chart) >= minDataPoints;
  }

  function drawZoombox(chart) {
    var ctx = chart.ctx;
    var dragStartX = chart.crosshair.dragStartX;
    var currentX = chart.crosshair.x;

    ctx.save();
    ctx.beginPath();
    ctx.rect(
      dragStartX,
      chart.chartArea.top,
      currentX - dragStartX,
      chart.chartArea.bottom - chart.chartArea.top
    );
    ctx.fillStyle = getOption(chart, "zoom", "zoomboxBackgroundColor");
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = getOption(chart, "zoom", "zoomboxBorderColor");
    ctx.stroke();
    ctx.closePath();
    ctx.restore();
  }

  function doZoom(chart, start, end, broadcast) {
    if (start > end) {
      var tmp = start;
      start = end;
      end = tmp;
    }

    var xScale = getXScale(chart);
    if (!xScale) return;

    var minZoomRange = getOption(chart, "zoom", "minZoomRange");
    var dataLength = chart.data.datasets[0]?.data.length || 0;
    var startIndex = Math.max(
      0,
      Math.round(((start - xScale.min) / (xScale.max - xScale.min)) * dataLength)
    );
    var endIndex = Math.min(
      dataLength,
      Math.round(((end - xScale.min) / (xScale.max - xScale.min)) * dataLength)
    );

    if (endIndex - startIndex < minZoomRange) {
      return;
    }

    if (chart.crosshair.originalXRange.min === undefined) {
      chart.crosshair.originalXRange.min = xScale.min;
      chart.crosshair.originalXRange.max = xScale.max;
    }

    chart.options.scales.x.min = start;
    chart.options.scales.x.max = end;

    chart.crosshair.ignoreNextEvents = 2;
    chart.update("none");

    if (broadcast !== false) {
      var syncEnabled = getOption(chart, "sync", "enabled");
      var syncGroup = getOption(chart, "sync", "group");

      if (syncEnabled) {
        var event = new CustomEvent("zoom-sync");
        event.chartId = chart.id;
        event.syncGroup = syncGroup;
        event.start = start;
        event.end = end;
        window.dispatchEvent(event);
      }
    }
  }

  function handleZoomSync(chart, e) {
    var syncGroup = getOption(chart, "sync", "group");

    if (e.chartId === chart.id) return;
    if (e.syncGroup !== syncGroup) return;
    if (!isZoomEnabled(chart)) return;

    doZoom(chart, e.start, e.end, false);
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
        dragStarted: false,
        dragStartX: null,
        originalXRange: {},
        button: null,
        ignoreNextEvents: 0,
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
        chart.crosshair.zoomSyncHandler = function (e) {
          handleZoomSync(chart, e);
        };

        window.addEventListener("crosshair-sync", chart.crosshair.syncEventHandler);
        window.addEventListener("crosshair-clear", chart.crosshair.syncClearHandler);
        window.addEventListener("zoom-sync", chart.crosshair.zoomSyncHandler);
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
        window.removeEventListener("zoom-sync", chart.crosshair.zoomSyncHandler);
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

      if (chart.crosshair.ignoreNextEvents > 0) {
        chart.crosshair.ignoreNextEvents -= 1;
        return;
      }

      var buttons = e.native.buttons === undefined ? e.native.which : e.native.buttons;
      if (e.native.type === "mouseup") {
        buttons = 0;
      }

      if (e.type === "mouseout") {
        chart.crosshair.x = null;
        chart.crosshair.dragStarted = false;

        if (syncEnabled) {
          var clearEvent = new CustomEvent("crosshair-clear");
          clearEvent.chartId = chart.id;
          clearEvent.syncGroup = syncGroup;
          window.dispatchEvent(clearEvent);
        }
        return;
      }

      if (!args.inChartArea) {
        chart.crosshair.dragStarted = false;
        return;
      }

      var zoomEnabled = isZoomEnabled(chart);

      if (buttons === 1 && !chart.crosshair.dragStarted && zoomEnabled) {
        chart.crosshair.dragStartX = e.x;
        chart.crosshair.dragStarted = true;
      }

      if (chart.crosshair.dragStarted && buttons === 0) {
        chart.crosshair.dragStarted = false;

        var dragDistance = Math.abs(chart.crosshair.dragStartX - e.x);
        if (dragDistance > 5) {
          var start = xScale.getValueForPixel(chart.crosshair.dragStartX);
          var end = xScale.getValueForPixel(e.x);
          doZoom(chart, start, end, true);
        }
        chart.update("none");
        return;
      }

      chart.crosshair.x = e.x;

      if (!chart.crosshair.dragStarted && syncEnabled) {
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

      if (chart.crosshair.dragStarted) {
        drawZoombox(chart);
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

      var snapEnabled = getOption(chart, "snap", "enabled");
      if (snapEnabled && chart._active && chart._active.length) {
        lineX = chart._active[0].element.x;
      }

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

    beforeTooltipDraw: function (chart) {
      return !chart.crosshair.dragStarted;
    },
  };
})();
