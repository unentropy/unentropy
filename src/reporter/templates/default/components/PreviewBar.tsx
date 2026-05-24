import type { JSX } from "preact";

interface PreviewBarProps {
  visible: boolean;
}

export function PreviewBar({ visible }: PreviewBarProps): JSX.Element | null {
  if (!visible) return null;

  return (
    <div class="uent-preview-banner no-print">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div class="flex items-center gap-2">
          <svg
            class="uent-preview-icon w-4 h-4 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clip-rule="evenodd"
            />
          </svg>
          <div class="text-xs">
            <span class="font-medium" style="color: var(--text)">
              Limited data available.
            </span>{" "}
            Preview data is displayed to help visualize trends.
          </div>
        </div>

        <label class="inline-flex items-center cursor-pointer flex-shrink-0">
          <input type="checkbox" id="preview-toggle" class="sr-only peer" role="switch" checked />
          <div class="uent-toggle-track uent-toggle-on relative w-10 h-5 rounded-full peer transition-colors after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-transform peer-checked:after:translate-x-full"></div>
          <span class="ms-2 uent-mono text-xs" style="color: var(--text)">
            show preview
          </span>
        </label>
      </div>
    </div>
  );
}
