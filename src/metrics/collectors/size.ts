import getFolderSize from "get-folder-size";
import fg from "fast-glob";

export interface SizeOptions {
  excludePatterns?: string[];
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

  return Number(await getFolderSize.strict(sourcePath));
}
