import type { ReportMetadata } from "../../../types";
import { DateRangeFilter } from "./DateRangeFilter";
import { CustomDatePickerPopover } from "./CustomDatePickerPopover";

interface HeaderProps {
  metadata: ReportMetadata;
  buildCount?: number;
}

function parseRepo(repository: string): { owner: string; name: string } {
  const parts = repository.split("/");
  if (parts.length >= 2) {
    const [owner, ...nameParts] = parts;
    return { owner: owner ?? "", name: nameParts.join("/") };
  }
  return { owner: "", name: repository };
}

export function Header({ metadata, buildCount }: HeaderProps) {
  const { owner, name } = parseRepo(metadata.repository);

  return (
    <>
      <header class="uent-titlebar uent-mono">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
          <a
            href="https://unentropy.dev"
            class="uent-logo-link flex-shrink-0 inline-flex items-center"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Unentropy homepage"
          >
            <svg
              class="uent-logo h-4 w-8"
              viewBox="0 0 120 60"
              fill="currentColor"
              aria-hidden="true"
              style="color: var(--accent)"
            >
              <rect x="0" y="10" width="10" height="10" />
              <rect x="10" y="10" width="10" height="10" />
              <rect x="30" y="10" width="10" height="10" />
              <rect x="40" y="10" width="10" height="10" />
              <rect x="60" y="10" width="10" height="10" />
              <rect x="70" y="10" width="10" height="10" />
              <rect x="100" y="10" width="10" height="10" />
              <rect x="110" y="10" width="10" height="10" />
              <rect x="0" y="20" width="10" height="20" />
              <rect x="10" y="20" width="10" height="20" />
              <rect x="30" y="20" width="10" height="20" />
              <rect x="40" y="20" width="10" height="20" />
              <rect x="60" y="20" width="10" height="20" />
              <rect x="70" y="20" width="10" height="20" />
              <rect x="80" y="20" width="10" height="20" />
              <rect x="90" y="30" width="10" height="10" />
              <rect x="100" y="20" width="10" height="20" />
              <rect x="110" y="20" width="10" height="20" />
              <rect x="0" y="40" width="10" height="10" />
              <rect x="10" y="40" width="10" height="20" />
              <rect x="20" y="40" width="10" height="20" />
              <rect x="30" y="40" width="10" height="20" />
              <rect x="40" y="40" width="10" height="10" />
              <rect x="60" y="40" width="10" height="20" />
              <rect x="70" y="40" width="10" height="20" />
              <rect x="90" y="40" width="10" height="10" />
              <rect x="100" y="40" width="10" height="20" />
              <rect x="110" y="40" width="10" height="20" />
            </svg>
          </a>
          <span class="uent-path text-xs sm:text-sm flex-1 truncate">
            <span class="uent-dim">~/</span>
            {owner ? (
              <>
                {owner}
                <span class="uent-slash">/</span>
              </>
            ) : null}
            {name}
            <span class="uent-dim"> · </span>
            report.html
          </span>
          <button
            type="button"
            id="theme-toggle"
            class="uent-theme-toggle no-print flex-shrink-0"
            data-mode="system"
            aria-label="Toggle theme: system, light, or dark"
            title="Toggle theme"
          >
            <svg
              class="uent-theme-icon uent-theme-icon-system"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
            <svg
              class="uent-theme-icon uent-theme-icon-light"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
            <svg
              class="uent-theme-icon uent-theme-icon-dark"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </button>
        </div>
      </header>

      <div class="uent-toolbar relative no-print">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-4 flex-wrap">
          <DateRangeFilter />
          {buildCount !== undefined ? (
            <span class="uent-builds uent-mono text-xs ml-auto">{buildCount} builds</span>
          ) : null}
        </div>
        <CustomDatePickerPopover />
      </div>
    </>
  );
}
