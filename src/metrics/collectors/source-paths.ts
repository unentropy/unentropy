import fg from "fast-glob";
import { resolve, isAbsolute } from "path";

const GLOB_CHARACTERS = /[*?[\]{}]/;

export async function expandSourcePaths(
  sourcePaths: string[],
  basePath?: string
): Promise<string[]> {
  const expanded: string[] = [];

  for (const sourcePath of sourcePaths) {
    if (!GLOB_CHARACTERS.test(sourcePath)) {
      expanded.push(
        isAbsolute(sourcePath) || !basePath ? sourcePath : resolve(basePath, sourcePath)
      );
      continue;
    }

    const matches = await fg(sourcePath, {
      onlyFiles: true,
      cwd: basePath || process.cwd(),
      absolute: true,
    });

    if (matches.length === 0) {
      throw new Error(`No files matched glob pattern: ${sourcePath}`);
    }

    expanded.push(...matches.sort());
  }

  return expanded;
}
