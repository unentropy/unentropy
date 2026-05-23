import { readFile } from "fs/promises";
import { XMLParser } from "fast-xml-parser";

export type CoverageType = "line" | "branch" | "function";

export interface CoberturaOptions {
  type?: CoverageType;
}

export interface CoberturaCounts {
  linesCovered: number;
  linesValid: number;
  branchesCovered: number;
  branchesValid: number;
}

interface MethodKey {
  packageName: string;
  className: string;
  name: string;
  signature: string;
}

interface MethodEntry {
  key: MethodKey;
  lineRate: number;
}

interface CoberturaMethod {
  "@_name": string;
  "@_signature": string;
  "@_line-rate": string;
  "@_branch-rate": string;
}

interface CoberturaLine {
  "@_number": string;
  "@_hits": string;
  "@_branch"?: string;
  "@_condition-coverage"?: string;
}

interface CoberturaClass {
  "@_name": string;
  "@_filename": string;
  "@_line-rate": string;
  "@_branch-rate": string;
  methods?: {
    method?: CoberturaMethod | CoberturaMethod[];
  };
  lines?: {
    line?: CoberturaLine | CoberturaLine[];
  };
}

interface CoberturaPackage {
  "@_name": string;
  "@_line-rate": string;
  "@_branch-rate": string;
  classes?: {
    class?: CoberturaClass | CoberturaClass[];
  };
}

interface CoberturaReport {
  coverage: {
    "@_line-rate": string;
    "@_branch-rate": string;
    "@_lines-covered"?: string;
    "@_lines-valid"?: string;
    "@_branches-covered"?: string;
    "@_branches-valid"?: string;
    "@_version"?: string;
    "@_timestamp"?: string;
    packages?: {
      package?: CoberturaPackage | CoberturaPackage[];
    };
  };
}

async function readAndParseCoberturaXml(sourcePath: string): Promise<CoberturaReport> {
  if (!sourcePath || typeof sourcePath !== "string") {
    throw new Error("Source path must be a non-empty string");
  }

  const xmlContent = await readFile(sourcePath, "utf-8");

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });

  let report: CoberturaReport;
  try {
    report = parser.parse(xmlContent) as CoberturaReport;
  } catch {
    throw new Error(`Failed to parse Cobertura XML: ${sourcePath}`);
  }

  if (!report.coverage) {
    throw new Error(`Missing coverage element in: ${sourcePath}`);
  }

  return report;
}

function extractCounts(report: CoberturaReport, sourcePath: string): CoberturaCounts {
  const linesCoveredStr = report.coverage["@_lines-covered"];
  const linesValidStr = report.coverage["@_lines-valid"];
  const branchesCoveredStr = report.coverage["@_branches-covered"];
  const branchesValidStr = report.coverage["@_branches-valid"];

  if (linesCoveredStr === undefined || linesValidStr === undefined) {
    throw new Error(`Missing lines-covered/lines-valid attributes in: ${sourcePath}`);
  }

  const linesCovered = parseInt(linesCoveredStr, 10);
  const linesValid = parseInt(linesValidStr, 10);

  if (isNaN(linesCovered) || isNaN(linesValid)) {
    throw new Error(`Invalid lines-covered/lines-valid values in: ${sourcePath}`);
  }

  let branchesCovered = 0;
  let branchesValid = 0;

  if (branchesCoveredStr !== undefined && branchesValidStr !== undefined) {
    branchesCovered = parseInt(branchesCoveredStr, 10);
    branchesValid = parseInt(branchesValidStr, 10);
    if (isNaN(branchesCovered) || isNaN(branchesValid)) {
      throw new Error(`Invalid branches-covered/branches-valid values in: ${sourcePath}`);
    }
  }

  return { linesCovered, linesValid, branchesCovered, branchesValid };
}

function extractMethods(report: CoberturaReport): MethodEntry[] {
  const methods: MethodEntry[] = [];
  const packages = report.coverage.packages?.package;
  if (!packages) return methods;

  const packageList = Array.isArray(packages) ? packages : [packages];

  for (const pkg of packageList) {
    const classes = pkg.classes?.class;
    if (!classes) continue;

    const classList = Array.isArray(classes) ? classes : [classes];

    for (const cls of classList) {
      const classMethods = cls.methods?.method;
      if (!classMethods) continue;

      const methodList = Array.isArray(classMethods) ? classMethods : [classMethods];

      for (const m of methodList) {
        methods.push({
          key: {
            packageName: pkg["@_name"],
            className: cls["@_name"],
            name: m["@_name"],
            signature: m["@_signature"],
          },
          lineRate: parseFloat(m["@_line-rate"]),
        });
      }
    }
  }

  return methods;
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function extractFileLineData(
  report: CoberturaReport
): Map<string, { total: Set<number>; covered: Set<number> }> {
  const fileMap = new Map<string, { total: Set<number>; covered: Set<number> }>();
  const packages = toArray(report.coverage.packages?.package);

  for (const pkg of packages) {
    const classes = toArray(pkg.classes?.class);
    for (const cls of classes) {
      const filename = cls["@_filename"];
      const lines = toArray(cls.lines?.line);
      let entry = fileMap.get(filename);
      if (!entry) {
        entry = { total: new Set(), covered: new Set() };
        fileMap.set(filename, entry);
      }
      for (const line of lines) {
        const num = parseInt(line["@_number"], 10);
        if (!isNaN(num)) {
          entry.total.add(num);
          const hits = parseInt(line["@_hits"] || "0", 10);
          if (hits > 0) {
            entry.covered.add(num);
          }
        }
      }
    }
  }

  return fileMap;
}

function calcSingleFileCoverage(
  report: CoberturaReport,
  coverageType: CoverageType,
  sourcePath: string
): number {
  switch (coverageType) {
    case "line": {
      const lineRate = parseFloat(report.coverage["@_line-rate"]);
      if (isNaN(lineRate)) {
        throw new Error(`Invalid line-rate in: ${sourcePath}`);
      }
      return lineRate * 100;
    }

    case "branch": {
      const branchRate = parseFloat(report.coverage["@_branch-rate"]);
      if (isNaN(branchRate)) {
        throw new Error(`Invalid branch-rate in: ${sourcePath}`);
      }
      return branchRate * 100;
    }

    case "function": {
      const methods = extractMethods(report);
      if (methods.length === 0) {
        throw new Error(`No function coverage data in: ${sourcePath}`);
      }
      const covered = methods.filter((m) => !isNaN(m.lineRate) && m.lineRate > 0);
      return (covered.length / methods.length) * 100;
    }

    default:
      throw new Error(`Unknown coverage type: ${coverageType}`);
  }
}

export async function parseCoberturaCoerage(
  sourcePath: string,
  options: CoberturaOptions = {}
): Promise<number> {
  const report = await readAndParseCoberturaXml(sourcePath);
  return calcSingleFileCoverage(report, options.type || "line", sourcePath);
}

export async function mergeCoberturaCoerage(
  sourcePaths: string[],
  options: CoberturaOptions = {}
): Promise<number> {
  if (!sourcePaths || sourcePaths.length === 0) {
    throw new Error("At least one source path is required");
  }

  const coverageType = options.type || "line";

  if (coverageType === "function") {
    return mergeFunctionCoverage(sourcePaths);
  }

  if (coverageType === "line") {
    const merged = new Map<string, { total: Set<number>; covered: Set<number> }>();

    for (const sourcePath of sourcePaths) {
      const report = await readAndParseCoberturaXml(sourcePath);
      const fileMap = extractFileLineData(report);
      for (const [filename, data] of fileMap) {
        let entry = merged.get(filename);
        if (!entry) {
          entry = { total: new Set(), covered: new Set() };
          merged.set(filename, entry);
        }
        for (const num of data.total) {
          entry.total.add(num);
        }
        for (const num of data.covered) {
          entry.covered.add(num);
        }
      }
    }

    let totalValid = 0;
    let totalCovered = 0;
    for (const entry of merged.values()) {
      totalValid += entry.total.size;
      totalCovered += entry.covered.size;
    }

    if (totalValid === 0) return 0;
    return (totalCovered / totalValid) * 100;
  }

  let totalCovered = 0;
  let totalValid = 0;

  for (const sourcePath of sourcePaths) {
    const report = await readAndParseCoberturaXml(sourcePath);
    const counts = extractCounts(report, sourcePath);

    totalCovered += counts.branchesCovered;
    totalValid += counts.branchesValid;
  }

  if (totalValid === 0) {
    return 0;
  }

  return (totalCovered / totalValid) * 100;
}

async function mergeFunctionCoverage(sourcePaths: string[]): Promise<number> {
  const allMethods = new Map<string, MethodEntry>();

  for (const sourcePath of sourcePaths) {
    const report = await readAndParseCoberturaXml(sourcePath);
    const methods = extractMethods(report);

    for (const m of methods) {
      const key = `${m.key.packageName}|${m.key.className}|${m.key.name}|${m.key.signature}`;
      const existing = allMethods.get(key);
      if (!existing) {
        allMethods.set(key, m);
      } else if (
        !isNaN(m.lineRate) &&
        (isNaN(existing.lineRate) || m.lineRate > existing.lineRate)
      ) {
        existing.lineRate = m.lineRate;
      }
    }
  }

  if (allMethods.size === 0) {
    throw new Error("No function coverage data found in any report");
  }

  const covered = Array.from(allMethods.values()).filter(
    (m) => !isNaN(m.lineRate) && m.lineRate > 0
  );

  return (covered.length / allMethods.size) * 100;
}
