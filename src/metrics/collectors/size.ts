import { lstat } from "fs/promises";
import getFolderSize from "get-folder-size";
import fg from "fast-glob";
import { resolve } from "path";

export interface SizeOptions {
  excludePatterns?: string[];
  cwd?: string;
}

export async function parseSize(sourcePath: string, options: SizeOptions = {}): Promise<number> {
  if (!sourcePath || typeof sourcePath !== "string") {
    throw new Error("Source path must be a non-empty string");
  }

  const hasGlobPattern = /[*?[\]{}]/.test(sourcePath);

  if (hasGlobPattern) {
    const matchedPaths = await fg(sourcePath, {
      onlyFiles: false,
      followSymbolicLinks: false,
      ignore: options.excludePatterns ?? [],
      cwd: options.cwd || process.cwd(),
      absolute: true,
    });

    if (matchedPaths.length === 0) {
      throw new Error(`No files matched glob pattern: ${sourcePath}`);
    }

    let totalSize = 0;
    for (const matchedPath of matchedPaths) {
      totalSize += Number(await getFolderSize.strict(matchedPath));
    }

    return totalSize;
  }

  const resolvedPath = options.cwd ? resolve(options.cwd, sourcePath) : sourcePath;
  return Number(await getFolderSize.strict(resolvedPath));
}

export async function collectSize(paths: string[], options: SizeOptions = {}): Promise<number> {
  if (!paths || paths.length === 0) {
    throw new Error("At least one path is required");
  }

  const files = await fg(paths, {
    onlyFiles: true,
    followSymbolicLinks: false,
    ignore: options.excludePatterns ?? [],
    cwd: options.cwd || process.cwd(),
    absolute: true,
  });

  let totalSize = 0;
  for (const file of files) {
    const stats = await lstat(file);
    totalSize += stats.size;
  }

  return totalSize;
}
