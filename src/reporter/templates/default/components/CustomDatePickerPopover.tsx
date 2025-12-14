import type { JSX } from "preact";

export function CustomDatePickerPopover(): JSX.Element {
  return (
    <div
      id="custom-date-popover"
      class="hidden absolute z-50 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 min-w-[320px]"
      style="right: 0;"
    >
      <div class="space-y-4">
        <div>
          <label
            for="date-from"
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            From Date
          </label>
          <input
            type="date"
            id="date-from"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            aria-label="From date"
          />
        </div>

        <div>
          <label
            for="date-to"
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            To Date
          </label>
          <input
            type="date"
            id="date-to"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            aria-label="To date"
          />
        </div>

        <div id="date-error" class="hidden text-sm text-red-600 dark:text-red-400">
          Invalid date range: "From" date must be before or equal to "To" date.
        </div>

        <div class="pt-2">
          <button
            type="button"
            id="clear-custom-date"
            class="w-full px-4 py-2 text-sm font-medium rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
