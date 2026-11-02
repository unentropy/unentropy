import fg from "fast-glob";
import { resolve } from "path";

const GLOB_CHARACTERS = /[*?[\]{}]/;

export async function expandSourcePaths(
  sourcePaths: string[],
  basePath?: string
): Promise<string[]> {
  const cwd = basePath || process.cwd();
  const expanded = new Set<string>();

  for (const sourcePath of sourcePaths) {
    if (!GLOB_CHARACTERS.test(sourcePath)) {
      expanded.add(resolve(cwd, sourcePath));
      continue;
    }

    const matches = await fg(sourcePath, {
      onlyFiles: true,
      cwd,
      absolute: true,
    });

    if (matches.length === 0) {
      throw new Error(`No files matched glob pattern: ${sourcePath}`);
    }

    for (const match of matches.sort()) {
      expanded.add(resolve(match));
    }
  }

  return [...expanded];
}
