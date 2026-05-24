import type { JSX } from "preact";

const CHIP_BASE = "uent-mono uent-chip px-2.5 py-1 text-xs rounded";

export function DateRangeFilter(): JSX.Element {
  return (
    <div class="flex items-center gap-3 flex-wrap">
      <span class="uent-toolbar-label uent-mono text-[10px]">range</span>
      <div class="flex gap-1 flex-wrap">
        <button type="button" data-filter="all" className={`${CHIP_BASE} uent-chip-active`}>
          all
        </button>
        <button type="button" data-filter="7d" className={CHIP_BASE}>
          7d
        </button>
        <button type="button" data-filter="30d" className={CHIP_BASE}>
          30d
        </button>
        <button type="button" data-filter="90d" className={CHIP_BASE}>
          90d
        </button>
        <button
          type="button"
          data-filter="custom"
          id="custom-filter-btn"
          className={`${CHIP_BASE} relative whitespace-nowrap`}
        >
          <span id="custom-filter-label">custom…</span>
        </button>
      </div>
    </div>
  );
}
