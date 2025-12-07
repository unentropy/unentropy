import type { JSX } from "preact";

interface PreviewBarProps {
  visible: boolean;
}

export function PreviewBar({ visible }: PreviewBarProps): JSX.Element | null {
  if (!visible) {
    return null;
  }

  return (
    <div class="bg-blue-50 dark:bg-blue-900 border-b border-blue-200 dark:border-blue-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div class="flex items-start gap-3">
            <svg
              class="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clip-rule="evenodd"
              />
            </svg>
            <div class="text-sm text-blue-800 dark:text-blue-200">
              <span class="font-medium">Limited data available.</span> Preview data is displayed to
              help visualize trends. Toggle to view actual sparse data.
            </div>
          </div>

          <label class="inline-flex items-center cursor-pointer flex-shrink-0">
            <input type="checkbox" id="preview-toggle" class="sr-only peer" role="switch" checked />
            <div
              class={[
                "relative w-11 h-6 bg-gray-200 dark:bg-gray-700",
                "rounded-full peer peer-checked:bg-blue-600",
                "peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800",
                "after:content-[''] after:absolute after:top-[2px] after:start-[2px]",
                "after:bg-white after:border after:rounded-full",
                "after:h-5 after:w-5 after:transition-all",
                "peer-checked:after:translate-x-full",
              ].join(" ")}
            ></div>
            <span class="ms-3 text-sm font-medium text-blue-900 dark:text-blue-100">
              Show preview data
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
