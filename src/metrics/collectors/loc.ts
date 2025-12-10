import { execCapture } from "../../utils/exec.js";
import { existsSync } from "fs";

/**
 * Options for lines of code (LOC) collection using SCC (Sloc Cloc and Code)
 * @interface LocOptions
 */
export interface LocOptions {
  /**
   * Required: Path to the directory to count lines of code
   * Can be relative or absolute path
   * @type {string}
   */
  path: string;

  /**
   * Optional: Patterns to exclude from LOC count
   * Each pattern is passed to scc as --exclude-dir
   * @type {string[] | undefined}
   * @example
   * excludePatterns: ['node_modules', 'dist', 'build']
   */
  excludePatterns?: string[];

  /**
   * Optional: Specific language to count LOC for
   * If provided, returns LOC count for that language only
   * @type {string | undefined}
   * @example
   * languageFilter: 'TypeScript'
   */
  languageFilter?: string;
}

/**
 * Represents a single language entry in SCC output
 * @interface SccLanguageResult
 */
export interface SccLanguageResult {
  /**
   * Language name (e.g., "TypeScript", "JavaScript", "JSON")
   * @type {string}
   */
  Name: string;

  /**
   * Total number of lines (code + comments + blanks)
   * @type {number}
   */
  Lines: number;

  /**
   * Number of lines containing code
   * @type {number}
   */
  Code: number;

  /**
   * Number of comment lines
   * @type {number}
   */
  Comments: number;

  /**
   * Number of blank lines
   * @type {number}
   */
  Blanks: number;

  /**
   * Complexity score (cyclomatic complexity estimate)
   * @type {number}
   */
  Complexity: number;
}

/**
 * SCC output format: array of language results
 * The array includes one entry per language detected, plus a special "Total" entry
 * containing aggregated statistics across all languages.
 *
 * @type {SccLanguageResult[]}
 * @example
 * [
 *   { Name: "TypeScript", Lines: 500, Code: 450, Comments: 30, Blanks: 20, Complexity: 15 },
 *   { Name: "JSON", Lines: 50, Code: 50, Comments: 0, Blanks: 0, Complexity: 0 },
 *   { Name: "Total", Lines: 550, Code: 500, Comments: 30, Blanks: 20, Complexity: 15 }
 * ]
 */
export type SccOutput = SccLanguageResult[];

/**
 * Collect lines of code (LOC) for a directory using SCC
 *
 * Executes SCC (Sloc Cloc and Code) with JSON output and parses the result.
 * Extracts the Code field from the Total entry, or language-specific count if
 * languageFilter is provided.
 *
 * @async
 * @function collectLoc
 * @param {LocOptions} options - Configuration for LOC collection
 * @param {string} options.path - Directory or file path to analyze
 * @param {string[] | undefined} options.excludePatterns - Patterns to exclude from count
 * @param {string | undefined} options.languageFilter - Specific language to count
 * @returns {Promise<number>} Total lines of code
 * @throws {Error} If SCC is unavailable, path is invalid, parsing fails, etc.
 *
 * @example
 * const loc = await collectLoc({ path: './src/' });
 * console.log(loc); // 5000
 *
 * @example
 * const loc = await collectLoc({
 *   path: './src/',
 *   excludePatterns: ['node_modules', 'dist'],
 *   languageFilter: 'TypeScript'
 * });
 */
export async function collectLoc(options: LocOptions): Promise<number> {
  const { path, excludePatterns, languageFilter } = options;

  // Validate input path
  if (!path || typeof path !== "string") {
    throw new Error("Path must be a non-empty string");
  }

  if (!existsSync(path)) {
    throw new Error(`Directory not found: ${path}`);
  }

  // Build SCC command arguments
  const args = ["--format", "json", path];

  // Add exclude patterns as individual arguments
  if (excludePatterns && Array.isArray(excludePatterns)) {
    excludePatterns.forEach((pattern) => {
      args.push("--exclude-dir", pattern);
    });
  }

  // Execute SCC command
  let output: string;
  try {
    output = await execCapture("scc", args);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("not found") || errorMessage.includes("No such file")) {
      throw new Error(
        "SCC is not installed. Install it with: brew install scc (macOS) or download from https://github.com/boyter/scc/releases"
      );
    }
    if (errorMessage.includes("EACCES") || errorMessage.includes("Permission denied")) {
      throw new Error(`Permission denied accessing: ${path}`);
    }
    throw new Error(`SCC execution failed: ${errorMessage}`);
  }

  // Parse JSON output
  let sccOutput: SccOutput;
  try {
    sccOutput = JSON.parse(output);
  } catch {
    throw new Error(`Failed to parse SCC output. Expected JSON but got: ${output.slice(0, 100)}`);
  }

  if (sccOutput.length === 0) {
    return 0;
  }

  // If language filter is specified, find matching language
  if (languageFilter) {
    const languageEntry = sccOutput.find(
      (entry) => entry.Name.toLowerCase() === languageFilter.toLowerCase()
    );

    if (!languageEntry) {
      const availableLanguages = sccOutput
        .filter((entry) => entry.Name !== "Total")
        .map((entry) => entry.Name)
        .join(", ");
      throw new Error(
        `Language "${languageFilter}" not found in results. Available languages: ${availableLanguages}`
      );
    }

    return languageEntry.Code;
  }

  // Find Total entry (standard SCC output includes this)
  const totalEntry = sccOutput.find((entry) => entry.Name === "Total");

  // If no Total entry, calculate by summing all language entries
  if (!totalEntry) {
    const totalCode = sccOutput
      .filter((entry) => entry.Name !== "Total")
      .reduce((sum, entry) => sum + entry.Code, 0);

    return totalCode;
  }

  // Return Code field from Total entry
  return totalEntry.Code;
}
