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

export function isValidProjectType(type: string): type is ProjectType {
  return Object.keys(PROJECT_TYPES).includes(type);
}

export function getValidProjectTypes(): ProjectType[] {
  return Object.keys(PROJECT_TYPES) as ProjectType[];
}
