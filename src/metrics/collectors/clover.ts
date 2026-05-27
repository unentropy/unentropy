import { readFile } from "fs/promises";
import { XMLParser } from "fast-xml-parser";
import { matchesSources } from "./sources-filter";
import type { SourcesConfig } from "../../config/schema";

export type CloverCoverageType = "line" | "branch" | "function";

export interface CloverOptions {
  type?: CloverCoverageType;
}

interface CloverMetrics {
  "@_files"?: string;
  "@_loc"?: string;
  "@_ncloc"?: string;
  "@_classes"?: string;
  "@_methods"?: string;
  "@_coveredmethods"?: string;
  "@_statements"?: string;
  "@_coveredstatements"?: string;
  "@_elements"?: string;
  "@_coveredelements"?: string;
  "@_conditionals"?: string;
  "@_coveredconditionals"?: string;
}

interface CloverLine {
  "@_num": string;
  "@_type": string;
  "@_count"?: string;
}

interface CloverFile {
  "@_name": string;
  "@_path"?: string;
  line?: CloverLine | CloverLine[];
  metrics: CloverMetrics;
}

interface CloverProject {
  "@_name": string;
  "@_timestamp"?: string;
  file?: CloverFile | CloverFile[];
  metrics: CloverMetrics;
}

interface CloverReport {
  coverage: {
    "@_generated"?: string;
    "@_phpunit"?: string;
    project: CloverProject;
  };
}

async function readAndParseCloverXml(sourcePath: string): Promise<CloverReport> {
  if (!sourcePath || typeof sourcePath !== "string") {
    throw new Error("Source path must be a non-empty string");
  }

  const xmlContent = await readFile(sourcePath, "utf-8");

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });

  let report: CloverReport;
  try {
    report = parser.parse(xmlContent) as CloverReport;
  } catch {
    throw new Error(`Failed to parse Clover XML: ${sourcePath}`);
  }

  if (!report.coverage) {
    throw new Error(`Missing coverage element in: ${sourcePath}`);
  }

  if (!report.coverage.project) {
    throw new Error(`Missing project element in: ${sourcePath}`);
  }

  return report;
}

function extractFileMetrics(
  report: CloverReport,
  coverageType: CloverCoverageType,
  sources?: SourcesConfig,
  basePath?: string
): { covered: number; valid: number } {
  const files = toArray(report.coverage.project.file);
  let covered = 0;
  let valid = 0;

  for (const file of files) {
    if (sources && !matchesSources(file["@_name"], sources, basePath)) {
      continue;
    }

    const metrics = file.metrics;
    if (!metrics) continue;

    let coveredAttr: string | undefined;
    let validAttr: string | undefined;

    switch (coverageType) {
      case "line":
        coveredAttr = "@_coveredstatements";
        validAttr = "@_statements";
        break;
      case "branch":
        coveredAttr = "@_coveredconditionals";
        validAttr = "@_conditionals";
        break;
      case "function":
        coveredAttr = "@_coveredmethods";
        validAttr = "@_methods";
        break;
    }

    const coveredStr = metrics[coveredAttr as keyof CloverMetrics] as string | undefined;
    const validStr = metrics[validAttr as keyof CloverMetrics] as string | undefined;

    if (coveredStr !== undefined && validStr !== undefined) {
      covered += parseInt(coveredStr, 10) || 0;
      valid += parseInt(validStr, 10) || 0;
    }
  }

  return { covered, valid };
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function extractFileStmtData(file: CloverFile): {
  stmtLineNums: number[];
  coveredLineNums: number[];
} {
  const lines = toArray(file.line);
  const stmtLineNums: number[] = [];
  const coveredLineNums: number[] = [];

  for (const line of lines) {
    if (line["@_type"] === "stmt") {
      const num = parseInt(line["@_num"], 10);
      if (!isNaN(num)) {
        stmtLineNums.push(num);
        const count = parseInt(line["@_count"] || "0", 10);
        if (count > 0) {
          coveredLineNums.push(num);
        }
      }
    }
  }

  return { stmtLineNums, coveredLineNums };
}

export async function parseCloverCoverage(
  sourcePath: string,
  options: CloverOptions = {},
  sources?: SourcesConfig,
  basePath?: string
): Promise<number> {
  const report = await readAndParseCloverXml(sourcePath);
  const coverageType = options.type || "line";

  if (coverageType === "line") {
    const fileMap = new Map<string, { total: Set<number>; covered: Set<number> }>();
    const files = toArray(report.coverage.project.file);

    for (const file of files) {
      if (sources && !matchesSources(file["@_name"], sources, basePath)) {
        continue;
      }
      const { stmtLineNums, coveredLineNums } = extractFileStmtData(file);
      let entry = fileMap.get(file["@_name"]);
      if (!entry) {
        entry = { total: new Set(), covered: new Set() };
        fileMap.set(file["@_name"], entry);
      }
      for (const num of stmtLineNums) {
        entry.total.add(num);
      }
      for (const num of coveredLineNums) {
        entry.covered.add(num);
      }
    }

    let totalValid = 0;
    let totalCovered = 0;
    for (const entry of fileMap.values()) {
      totalValid += entry.total.size;
      totalCovered += entry.covered.size;
    }

    if (totalValid === 0) return 0;
    return (totalCovered / totalValid) * 100;
  }

  const { covered, valid } = extractFileMetrics(report, coverageType, sources, basePath);

  if (valid === 0) {
    return 0;
  }

  return (covered / valid) * 100;
}

export async function mergeCloverCoverage(
  sourcePaths: string[],
  options: CloverOptions = {},
  sources?: SourcesConfig,
  basePath?: string
): Promise<number> {
  if (!sourcePaths || sourcePaths.length === 0) {
    throw new Error("At least one source path is required");
  }

  const coverageType = options.type || "line";

  if (coverageType !== "line") {
    let totalCovered = 0;
    let totalValid = 0;
    for (const sourcePath of sourcePaths) {
      const report = await readAndParseCloverXml(sourcePath);
      const { covered, valid } = extractFileMetrics(report, coverageType, sources, basePath);
      totalCovered += covered;
      totalValid += valid;
    }
    if (totalValid === 0) return 0;
    return (totalCovered / totalValid) * 100;
  }

  const fileMap = new Map<string, { total: Set<number>; covered: Set<number> }>();

  for (const sourcePath of sourcePaths) {
    const report = await readAndParseCloverXml(sourcePath);
    const files = toArray(report.coverage.project.file);

    for (const file of files) {
      if (sources && !matchesSources(file["@_name"], sources, basePath)) {
        continue;
      }
      const { stmtLineNums, coveredLineNums } = extractFileStmtData(file);
      let entry = fileMap.get(file["@_name"]);
      if (!entry) {
        entry = { total: new Set(), covered: new Set() };
        fileMap.set(file["@_name"], entry);
      }
      for (const num of stmtLineNums) {
        entry.total.add(num);
      }
      for (const num of coveredLineNums) {
        entry.covered.add(num);
      }
    }
  }

  let totalValid = 0;
  let totalCovered = 0;
  for (const entry of fileMap.values()) {
    totalValid += entry.total.size;
    totalCovered += entry.covered.size;
  }

  if (totalValid === 0) return 0;
  return (totalCovered / totalValid) * 100;
}
