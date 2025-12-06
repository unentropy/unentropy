/**
 * Configuration templates for different project types
 * Generates default unentropy.json configurations based on detected project type
 */

import { ProjectType } from "./detector";

export interface MetricConfig {
  $ref?: string;
  name: string;
  command: string;
}

export interface QualityGateConfig {
  mode: "soft";
  thresholds: {
    metric: string;
    mode: "min";
    target: number;
    severity: "warning";
  }[];
}

export interface ConfigTemplate {
  projectType: ProjectType;
  metrics: Record<string, MetricConfig>;
  qualityGate: QualityGateConfig;
}

/**
 * Default quality gate configuration (80% test coverage threshold)
 */
const DEFAULT_QUALITY_GATE: QualityGateConfig = {
  mode: "soft",
  thresholds: [
    {
      metric: "test-coverage",
      mode: "min",
      target: 80,
      severity: "warning",
    },
  ],
};

/**
 * Configuration templates for each project type
 */
export const CONFIG_TEMPLATES: Record<ProjectType, ConfigTemplate> = {
  javascript: {
    projectType: "javascript",
    metrics: {
      "lines-of-code": {
        $ref: "loc",
        name: "Lines of Code",
        command: "@collect loc ./src --language TypeScript",
      },
      "test-coverage": {
        $ref: "coverage",
        name: "Test Coverage",
        command: "@collect coverage-lcov coverage/lcov.info",
      },
      bundle: {
        $ref: "size",
        name: "Bundle Size",
        command: "@collect size dist",
      },
    },
    qualityGate: DEFAULT_QUALITY_GATE,
  },
  php: {
    projectType: "php",
    metrics: {
      "lines-of-code": {
        $ref: "loc",
        name: "Lines of Code",
        command: "@collect loc ./src --language PHP",
      },
      "test-coverage": {
        $ref: "coverage",
        name: "Test Coverage",
        command: "@collect coverage-lcov coverage/lcov.info",
      },
    },
    qualityGate: DEFAULT_QUALITY_GATE,
  },
  go: {
    projectType: "go",
    metrics: {
      "lines-of-code": {
        $ref: "loc",
        name: "Lines of Code",
        command: "@collect loc . --language Go",
      },
      "test-coverage": {
        $ref: "coverage",
        name: "Test Coverage",
        command: "go tool cover -func=coverage.out | grep total | awk '{print $3}' | tr -d '%'",
      },
      "binary-size": {
        $ref: "size",
        name: "Binary Size",
        command: "@collect size ./bin",
      },
    },
    qualityGate: DEFAULT_QUALITY_GATE,
  },
  python: {
    projectType: "python",
    metrics: {
      "lines-of-code": {
        $ref: "loc",
        name: "Lines of Code",
        command: "@collect loc ./src --language Python",
      },
      "test-coverage": {
        $ref: "coverage",
        name: "Test Coverage",
        command: "@collect coverage-lcov coverage.lcov",
      },
    },
    qualityGate: DEFAULT_QUALITY_GATE,
  },
};

/**
 * Get configuration template for a project type
 * @param projectType Project type to get template for
 * @returns Configuration template
 */
export function getTemplateForProjectType(projectType: ProjectType): ConfigTemplate {
  const template = CONFIG_TEMPLATES[projectType];
  if (!template) {
    throw new Error(`No configuration template available for project type: ${projectType}`);
  }
  return template;
}

/**
 * Get all available project types that have templates
 * @returns Array of project type IDs
 */
export function getAvailableProjectTypes(): ProjectType[] {
  return Object.keys(CONFIG_TEMPLATES) as ProjectType[];
}
