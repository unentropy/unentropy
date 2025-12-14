import type { UnitType } from "../../src/metrics/types";

export interface MetricGenerator {
  id: string;
  name?: string;
  type: "numeric" | "label";
  description: string;
  unit?: UnitType;
  valueGenerator: (buildIndex: number) => number | string | null;
}

export interface MetricInput {
  definition: {
    id: string;
    type: "numeric" | "label";
    description?: string;
    unit?: UnitType;
  };
  value_numeric?: number;
  value_label?: string;
}

export interface FixtureConfig {
  name: string;
  dbPath: string;
  outputPath: string;
  buildCount: number;
  timestampGenerator?: (buildIndex: number, baseTimestamp: number) => Date;
  metricGenerators: MetricGenerator[];
}

const FULL_FEATURED_METRICS: MetricGenerator[] = [
  {
    id: "test-coverage",
    name: "Test Coverage",
    type: "numeric",
    description: "Percentage of code covered by tests",
    unit: "percent",
    valueGenerator: (i) => 75 + Math.sin(i * 0.3) * 10 + i * 0.4,
  },
  {
    id: "bundle-size",
    name: "Bundle Size",
    type: "numeric",
    description: "JavaScript bundle size in KB",
    unit: "bytes",
    valueGenerator: (i) => (250 - Math.cos(i * 0.2) * 20 - i * 0.5) * 1024,
  },
  {
    id: "build-status",
    name: "Build Status",
    type: "label",
    description: "CI build result",
    valueGenerator: (i) => (i % 7 === 0 ? "failure" : i % 10 === 0 ? "warning" : "success"),
  },
  {
    id: "primary-language",
    name: "Primary Language",
    type: "label",
    description: "Most used programming language",
    valueGenerator: (i) =>
      ["TypeScript", "JavaScript", "TypeScript", "TypeScript", "Python"][i % 5] || "TypeScript",
  },
  {
    id: "api-response-time",
    name: "API Response Time",
    type: "numeric",
    description: "Average API response time (sparse data - only collected on some builds)",
    unit: "duration",
    valueGenerator: (i) => {
      const sparseBuilds = [0, 1, 2, 3, 7, 8, 9, 10, 14, 15, 16, 17, 21, 22, 23, 24];
      if (!sparseBuilds.includes(i)) return null;
      return (140 - i * 1.2 + Math.sin(i * 0.5) * 8) / 1000;
    },
  },
];

export const FIXTURES: Record<string, FixtureConfig> = {
  minimal: {
    name: "minimal",
    dbPath: "tests/fixtures/visual-review/minimal/minimal.db",
    outputPath: "tests/fixtures/visual-review/minimal/report.html",
    buildCount: 5,
    metricGenerators: [
      {
        id: "test-coverage",
        name: "Test Coverage",
        type: "numeric",
        description: "Code coverage percentage",
        unit: "percent",
        valueGenerator: (i) => 82.1 + i * 0.85,
      },
    ],
  },

  "full-featured": {
    name: "full-featured",
    dbPath: "tests/fixtures/visual-review/full-featured/full-featured.db",
    outputPath: "tests/fixtures/visual-review/full-featured/report.html",
    buildCount: 25,
    metricGenerators: FULL_FEATURED_METRICS,
  },

  "sparse-data": {
    name: "sparse-data",
    dbPath: "tests/fixtures/visual-review/sparse-data/sparse-data.db",
    outputPath: "tests/fixtures/visual-review/sparse-data/report.html",
    buildCount: 3,
    metricGenerators: [
      {
        id: "test-coverage",
        name: "Test Coverage",
        type: "numeric",
        description: "Code coverage percentage",
        unit: "percent",
        valueGenerator: (i) => [78.5, 82.1, 85.3][i] || 80,
      },
      {
        id: "build-status",
        name: "Build Status",
        type: "label",
        description: "CI build result",
        valueGenerator: (i) => ["success", "failure", "success"][i] || "success",
      },
    ],
  },

  empty: {
    name: "empty",
    dbPath: "tests/fixtures/visual-review/empty/empty.db",
    outputPath: "tests/fixtures/visual-review/empty/report.html",
    buildCount: 0,
    metricGenerators: [
      {
        id: "test-coverage",
        name: "Test Coverage",
        type: "numeric",
        description: "Code coverage percentage",
        unit: "percent",
        valueGenerator: () => 80,
      },
      {
        id: "bundle-size",
        name: "Bundle Size",
        type: "numeric",
        description: "JavaScript bundle size",
        unit: "bytes",
        valueGenerator: () => 250 * 1024,
      },
      {
        id: "build-status",
        name: "Build Status",
        type: "label",
        description: "CI build result",
        valueGenerator: () => "success",
      },
    ],
  },

  "edge-cases": {
    name: "edge-cases",
    dbPath: "tests/fixtures/visual-review/edge-cases/edge-cases.db",
    outputPath: "tests/fixtures/visual-review/edge-cases/report.html",
    buildCount: 10,
    metricGenerators: [
      {
        id: "test-coverage",
        name: "Test Coverage",
        type: "numeric",
        description:
          "This is a very long description that tests how the template handles descriptions with many characters and ensures that the layout doesn't break when displaying lengthy explanatory text about what a particular metric represents",
        unit: "percent",
        valueGenerator: () => 0,
      },
      {
        id: "bundle-size-kb",
        name: "Bundle Size KB",
        type: "numeric",
        description: "Bundle size with special chars: @/\\*",
        unit: "bytes",
        valueGenerator: () => 9999999.99 * 1024,
      },
      {
        id: "flatline-metric",
        name: "Flatline Metric",
        type: "numeric",
        description: "A metric that never changes",
        unit: "integer",
        valueGenerator: () => 100,
      },
      {
        id: "negative-metric",
        name: "Negative Metric",
        type: "numeric",
        description: "Metric with negative values",
        unit: "decimal",
        valueGenerator: (i) => -50 + i * 1.5,
      },
      {
        id: "special-chars-label",
        name: "Special Chars Label",
        type: "label",
        description: "Label with special characters: <script>alert('xss')</script>",
        valueGenerator: (i) =>
          ["<script>alert('xss')</script>", "normal-value", '"quoted"', "apostrophe's", "&amp;"][
            i % 5
          ] || "normal",
      },
    ],
  },

  "huge-report": {
    name: "huge-report",
    dbPath: "tests/fixtures/visual-review/huge-report/huge-report.db",
    outputPath: "tests/fixtures/visual-review/huge-report/report.html",
    buildCount: 3000,
    timestampGenerator: (buildIndex, baseTimestamp) => {
      const dayInMs = 24 * 60 * 60 * 1000;
      const hourInMs = 60 * 60 * 1000;

      const dayOffset = Math.floor(buildIndex / 4);
      const buildOfDay = buildIndex % 4;

      const dayStart = baseTimestamp + dayOffset * dayInMs;
      const date = new Date(dayStart);
      const isWeekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;

      if (isWeekend && buildOfDay >= 2) {
        return new Date(dayStart + (8 + buildOfDay * 2) * hourInMs);
      }

      const workingHourOffsets = [9, 11, 14, 17];
      const hourOffset = workingHourOffsets[buildOfDay] || 12;
      const minuteVariation = Math.floor((buildIndex * 37) % 60);

      return new Date(dayStart + hourOffset * hourInMs + minuteVariation * 60 * 1000);
    },
    metricGenerators: [
      {
        id: "test-coverage",
        name: "Test Coverage",
        type: "numeric",
        description: "Code coverage percentage",
        unit: "percent",
        valueGenerator: (i) => {
          const progress = i / 3000;
          return 45 + 47 * (1 - Math.exp(-progress * 4));
        },
      },
      {
        id: "bundle-size",
        name: "Bundle Size",
        type: "numeric",
        description: "Production JavaScript bundle size",
        unit: "bytes",
        valueGenerator: (i) => {
          let baseSize = 180 * 1024;
          const growthRate = 900;

          baseSize += i * growthRate;

          if (i > 800) baseSize *= 0.82;
          if (i > 1600) baseSize *= 0.85;
          if (i > 2400) baseSize *= 0.88;

          return baseSize;
        },
      },
      {
        id: "build-duration",
        name: "Build Duration",
        type: "numeric",
        description: "CI pipeline execution time",
        unit: "duration",
        valueGenerator: (i) => {
          let duration = 120 + i * 0.15;

          if (i > 1000) duration -= 180;
          if (i > 2000) duration -= 120;

          return Math.max(90, duration);
        },
      },
      {
        id: "active-contributors",
        name: "Active Contributors",
        type: "numeric",
        description: "Number of unique contributors in past 30 days",
        unit: "integer",
        valueGenerator: (i) => {
          const progress = i / 3000;
          const logisticGrowth = 15 / (1 + Math.exp(-10 * (progress - 0.5)));
          const noise = Math.sin(i * 0.1) * 0.5;
          return Math.max(2, Math.min(15, Math.round(2 + logisticGrowth + noise)));
        },
      },
      {
        id: "dependency-count",
        name: "Dependency Count",
        type: "numeric",
        description: "Total number of npm dependencies",
        unit: "integer",
        valueGenerator: (i) => {
          const baseGrowth = 50 + i * 0.125;
          const noise = Math.sin(i * 0.05) * 3;
          return Math.round(baseGrowth + noise);
        },
      },
      {
        id: "deployment-target",
        name: "Deployment Target",
        type: "label",
        description: "Deployment environment for this build",
        valueGenerator: (i) => {
          const rand = (i * 17 + 13) % 100;
          if (rand < 65) return "staging";
          if (rand < 95) return "production";
          return "canary";
        },
      },
    ],
  },
};
