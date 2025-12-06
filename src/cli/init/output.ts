/**
 * GitHub Actions workflow example generator
 * Creates ready-to-use workflow examples for different project types and storage backends
 */

import { ProjectType } from "./detector";

export type StorageType = "artifact" | "s3" | "local";

export interface WorkflowExample {
  name: string;
  trigger: string;
  setupSteps: string;
  testCommand: string;
  unentropyStep: string;
}

export interface ProjectTypeWorkflow {
  setupAction: string;
  installCommand: string;
  testCommand: string;
  coverageFile?: string;
}

/**
 * Project type specific workflow configurations
 */
export const PROJECT_TYPE_WORKFLOWS: Record<ProjectType, ProjectTypeWorkflow> = {
  javascript: {
    setupAction: "actions/setup-node@v4",
    installCommand: "npm ci",
    testCommand: "npm test -- --coverage",
    coverageFile: "coverage/lcov.info",
  },
  php: {
    setupAction: "shivammathur/setup-php@v2",
    installCommand: "composer install",
    testCommand: "vendor/bin/phpunit --coverage-lcov coverage/lcov.info",
    coverageFile: "coverage/lcov.info",
  },
  go: {
    setupAction: "actions/setup-go@v5",
    installCommand: "go mod download",
    testCommand: "go test -coverprofile=coverage.out ./...",
    coverageFile: "coverage.out",
  },
  python: {
    setupAction: "actions/setup-python@v5",
    installCommand: "pip install",
    testCommand: "pytest --cov=src --cov-report=lcov:coverage.lcov",
    coverageFile: "coverage.lcov",
  },
};

/**
 * Storage type mapping
 */
export const STORAGE_TYPE_MAPPING: Record<StorageType, string> = {
  artifact: "sqlite-artifact",
  s3: "sqlite-s3",
  local: "sqlite-local",
};

/**
 * Generate metrics tracking workflow example
 * @param projectType Project type
 * @param storageType Storage backend type
 * @returns Workflow example for tracking metrics
 */
export function generateMetricsWorkflow(
  projectType: ProjectType,
  storageType: StorageType = "artifact"
): WorkflowExample {
  const workflow = PROJECT_TYPE_WORKFLOWS[projectType];
  const storageConfig = STORAGE_TYPE_MAPPING[storageType];

  return {
    name: "Metrics",
    trigger: `push:\n  branches: [main]`,
    setupSteps: generateSetupSteps(workflow),
    testCommand: workflow.testCommand,
    unentropyStep: `      - uses: unentropy/track-metrics@v1\n        with:\n          storage-type: ${storageConfig}`,
  };
}

/**
 * Generate quality gate workflow example
 * @param projectType Project type
 * @param storageType Storage backend type
 * @returns Workflow example for quality gate
 */
export function generateQualityGateWorkflow(
  projectType: ProjectType,
  storageType: StorageType = "artifact"
): WorkflowExample {
  const workflow = PROJECT_TYPE_WORKFLOWS[projectType];
  const storageConfig = STORAGE_TYPE_MAPPING[storageType];

  return {
    name: "CI",
    trigger: "pull_request",
    setupSteps: generateSetupSteps(workflow),
    testCommand: workflow.testCommand,
    unentropyStep: `      - uses: unentropy/quality-gate@v1\n        with:\n          storage-type: ${storageConfig}\n          quality-gate-mode: soft\n          enable-pr-comment: true`,
  };
}

/**
 * Generate S3 secrets configuration
 * @returns S3 secrets instructions
 */
export function generateS3Secrets(): string {
  return `Add these secrets to your repository Settings > Secrets:
  - AWS_ENDPOINT_URL
  - AWS_BUCKET_NAME
  - AWS_REGION
  - AWS_ACCESS_KEY_ID
  - AWS_SECRET_ACCESS_KEY

Then update the workflow steps to include:
  s3-endpoint: \${{ secrets.AWS_ENDPOINT_URL }}
  s3-bucket: \${{ secrets.AWS_BUCKET_NAME }}
  s3-region: \${{ secrets.AWS_REGION }}
  s3-access-key-id: \${{ secrets.AWS_ACCESS_KEY_ID }}
  s3-secret-access-key: \${{ secrets.AWS_SECRET_ACCESS_KEY }}`;
}

/**
 * Generate setup steps for workflow
 * @param workflow Project type workflow configuration
 * @returns YAML setup steps
 */
function generateSetupSteps(workflow: ProjectTypeWorkflow): string {
  const nodeVersion = workflow.setupAction.includes("node") ? "20" : "";
  const pythonVersion = workflow.setupAction.includes("python") ? "3.11" : "";
  const goVersion = workflow.setupAction.includes("go") ? "1.21" : "";
  const phpVersion = workflow.setupAction.includes("php") ? "8.2" : "";

  let setupSteps = `      - uses: actions/checkout@v4\n`;

  if (nodeVersion) {
    setupSteps += `      - uses: ${workflow.setupAction}\n        with:\n          node-version: '${nodeVersion}'\n`;
  } else if (pythonVersion) {
    setupSteps += `      - uses: ${workflow.setupAction}\n        with:\n          python-version: '${pythonVersion}'\n`;
  } else if (goVersion) {
    setupSteps += `      - uses: ${workflow.setupAction}\n        with:\n          go-version: '${goVersion}'\n`;
  } else if (phpVersion) {
    setupSteps += `      - uses: ${workflow.setupAction}\n        with:\n          php-version: '${phpVersion}'\n`;
  }

  setupSteps += `      - run: ${workflow.installCommand}\n`;

  return setupSteps;
}

/**
 * Format workflow example as YAML string
 * @param workflow Workflow example
 * @returns Formatted YAML string
 */
export function formatWorkflowAsYaml(workflow: WorkflowExample): string {
  return `name: ${workflow.name}
on:
  ${workflow.trigger}

permissions:
  contents: read
  actions: read
  pull-requests: write

jobs:
  ${workflow.name.toLowerCase()}:
    runs-on: ubuntu-latest
    steps:
${workflow.setupSteps}
      - run: ${workflow.testCommand}
${workflow.unentropyStep}

Documentation: https://github.com/unentropy/unentropy`;
}
