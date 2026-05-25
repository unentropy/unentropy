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

export type SyntheticDomain =
  | "coverage"
  | "code-size"
  | "bundle-size"
  | "duration"
  | "latency"
  | "count"
  | "growth"
  | "default";

export function inferDomain(
  metricName: string,
  unit: UnitType | null,
  metricId?: string
): SyntheticDomain {
  const text = `${metricName} ${metricId || ""}`.toLowerCase();

  if (unit === "percent" || text.includes("coverage") || text.includes("coverage")) {
    return "coverage";
  }

  if (unit === "bytes") {
    if (text.includes("bundle") || text.includes("size")) return "bundle-size";
    return "bundle-size";
  }

  if (unit === "duration") {
    if (text.includes("response") || text.includes("latency") || text.includes("api")) {
      return "latency";
    }
    return "duration";
  }

  if (unit === "integer" || unit === "decimal") {
    if (text.includes("loc") || text.includes("lines") || text.includes("line")) {
      return "code-size";
    }
    if (text.includes("depend") || text.includes("count") || text.includes("package")) {
      return "count";
    }
    if (
      text.includes("contributor") ||
      text.includes("user") ||
      text.includes("team") ||
      text.includes("member")
    ) {
      return "growth";
    }
    if (text.includes("code") || text.includes("source")) {
      return "code-size";
    }
    return "code-size";
  }

  return "default";
}

export function defaultBaseForDomain(domain: SyntheticDomain, unit: UnitType | null): number {
  switch (domain) {
    case "coverage":
      return 65;
    case "code-size":
      return 5000;
    case "bundle-size":
      return 250 * 1024;
    case "duration":
      return 150;
    case "latency":
      return 0.15;
    case "count":
      return 100;
    case "growth":
      return 5;
    default:
      if (unit === "percent") return 75;
      if (unit === "bytes") return 200 * 1024;
      if (unit === "duration") return 120;
      if (unit === "integer") return 200;
      if (unit === "decimal") return 5;
      return 75;
  }
}

function generateCoverage(rng: () => number, mean: number): number[] {
  const start = Math.max(15, Math.min(90, mean - 14));
  const asymptote = Math.min(100, Math.max(mean + 5, mean * 1.1));
  const rate = 0.18;

  let current = start;
  const values: number[] = [];
  for (let i = 0; i < 20; i++) {
    const noise = boxMullerGaussian(rng) * 2;
    const improvement = (asymptote - current) * rate;
    current = current + improvement + noise;
    current = Math.max(5, Math.min(100, current));
    values.push(Math.round(current * 10) / 10);
  }
  return values;
}

function generateCodeSize(rng: () => number, mean: number): number[] {
  const base = Math.max(1000, mean || 5000);
  const stepGrowth = 25 + rng() * 55;

  let current = base;
  const values: number[] = [];
  for (let i = 0; i < 20; i++) {
    const noise = boxMullerGaussian(rng) * base * 0.015;
    const drop = i > 3 && i % 7 === 3 ? -(100 + rng() * 200) : 0;
    const growth = stepGrowth + noise + drop;
    current = Math.max(base * 0.85, current + growth);
    values.push(Math.round(current));
  }
  return values;
}

function generateBundleSize(rng: () => number, mean: number): number[] {
  const base = Math.max(80 * 1024, mean || 250 * 1024);
  const stepGrowth = 512 + rng() * 1536;

  let current = base;
  const values: number[] = [];
  for (let i = 0; i < 20; i++) {
    const noise = boxMullerGaussian(rng) * base * 0.015;
    const drop = i > 2 && i % 6 === 2 ? -(rng() * base * 0.06) : 0;
    const growth = stepGrowth + noise + drop;
    current = Math.max(base * 0.7, current + growth);
    values.push(Math.round(current));
  }
  return values;
}

function generateDuration(rng: () => number, mean: number): number[] {
  const base = Math.max(30, mean || 120);
  const volatility = base * 0.08;

  let current = base;
  const values: number[] = [];
  for (let i = 0; i < 20; i++) {
    const noise = boxMullerGaussian(rng) * volatility;
    const spike = i % 6 === 3 ? rng() * base * 0.3 : 0;
    const reversion = 0.15 * (base - current);
    current = current + reversion + noise + spike;
    current = Math.max(base * 0.7, current);
    values.push(Math.round(current * 100) / 100);
  }
  return values;
}

function generateLatency(rng: () => number, mean: number): number[] {
  const base = Math.max(0.02, mean || 0.15);
  const volatility = base * 0.12;

  let current = base;
  const values: number[] = [];
  for (let i = 0; i < 20; i++) {
    const noise = boxMullerGaussian(rng) * volatility;
    const spike = i % 8 === 3 ? rng() * base * 0.5 : 0;
    const reversion = 0.2 * (base - current);
    current = Math.max(0.01, current + reversion + noise + spike);
    values.push(Math.round(current * 1000) / 1000);
  }
  return values;
}

function generateCount(rng: () => number, mean: number): number[] {
  const base = Math.max(20, mean || 100);
  const stepGrowth = 0.5 + rng() * 1.5;

  let current = base;
  const values: number[] = [];
  for (let i = 0; i < 20; i++) {
    const noise = boxMullerGaussian(rng) * 1.5;
    const drop = i > 5 && i % 8 === 5 ? -(2 + rng() * 3) : 0;
    const growth = stepGrowth + noise + drop;
    current = Math.max(base * 0.8, current + growth);
    values.push(Math.max(0, Math.round(current)));
  }
  return values;
}

function generateGrowth(rng: () => number, mean: number): number[] {
  const base = Math.max(1, mean || 5);
  const asymptote = Math.max(base + 5, Math.max(base * 2.5, base + 6));
  const rate = 0.12;

  let current = Math.max(1, base - 2);
  const values: number[] = [];
  for (let i = 0; i < 20; i++) {
    const noise = boxMullerGaussian(rng) * 0.5;
    const growth = (asymptote - current) * rate;
    current = Math.max(1, current + growth + noise);
    values.push(Math.round(current));
  }
  return values;
}

function generateDefault(rng: () => number, mean: number, unit: UnitType | null): number[] {
  const volatility = mean * 0.08;
  const revertSpeed = 0.2;

  let current = mean * (0.8 + rng() * 0.4);
  const values: number[] = [];
  for (let i = 0; i < 20; i++) {
    const noise = boxMullerGaussian(rng) * volatility;
    const reversion = revertSpeed * (mean - current);
    current = current + reversion + noise;

    if (unit === "percent") {
      current = Math.max(0, Math.min(100, current));
    } else if (
      unit === "bytes" ||
      unit === "duration" ||
      unit === "integer" ||
      unit === "decimal"
    ) {
      current = Math.max(0, current);
    }

    const rounded = unit === "integer" ? Math.round(current) : Math.round(current * 100) / 100;
    values.push(rounded);
  }
  return values;
}

export function generateSyntheticData(
  metricName: string,
  existingStats: SummaryStats,
  unit: UnitType | null,
  metricId?: string
): number[] {
  const seed = hashString(`${metricName}|${metricId || ""}`) ^ Date.now();
  const rng = createSeededRng(seed);

  const domain = inferDomain(metricName, unit, metricId);
  const mean = existingStats.average ?? defaultBaseForDomain(domain, unit);

  switch (domain) {
    case "coverage":
      return generateCoverage(rng, mean);
    case "code-size":
      return generateCodeSize(rng, mean);
    case "bundle-size":
      return generateBundleSize(rng, mean);
    case "duration":
      return generateDuration(rng, mean);
    case "latency":
      return generateLatency(rng, mean);
    case "count":
      return generateCount(rng, mean);
    case "growth":
      return generateGrowth(rng, mean);
    default:
      return generateDefault(rng, mean, unit);
  }
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
