import { execCapture } from "../../utils/exec.js";
import fg from "fast-glob";

export interface SizeOptions {
  followSymlinks?: boolean;
  excludePatterns?: string[];
}

/**
 * Parse size of a file or directory using `du` command
 * Returns size in bytes
 * Supports glob patterns
 */
export async function parseSize(sourcePath: string, options: SizeOptions = {}): Promise<number> {
  // Validate input path
  if (!sourcePath || typeof sourcePath !== "string") {
    throw new Error("Source path must be a non-empty string");
  }

  // Check if path contains glob patterns
  const hasGlobPattern = /[*?[\]{}]/.test(sourcePath);

  if (hasGlobPattern) {
    // Expand glob pattern to get list of matching files
    const matchedPaths = await fg(sourcePath, {
      onlyFiles: false,
      followSymbolicLinks: options.followSymlinks ?? false,
      ignore: options.excludePatterns ?? [],
    });

    if (matchedPaths.length === 0) {
      throw new Error(`No files matched glob pattern: ${sourcePath}`);
    }

    // Calculate total size of all matched paths
    let totalSize = 0;
    for (const path of matchedPaths) {
      const args = options.followSymlinks ? ["-sbL", path] : ["-sb", path];
      const output = await execCapture("du", args);
      const size = parseDuOutput(output);
      totalSize += size;
    }

    return totalSize;
  }

  // Build du command arguments for non-glob paths
  const args = options.followSymlinks ? ["-sbL", sourcePath] : ["-sb", sourcePath];

  // Execute du command and get output
  const output = await execCapture("du", args);

  return parseDuOutput(output);
}

function parseDuOutput(output: string): number {
  // Parse output: format is "size\tpath"
  const trimmedOutput = output.trim();
  if (!trimmedOutput) {
    throw new Error("du command returned empty output");
  }

  const match = trimmedOutput.match(/^(\d+)/);
  if (!match) {
    throw new Error(`Unable to parse du output: ${trimmedOutput}`);
  }

  const sizeStr = match[1];
  if (!sizeStr) {
    throw new Error(`Unable to extract size from du output: ${trimmedOutput}`);
  }

  const sizeInBytes = parseInt(sizeStr, 10);
  if (isNaN(sizeInBytes)) {
    throw new Error(`Invalid size value in du output: ${sizeStr}`);
  }

  return sizeInBytes;
}
