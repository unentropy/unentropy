import { readFile } from "fs/promises";
import { XMLParser } from "fast-xml-parser";

export type CoverageType = "line" | "branch" | "function";

export interface CoberturaOptions {
  fallback?: number;
  type?: CoverageType;
}

interface CoberturaMethod {
  "@_name": string;
  "@_signature": string;
  "@_line-rate": string;
  "@_branch-rate": string;
}

interface CoberturaClass {
  "@_name": string;
  "@_filename": string;
  "@_line-rate": string;
  "@_branch-rate": string;
  methods?: {
    method?: CoberturaMethod | CoberturaMethod[];
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

export async function parseCoberturaCoerage(
  sourcePath: string,
  options: CoberturaOptions = {}
): Promise<number> {
  if (!sourcePath || typeof sourcePath !== "string") {
    throw new Error("Source path must be a non-empty string");
  }

  const coverageType = options.type || "line";

  const xmlContent = await readFile(sourcePath, "utf-8");

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });

  let report: CoberturaReport;
  try {
    report = parser.parse(xmlContent) as CoberturaReport;
  } catch {
    return options.fallback ?? 0;
  }

  if (!report.coverage) {
    return options.fallback ?? 0;
  }

  switch (coverageType) {
    case "line": {
      const lineRate = parseFloat(report.coverage["@_line-rate"]);
      if (isNaN(lineRate)) {
        return options.fallback ?? 0;
      }
      return lineRate * 100;
    }

    case "branch": {
      const branchRate = parseFloat(report.coverage["@_branch-rate"]);
      if (isNaN(branchRate)) {
        return options.fallback ?? 0;
      }
      return branchRate * 100;
    }

    case "function": {
      const functionCoverage = calculateFunctionCoverage(report);
      if (functionCoverage === null) {
        return options.fallback ?? 0;
      }
      return functionCoverage;
    }

    default:
      return options.fallback ?? 0;
  }
}

function calculateFunctionCoverage(report: CoberturaReport): number | null {
  const methods: CoberturaMethod[] = [];

  const packages = report.coverage.packages?.package;
  if (!packages) {
    return null;
  }

  const packageList = Array.isArray(packages) ? packages : [packages];

  for (const pkg of packageList) {
    const classes = pkg.classes?.class;
    if (!classes) continue;

    const classList = Array.isArray(classes) ? classes : [classes];

    for (const cls of classList) {
      const classMethods = cls.methods?.method;
      if (!classMethods) continue;

      const methodList = Array.isArray(classMethods) ? classMethods : [classMethods];
      methods.push(...methodList);
    }
  }

  if (methods.length === 0) {
    return null;
  }

  const coveredMethods = methods.filter((method) => {
    const lineRate = parseFloat(method["@_line-rate"]);
    return !isNaN(lineRate) && lineRate > 0;
  });

  return (coveredMethods.length / methods.length) * 100;
}
