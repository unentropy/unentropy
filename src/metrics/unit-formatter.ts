import type { UnitType } from "./types.js";

/**
 * Format values based on semantic unit types for server-side rendering.
 *
 * NOTE: This formatting logic is duplicated in browser scripts for chart tooltips.
 *
 * IMPORTANT: When updating this function, also update:
 * - src/reporter/templates/default/scripts/charts.js (browser-compatible version)
 * - src/reporter/templates/default/components/formatUtils.ts (re-exports this function)
 *
 * @param value - The numeric value to format
 * @param unit - The semantic unit type (percent, integer, bytes, duration, decimal)
 * @returns Formatted value string
 */
export function formatValue(value: number | null, unit: UnitType | null): string {
  if (value === null) {
    return "N/A";
  }

  switch (unit) {
    case "percent":
      return formatPercent(value);
    case "integer":
      return formatInteger(value);
    case "bytes":
      return formatBytes(value);
    case "duration":
      return formatDuration(value);
    case "decimal":
      return formatDecimal(value);
    case null:
      return "N/A";
    default:
      const _exhaustive: never = unit;
      return _exhaustive;
  }
}

/**
 * Format a delta (change) value according to its unit type.
 * Includes +/- prefix and applies same formatting rules as formatValue.
 *
 * @param delta - The change value (positive or negative)
 * @param unit - The semantic unit type determining format rules
 * @returns Formatted string with +/- prefix
 *
 * @example
 * formatDelta(2.5, 'percent') // "+2.5%"
 * formatDelta(-262144, 'bytes') // "-256 KB"
 * formatDelta(150, 'integer') // "+150"
 */
export function formatDelta(delta: number, unit: UnitType | null): string {
  const sign = delta >= 0 ? "+" : "";
  const formattedValue = formatValue(delta, unit);
  return `${sign}${formattedValue}`;
}

function formatPercent(value: number): string {
  return `${value.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

export function formatInteger(value: number): string {
  return Math.round(value).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function formatBytes(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (absValue < 1024) {
    return `${sign}${Math.round(absValue)} B`;
  }

  if (absValue < 1024 * 1024) {
    const kb = absValue / 1024;
    // Use 0 decimals if the value is a whole number, otherwise 1 decimal
    const decimals = kb % 1 === 0 ? 0 : 1;
    return `${sign}${kb.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: 1 })} KB`;
  }

  if (absValue < 1024 * 1024 * 1024) {
    const mb = absValue / (1024 * 1024);
    const decimals = mb % 1 === 0 ? 0 : 1;
    return `${sign}${mb.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: 1 })} MB`;
  }

  const gb = absValue / (1024 * 1024 * 1024);
  const decimals = gb % 1 === 0 ? 0 : 1;
  return `${sign}${gb.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: 1 })} GB`;
}

export function formatDuration(seconds: number): string {
  const absSeconds = Math.abs(seconds);
  const sign = seconds < 0 ? "-" : "";

  if (absSeconds < 1) {
    const ms = Math.round(absSeconds * 1000);
    return `${sign}${ms}ms`;
  }

  if (absSeconds < 60) {
    const rounded = Math.round(absSeconds);
    return `${sign}${rounded}s`;
  }

  if (absSeconds < 3600) {
    const minutes = Math.floor(absSeconds / 60);
    const secs = Math.round(absSeconds % 60);
    return `${sign}${minutes}m ${secs}s`;
  }

  const hours = Math.floor(absSeconds / 3600);
  const minutes = Math.round((absSeconds % 3600) / 60);
  return `${sign}${hours}h ${minutes}m`;
}

function formatDecimal(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
