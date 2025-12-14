import type { JSX } from "preact";

export function DateRangeFilter(): JSX.Element {
  return (
    <div class="flex items-center gap-2 flex-wrap">
      <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Date Range:</span>
      <div class="flex gap-2 flex-wrap">
        <button
          type="button"
          data-filter="all"
          className="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          All
        </button>
        <button
          type="button"
          data-filter="7d"
          className="px-3 py-1.5 text-sm font-medium rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          7 days
        </button>
        <button
          type="button"
          data-filter="30d"
          className="px-3 py-1.5 text-sm font-medium rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          30 days
        </button>
        <button
          type="button"
          data-filter="90d"
          className="px-3 py-1.5 text-sm font-medium rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          90 days
        </button>
        <button
          type="button"
          data-filter="custom"
          id="custom-filter-btn"
          className="px-3 py-1.5 text-sm font-medium rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors relative whitespace-nowrap"
        >
          <span id="custom-filter-label">Custom</span>
        </button>
      </div>
    </div>
  );
}
