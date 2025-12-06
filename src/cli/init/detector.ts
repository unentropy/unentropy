import { existsSync } from "node:fs";
import { join } from "node:path";

export type ProjectType = "javascript" | "php" | "go" | "python";

export interface DetectionResult {
  type: ProjectType;
  detectedFiles: string[];
}

export interface ProjectTypeConfig {
  id: ProjectType;
  displayName: string;
  markerFiles: string[];
  priority: number;
}

/**
 * Project type configurations with detection rules
 */
export const PROJECT_TYPES: Record<ProjectType, ProjectTypeConfig> = {
  javascript: {
    id: "javascript",
    displayName: "JavaScript/TypeScript",
    markerFiles: [
      "package.json",
      "tsconfig.json",
      "bun.lockb",
      "pnpm-lock.yaml",
      "yarn.lock",
      "package-lock.json",
    ],
    priority: 1,
  },
  php: {
    id: "php",
    displayName: "PHP",
    markerFiles: ["composer.json", "composer.lock"],
    priority: 2,
  },
  go: {
    id: "go",
    displayName: "Go",
    markerFiles: ["go.mod", "go.sum"],
    priority: 3,
  },
  python: {
    id: "python",
    displayName: "Python",
    markerFiles: ["pyproject.toml", "setup.py", "requirements.txt", "Pipfile", "setup.cfg"],
    priority: 4,
  },
};

/**
 * Detect project type based on marker files in current directory
 * @param cwd Current working directory (defaults to process.cwd())
 * @returns Detection result or null if no project type detected
 */
export function detectProjectType(cwd: string = process.cwd()): DetectionResult | null {
  // Sort project types by priority (lower number = higher priority)
  const sortedTypes = Object.values(PROJECT_TYPES).sort((a, b) => a.priority - b.priority);

  for (const projectType of sortedTypes) {
    const found = projectType.markerFiles.filter((file) => existsSync(join(cwd, file)));

    if (found.length > 0) {
      return {
        type: projectType.id,
        detectedFiles: found,
      };
    }
  }

  return null;
}

/**
 * Get project type configuration by ID
 * @param type Project type ID
 * @returns Project type configuration
 */
export function getProjectType(type: ProjectType): ProjectTypeConfig {
  const config = PROJECT_TYPES[type];
  if (!config) {
    throw new Error(`Invalid project type: ${type}`);
  }
  return config;
}

/**
 * Validate project type string
 * @param type Project type string to validate
 * @returns True if valid project type
 */
export function isValidProjectType(type: string): type is ProjectType {
  return Object.keys(PROJECT_TYPES).includes(type);
}

/**
 * Get all valid project type IDs
 * @returns Array of valid project type IDs
 */
export function getValidProjectTypes(): ProjectType[] {
  return Object.keys(PROJECT_TYPES) as ProjectType[];
}
