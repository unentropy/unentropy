import { readFile } from "fs/promises";
import { parse, generateSummary } from "@markusberg/lcov-parse";

export type CoverageType = "line" | "branch" | "function";

export interface LcovOptions {
  fallback?: number;
  type?: CoverageType;
}

/**
 * Parse LCOV coverage report and return coverage percentage
 * @param sourcePath - Path to the LCOV file
 * @param options - Options including coverage type (line, branch, function) and fallback value
 * @returns Coverage percentage as a number (0-100)
 */
export async function parseLcovCoverage(
  sourcePath: string,
  options: LcovOptions = {}
): Promise<number> {
  // Validate input path
  if (!sourcePath || typeof sourcePath !== "string") {
    throw new Error("Source path must be a non-empty string");
  }

  const coverageType = options.type || "line";

  // Read the LCOV file content
  const lcovContent = await readFile(sourcePath, "utf-8");

  // Parse the LCOV content
  const report = parse(lcovContent);

  // Generate summary to get coverage percentages
  const summary = generateSummary(report);

  // Get the appropriate coverage metrics based on type
  let metrics: { total: number; pct: number } | undefined;

  switch (coverageType) {
    case "line":
      metrics = summary.total?.lines;
      break;
    case "branch":
      metrics = summary.total?.branches;
      break;
    case "function":
      metrics = summary.total?.functions;
      break;
  }

  // Check if we have valid coverage data
  const total = metrics?.total || 0;
  if (total === 0) {
    // No coverage data found for this type, return fallback
    return options.fallback ?? 0;
  }

  // Return coverage percentage
  return metrics?.pct ?? options.fallback ?? 0;
}
