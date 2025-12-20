import yargs from "yargs";
import { collectLoc } from "../metrics/collectors/loc";
import { parseSize } from "../metrics/collectors/size";
import { parseLcovCoverage, type CoverageType } from "../metrics/collectors/lcov";
import { parseCoberturaCoerage } from "../metrics/collectors/cobertura";

export interface CollectResult {
  success: boolean;
  value: string;
  error?: string;
}

const AVAILABLE_COLLECTORS = ["loc", "size", "coverage-lcov", "coverage-cobertura"];

export async function executeCollect(collectArgs: string): Promise<CollectResult> {
  const args = parseArguments(collectArgs);

  if (args.length === 0) {
    return {
      success: false,
      value: "",
      error: "No collector specified. Available collectors: " + AVAILABLE_COLLECTORS.join(", "),
    };
  }

  let result: CollectResult = {
    success: false,
    value: "",
    error: `Unknown collector. Available collectors: ${AVAILABLE_COLLECTORS.join(", ")}`,
  };

  try {
    await yargs()
      .scriptName("@collect")
      .command(
        "loc <path>",
        "collect lines of code",
        (y) =>
          y
            .positional("path", { type: "string", demandOption: true })
            .option("language", { alias: "l", type: "string" })
            .option("exclude", { alias: "e", type: "string", array: true }),
        async (argv) => {
          const value = await collectLoc({
            path: argv.path,
            languageFilter: argv.language,
            excludePatterns: argv.exclude,
          });
          result = { success: true, value: String(value) };
        }
      )
      .command(
        "size <paths..>",
        "calculate size of files",
        (y) =>
          y
            .positional("paths", { type: "string", array: true, demandOption: true })
            .option("followSymlinks", { type: "boolean", default: false }),
        async (argv) => {
          const paths = argv.paths ?? [];
          if (paths.length === 0) {
            throw new Error("At least one path is required");
          }
          let totalSize = 0;
          for (const path of paths) {
            totalSize += await parseSize(path, { followSymlinks: argv.followSymlinks });
          }
          result = { success: true, value: String(totalSize) };
        }
      )
      .command(
        "coverage-lcov <sourcePath>",
        "parse LCOV coverage",
        (y) =>
          y
            .positional("sourcePath", { type: "string", demandOption: true })
            .option("type", {
              alias: "t",
              type: "string",
              choices: ["line", "branch", "function"] as const,
              default: "line",
            })
            .option("fallback", { type: "number" }),
        async (argv) => {
          const value = await parseLcovCoverage(argv.sourcePath, {
            type: argv.type as CoverageType,
            fallback: argv.fallback,
          });
          result = { success: true, value: String(value) };
        }
      )
      .command(
        "coverage-cobertura <sourcePath>",
        "parse Cobertura coverage",
        (y) =>
          y
            .positional("sourcePath", { type: "string", demandOption: true })
            .option("type", {
              alias: "t",
              type: "string",
              choices: ["line", "branch", "function"] as const,
              default: "line",
            })
            .option("fallback", { type: "number" }),
        async (argv) => {
          const value = await parseCoberturaCoerage(argv.sourcePath, {
            type: argv.type as CoverageType,
            fallback: argv.fallback,
          });
          result = { success: true, value: String(value) };
        }
      )
      .fail((msg, err) => {
        result = {
          success: false,
          value: "",
          error: err?.message || msg || "Unknown error",
        };
      })
      .strict()
      .parse(args);
  } catch (error) {
    result = {
      success: false,
      value: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }

  return result;
}

function parseArguments(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inQuote: string | null = null;

  for (const char of input) {
    if (inQuote) {
      if (char === inQuote) {
        inQuote = null;
      } else {
        current += char;
      }
    } else if (char === '"' || char === "'") {
      inQuote = char;
    } else if (char === " " || char === "\t") {
      if (current) {
        tokens.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}
