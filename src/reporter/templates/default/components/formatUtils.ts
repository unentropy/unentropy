import { formatValue as formatValueWithUnit } from "../../../../metrics/unit-formatter";
import type { UnitType } from "../../../../metrics/types";

export function formatTrendArrow(direction: "up" | "down" | "stable" | null): string {
  if (direction === "up") return "↑";
  if (direction === "down") return "↓";
  if (direction === "stable") return "→";
  return "—";
}

export function getTrendColor(direction: "up" | "down" | "stable" | null): string {
  if (direction === "up") return "text-green-600 dark:text-green-400";
  if (direction === "down") return "text-red-600 dark:text-red-400";
  return "text-gray-600 dark:text-gray-400";
}

export function formatValue(value: number | null, unit: UnitType | null): string {
  return formatValueWithUnit(value, unit);
}

export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
