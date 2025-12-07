/* eslint-disable @typescript-eslint/no-unused-vars */
// Chart.js plugin for synchronized tooltip display across multiple charts
// Triggers when any chart is hovered - shows tooltips on all charts at same index

var tooltipSyncPlugin = {
  id: "tooltipSync",

  afterEvent: function (chart, args) {
    // Only process mouse events
    if (!args.event || !args.event.native) return;

    var event = args.event.native;

    // Handle mousemove and mouseover events
    if (event.type === "mousemove" || event.type === "mouseover") {
      if (args.inChartArea) {
        try {
          // Get elements at current mouse position using index mode
          var elements = chart.getElementsAtEventForMode(
            args.event,
            "index",
            { intersect: false },
            true
          );

          if (elements && elements.length > 0) {
            // Get the data index of the hovered element
            var dataIndex = elements[0].index;
            // Sync tooltips across all charts
            if (typeof tooltipSync !== "undefined") {
              tooltipSync.syncTooltips(dataIndex);
            }
          }
        } catch (e) {
          // Ignore errors
        }
      }
    } else if (event.type === "mouseout" || event.type === "mouseleave") {
      // Clear all tooltips when leaving chart area
      if (typeof tooltipSync !== "undefined") {
        tooltipSync.clearAllTooltips();
      }
    }
  },
};
