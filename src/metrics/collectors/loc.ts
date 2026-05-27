import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";
import fg from "fast-glob";
import sloc from "sloc";
import { getExtensionsForLanguage, isExtensionSupported } from "./loc/language-map.js";

/**
 * Options for lines of code (LOC) collection using the embedded `sloc` library.
 * @interface LocOptions
 */
export interface LocOptions {
  /**
   * Required (unless paths is provided): Path to the directory to count lines of code.
   * Can be relative or absolute path.
   * @type {string}
   */
  path?: string;

  /**
   * Optional: Multiple paths or glob patterns for file discovery.
   * When provided, uses fast-glob instead of the custom walker.
   * @type {string[] | undefined}
   */
  paths?: string[];

  /**
   * Optional: Working directory for resolving relative paths and glob patterns.
   * @type {string | undefined}
   */
  cwd?: string;

  /**
   * Optional: Patterns to exclude from LOC count.
   * Directory names matching any pattern are skipped.
   * @type {string[] | undefined}
   * @example
   * excludePatterns: ['node_modules', 'dist', 'build']
   */
  excludePatterns?: string[];

  /**
   * Optional: Specific language to count LOC for.
   * If provided, returns LOC count for that language only.
   * @type {string | undefined}
   * @example
   * languageFilter: 'TypeScript'
   */
  languageFilter?: string;
}

/**
 * Collect lines of code (LOC) for a directory using the embedded `sloc` library.
 *
 * Walks the directory tree, applies exclude and language filters, and sums
 * source lines across all matched files. Files with extensions supported by
 * `sloc` are parsed for accurate source/comment/blank classification; other
 * files fall back to counting non-empty lines.
 *
 * @async
 * @function collectLoc
 * @param {LocOptions} options - Configuration for LOC collection
 * @param {string} options.path - Directory path to analyze
 * @param {string[] | undefined} options.excludePatterns - Directory names to exclude
 * @param {string | undefined} options.languageFilter - Specific language to count
 * @returns {Promise<number>} Total lines of code
 * @throws {Error} If path is invalid or language filter is unrecognized.
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
  const { path, paths, cwd, excludePatterns, languageFilter } = options;

  if (path !== undefined && (!path || typeof path !== "string")) {
    throw new Error("Path must be a non-empty string");
  }

  let files: string[];

  if (paths && paths.length > 0) {
    files = await fg(paths, {
      onlyFiles: true,
      followSymbolicLinks: false,
      ignore: excludePatterns ?? [],
      cwd: cwd || process.cwd(),
      absolute: true,
    });
  } else if (path) {
    if (!existsSync(path)) {
      throw new Error(`Directory not found: ${path}`);
    }

    const stats = statSync(path);
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${path}`);
    }

    const excludeSet = new Set((excludePatterns || []).map((p) => p.toLowerCase()));
    files = walkDirectory(path, excludeSet);
  } else {
    throw new Error("Either path or paths must be provided");
  }

  let allowedExtensions: Set<string> | undefined;
  if (languageFilter) {
    const extensions = getExtensionsForLanguage(languageFilter);
    allowedExtensions = new Set(extensions.map((e) => `.${e}`));
  }

  let totalLoc = 0;

  for (const filePath of files) {
    const ext = extname(filePath).toLowerCase();

    if (allowedExtensions && !allowedExtensions.has(ext)) {
      continue;
    }

    const content = readFileSync(filePath, "utf-8");
    const extensionWithoutDot = ext.slice(1);

    if (isExtensionSupported(extensionWithoutDot)) {
      const stats = sloc(content, extensionWithoutDot);
      totalLoc += stats.source;
    } else {
      totalLoc += countNonEmptyLines(content);
    }
  }

  return totalLoc;
}

/**
 * Recursively walks a directory and returns the full paths of all files,
 * skipping directories whose basename matches any entry in `excludeSet`.
 */
function walkDirectory(dirPath: string, excludeSet: Set<string>): string[] {
  const results: string[] = [];
  const entries = readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (!excludeSet.has(entry.name.toLowerCase())) {
        results.push(...walkDirectory(fullPath, excludeSet));
      }
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Counts lines that are not empty after trimming.
 * Used as a fallback for file extensions not supported by `sloc`.
 */
function countNonEmptyLines(content: string): number {
  return content.split("\n").filter((line) => line.trim().length > 0).length;
}
