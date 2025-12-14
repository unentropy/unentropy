(function () {
  function initializeDateFilters(chartsData, chartInstances) {
    // State
    var state = {
      activeFilter: "all",
      customRange: { from: null, to: null },
    };

    // Elements
    var customBtn = document.getElementById("custom-filter-btn");
    var customLabel = document.getElementById("custom-filter-label");
    var popover = document.getElementById("custom-date-popover");
    var dateFromInput = document.getElementById("date-from");
    var dateToInput = document.getElementById("date-to");
    var clearBtn = document.getElementById("clear-custom-date");
    var dateError = document.getElementById("date-error");
    var filterButtons = document.querySelectorAll("[data-filter]");

    // Helper: Update button states
    function updateButtonStates(active) {
      filterButtons.forEach(function (btn) {
        var isActive = btn.dataset.filter === active;
        if (isActive) {
          btn.classList.remove(
            "bg-gray-200",
            "dark:bg-gray-700",
            "text-gray-700",
            "dark:text-gray-300"
          );
          btn.classList.add("bg-blue-600", "text-white");
        } else {
          btn.classList.remove("bg-blue-600", "text-white");
          btn.classList.add(
            "bg-gray-200",
            "dark:bg-gray-700",
            "text-gray-700",
            "dark:text-gray-300"
          );
        }
      });
    }

    // Helper: Update custom button label
    function updateCustomButtonLabel() {
      if (state.activeFilter === "custom" && state.customRange.from && state.customRange.to) {
        customLabel.textContent = state.customRange.from + " – " + state.customRange.to;
      } else {
        customLabel.textContent = "Custom";
      }
    }

    // Helper: Validate date range
    function validateDateRange() {
      if (!dateFromInput.value || !dateToInput.value) {
        dateError.classList.add("hidden");
        return true;
      }

      var from = new Date(dateFromInput.value);
      var to = new Date(dateToInput.value);

      if (from > to) {
        dateError.classList.remove("hidden");
        return false;
      }

      dateError.classList.add("hidden");
      return true;
    }

    // Helper: Clear zoom state from crosshair plugin
    function clearZoomState() {
      var charts = Object.values(chartInstances);
      charts.forEach(function (chart) {
        if (chart.crosshair && chart.crosshair.originalXRange) {
          chart.crosshair.originalXRange = {};
        }
      });
    }

    // Helper: Check if date range is empty (no visible data)
    function checkEmptyRange(minDate, maxDate) {
      if (!chartsData.timeline || chartsData.timeline.length === 0) {
        return true;
      }

      var hasVisibleData = chartsData.timeline.some(function (timestamp) {
        var date = new Date(timestamp);
        var min = new Date(minDate);
        var max = new Date(maxDate);
        return date >= min && date <= max;
      });

      return !hasVisibleData;
    }

    // Helper: Show "No data in selected range" overlay on charts
    function showEmptyRangeOverlay() {
      var chartContainers = document.querySelectorAll(".chart-container");
      chartContainers.forEach(function (container) {
        var existingOverlay = container.querySelector(".empty-range-overlay");
        if (existingOverlay) return;

        var overlay = document.createElement("div");
        overlay.className =
          "empty-range-overlay absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900 bg-opacity-90 dark:bg-opacity-90 z-10";
        overlay.innerHTML =
          '<p class="text-gray-500 dark:text-gray-400 text-sm">No data in selected range</p>';
        container.style.position = "relative";
        container.appendChild(overlay);
      });
    }

    // Helper: Hide empty range overlay
    function hideEmptyRangeOverlay() {
      var overlays = document.querySelectorAll(".empty-range-overlay");
      overlays.forEach(function (overlay) {
        overlay.remove();
      });
    }

    // Apply preset date filter (7d/30d/90d/All)
    function applyDateFilter(filterType) {
      var charts = Object.values(chartInstances);

      if (filterType === "all") {
        // Clear all filters
        charts.forEach(function (chart) {
          delete chart.options.scales.x.min;
          delete chart.options.scales.x.max;
          chart.update("none");
        });
        hideEmptyRangeOverlay();
      } else {
        // Calculate date range relative to most recent build
        var filterDays = { "7d": 7, "30d": 30, "90d": 90 };
        var days = filterDays[filterType];
        var maxDate =
          chartsData.timeline[chartsData.timeline.length - 1] || new Date().toISOString();
        var minDate = new Date(
          new Date(maxDate).getTime() - days * 24 * 60 * 60 * 1000
        ).toISOString();

        // Apply filter to all charts
        charts.forEach(function (chart) {
          chart.options.scales.x.min = minDate;
          chart.options.scales.x.max = maxDate;
          chart.update("none");
        });

        // Check for empty range
        if (checkEmptyRange(minDate, maxDate)) {
          showEmptyRangeOverlay();
        } else {
          hideEmptyRangeOverlay();
        }
      }
    }

    // Apply custom date range
    function applyCustomRange() {
      if (!validateDateRange()) return;

      if (dateFromInput.value && dateToInput.value) {
        state.customRange.from = dateFromInput.value;
        state.customRange.to = dateToInput.value;
        state.activeFilter = "custom";

        updateButtonStates("custom");
        updateCustomButtonLabel();

        // Convert YYYY-MM-DD to ISO timestamps
        var minDate = new Date(state.customRange.from).toISOString();
        var maxDate = new Date(state.customRange.to + "T23:59:59").toISOString();

        // Apply to charts
        var charts = Object.values(chartInstances);
        charts.forEach(function (chart) {
          chart.options.scales.x.min = minDate;
          chart.options.scales.x.max = maxDate;
          chart.update("none");
        });

        // Check for empty range
        if (checkEmptyRange(minDate, maxDate)) {
          showEmptyRangeOverlay();
        } else {
          hideEmptyRangeOverlay();
        }

        // Close popover
        popover.classList.add("hidden");
      }
    }

    // Set min/max constraints on date inputs
    function setDateConstraints() {
      if (chartsData.availableDateRange) {
        dateFromInput.min = chartsData.availableDateRange.min;
        dateFromInput.max = chartsData.availableDateRange.max;
        dateToInput.min = chartsData.availableDateRange.min;
        dateToInput.max = chartsData.availableDateRange.max;
      }
    }

    // Smart default date range when opening popover
    function setDefaultDateRange() {
      if (state.activeFilter === "custom" && state.customRange.from) {
        // Show current custom range
        dateFromInput.value = state.customRange.from;
        dateToInput.value = state.customRange.to;
      } else if (state.activeFilter !== "all" && chartsData.timeline.length > 0) {
        // Show current preset range
        var filterDays = { "7d": 7, "30d": 30, "90d": 90 };
        var days = filterDays[state.activeFilter];
        var maxDate = chartsData.timeline[chartsData.timeline.length - 1];
        var minDate = new Date(new Date(maxDate).getTime() - days * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];
        var maxDateFormatted = maxDate.split("T")[0];

        dateFromInput.value = minDate;
        dateToInput.value = maxDateFormatted;
      } else if (chartsData.availableDateRange) {
        // Show full available range
        dateFromInput.value = chartsData.availableDateRange.min;
        dateToInput.value = chartsData.availableDateRange.max;
      }
    }

    // Event: Preset filter buttons (7d, 30d, 90d, All, Custom)
    filterButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var filter = this.dataset.filter;

        if (filter === "custom") {
          // Toggle popover
          var isHidden = popover.classList.contains("hidden");
          popover.classList.toggle("hidden");

          if (isHidden) {
            setDefaultDateRange();
            setDateConstraints();
          }
        } else {
          // Preset filter clicked
          state.activeFilter = filter;
          state.customRange = { from: null, to: null };

          updateButtonStates(filter);
          updateCustomButtonLabel();

          // Close popover if open
          popover.classList.add("hidden");

          // Clear zoom state
          clearZoomState();

          // Apply preset filter
          applyDateFilter(filter);
        }
      });
    });

    // Event: Date input changes - apply immediately
    dateFromInput.addEventListener("change", applyCustomRange);
    dateToInput.addEventListener("change", applyCustomRange);

    // Event: Clear button
    clearBtn.addEventListener("click", function () {
      state.customRange = { from: null, to: null };
      state.activeFilter = "all";
      dateFromInput.value = "";
      dateToInput.value = "";
      dateError.classList.add("hidden");

      updateButtonStates("all");
      updateCustomButtonLabel();
      popover.classList.add("hidden");

      // Clear zoom and filters
      clearZoomState();
      applyDateFilter("all");
    });

    // Event: Close popover when clicking outside
    document.addEventListener("click", function (event) {
      var isClickInsidePopover = popover.contains(event.target);
      var isClickOnCustomBtn = customBtn.contains(event.target);

      if (!isClickInsidePopover && !isClickOnCustomBtn && !popover.classList.contains("hidden")) {
        popover.classList.add("hidden");
      }
    });

    // Event: Listen for zoom-sync from crosshair plugin (Sprint 2 integration)
    window.addEventListener("zoom-sync", function (event) {
      if (!event.start || !event.end) return;

      // Convert timestamps to YYYY-MM-DD
      var fromDate = new Date(event.start).toISOString().split("T")[0];
      var toDate = new Date(event.end).toISOString().split("T")[0];

      // Update state
      state.activeFilter = "custom";
      state.customRange = { from: fromDate, to: toDate };

      // Update UI
      updateButtonStates("custom");
      updateCustomButtonLabel();

      // Close popover if open
      popover.classList.add("hidden");
    });

    // Initialize
    updateButtonStates("all");
    updateCustomButtonLabel();
  }

  // Expose globally
  window.initializeDateFilters = initializeDateFilters;
})();
