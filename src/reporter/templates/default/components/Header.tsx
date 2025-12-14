import type { ReportMetadata } from "../../../types";
import { DateRangeFilter } from "./DateRangeFilter";
import { CustomDatePickerPopover } from "./CustomDatePickerPopover";

interface HeaderProps {
  metadata: ReportMetadata;
}

export function Header({ metadata }: HeaderProps) {
  return (
    <header class="bg-white dark:bg-gray-800 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
              Unentropy Metrics Report
            </h1>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">{metadata.repository}</p>
          </div>
          <div class="relative">
            <DateRangeFilter />
            <CustomDatePickerPopover />
          </div>
        </div>
      </div>
    </header>
  );
}
