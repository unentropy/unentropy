import type { ReportMetadata } from "../../../types";
import { formatDate } from "./formatUtils";

interface FooterProps {
  metadata: ReportMetadata;
}

export function Footer({ metadata }: FooterProps) {
  const generatedDate = formatDate(metadata.generatedAt);
  const startDate = formatDate(metadata.dateRange.start);
  const endDate = formatDate(metadata.dateRange.end);

  return (
    <footer class="uent-statusbar uent-mono">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
        <span class="uent-version">unentropy v0.3.9</span>
        <span>{metadata.buildCount} builds</span>
        <span>
          {startDate} — {endDate}
        </span>
        <span class="ml-auto">generated {generatedDate}</span>
        <a
          href="https://unentropy.dev/getting-started/"
          class="hover:underline"
          style="color: var(--text-dim)"
        >
          docs
        </a>
      </div>
    </footer>
  );
}
