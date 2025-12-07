import type { SummaryStats } from "./types";
import type { UnitType } from "../metrics/types";

export function createSeededRng(seed: number): () => number {
  let state = seed;
  return function (): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

function boxMullerGaussian(rng: () => number): number {
  let u1 = 0;
  let u2 = 0;
  while (u1 === 0) u1 = rng();
  while (u2 === 0) u2 = rng();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

export function generateSyntheticData(
  metricName: string,
  existingStats: SummaryStats,
  unit: UnitType | null
): number[] {
  const seed = hashString(metricName) ^ Date.now();
  const rng = createSeededRng(seed);

  const mean = existingStats.average ?? 50;
  const volatility = mean * 0.08;
  const revertSpeed = 0.2;

  const values: number[] = [];
  let current = mean * (0.8 + rng() * 0.4);

  for (let i = 0; i < 20; i++) {
    const noise = boxMullerGaussian(rng) * volatility;
    const reversion = revertSpeed * (mean - current);
    current = current + reversion + noise;

    if (unit === "percent") {
      current = Math.max(0, Math.min(100, current));
    } else if (unit === "bytes" || unit === "duration" || unit === "integer") {
      current = Math.max(0, current);
    }

    values.push(Math.round(current * 100) / 100);
  }

  return values;
}

export function calculateSyntheticStats(values: number[]): SummaryStats {
  if (values.length === 0) {
    return {
      latest: null,
      min: null,
      max: null,
      average: null,
      trendDirection: null,
      trendPercent: null,
    };
  }

  const latest = values[values.length - 1] ?? null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const average = values.reduce((a, b) => a + b, 0) / values.length;

  let trendDirection: "up" | "down" | "stable" | null = null;
  let trendPercent: number | null = null;

  if (values.length >= 2) {
    const first = values[0];
    const last = values[values.length - 1];
    if (first !== undefined && last !== undefined) {
      const change = last - first;
      const percentChange = first !== 0 ? (change / Math.abs(first)) * 100 : 0;

      if (Math.abs(percentChange) < 1) {
        trendDirection = "stable";
        trendPercent = 0;
      } else if (change > 0) {
        trendDirection = "up";
        trendPercent = percentChange;
      } else {
        trendDirection = "down";
        trendPercent = percentChange;
      }
    }
  }

  return {
    latest,
    min,
    max,
    average,
    trendDirection,
    trendPercent,
  };
}
