import { isAbsolute, relative } from "path";
import mm from "micromatch";

export function matchesSources(filePath: string, sources: string[], basePath?: string): boolean {
  let normalized = filePath.replace(/\\/g, "/").replace(/^\.\//, "");

  if (basePath && isAbsolute(normalized)) {
    normalized = relative(basePath.replace(/\\/g, "/").replace(/\/$/, ""), normalized);
  }

  const matched = mm.match([normalized], sources);
  return matched.length > 0;
}
