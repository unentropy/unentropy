import type { JSX } from "preact";

export function CustomDatePickerPopover(): JSX.Element {
  return (
    <div
      id="custom-date-popover"
      class="uent-popover hidden absolute z-50 mt-1 rounded p-4 min-w-[320px] no-print"
      style="right: 0;"
    >
      <div class="space-y-4 uent-mono">
        <div>
          <label for="date-from" class="block text-xs uent-toolbar-label mb-1">
            From
          </label>
          <input
            type="date"
            id="date-from"
            class="uent-input w-full px-3 py-2 rounded text-sm"
            aria-label="From date"
          />
        </div>

        <div>
          <label for="date-to" class="block text-xs uent-toolbar-label mb-1">
            To
          </label>
          <input
            type="date"
            id="date-to"
            class="uent-input w-full px-3 py-2 rounded text-sm"
            aria-label="To date"
          />
        </div>

        <div id="date-error" class="hidden text-sm uent-trend-down">
          Invalid date range: "From" date must be before or equal to "To" date.
        </div>

        <div class="pt-2">
          <button
            type="button"
            id="clear-custom-date"
            class="uent-mono uent-chip w-full px-3 py-2 text-sm rounded"
            style="background: var(--surface-card)"
          >
            clear
          </button>
        </div>
      </div>
    </div>
  );
}
