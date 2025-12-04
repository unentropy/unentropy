import type { MetricTemplate, MetricTemplateRegistry } from "./types.js";

export const METRIC_TEMPLATES: MetricTemplateRegistry = {
  coverage: {
    id: "coverage",
    name: "coverage",
    description: "Overall test coverage percentage across the codebase",
    type: "numeric",
    unit: "percent",
  },
  "function-coverage": {
    id: "function-coverage",
    name: "function-coverage",
    description: "Percentage of functions covered by tests",
    type: "numeric",
    unit: "percent",
  },
  loc: {
    id: "loc",
    name: "loc",
    description: "Total lines of code in the codebase",
    type: "numeric",
    command: "@collect loc .",
    unit: "integer",
  },
  "bundle-size": {
    id: "bundle-size",
    name: "bundle-size",
    description: "Total size of production build artifacts",
    type: "numeric",
    command: "@collect size dist",
    unit: "bytes",
  },
  "build-time": {
    id: "build-time",
    name: "build-time",
    description: "Time taken to complete the build",
    type: "numeric",
    unit: "duration",
  },
  "test-time": {
    id: "test-time",
    name: "test-time",
    description: "Time taken to run all tests",
    type: "numeric",
    unit: "duration",
  },
  "dependencies-count": {
    id: "dependencies-count",
    name: "dependencies-count",
    description: "Total number of dependencies",
    type: "numeric",
    unit: "integer",
  },
};

export function getMetricTemplate(id: string): MetricTemplate | undefined {
  return METRIC_TEMPLATES[id];
}

export function listMetricTemplateIds(): string[] {
  return Object.keys(METRIC_TEMPLATES);
}
