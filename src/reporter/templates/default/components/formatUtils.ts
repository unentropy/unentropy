import { formatValue as formatValueWithUnit } from "../../../../metrics/unit-formatter";
import type { UnitType } from "../../../../metrics/types";

export function formatTrendArrow(direction: "up" | "down" | "stable" | null): string {
  if (direction === "up") return "↑";
  if (direction === "down") return "↓";
  if (direction === "stable") return "→";
  return "—";
}

export function getTrendColor(direction: "up" | "down" | "stable" | null): string {
  if (direction === "up") return "uent-trend-up";
  if (direction === "down") return "uent-trend-down";
  return "uent-trend-stable";
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
