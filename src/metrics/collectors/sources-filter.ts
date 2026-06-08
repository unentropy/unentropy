import { isAbsolute, relative, basename } from "path";
import mm from "micromatch";

export function matchesSources(filePath: string, sources: string[], basePath?: string): boolean {
  let normalized = filePath.replace(/\\/g, "/");

  if (basePath && isAbsolute(normalized)) {
    const base = basePath.replace(/\\/g, "/").replace(/\/$/, "");
    if (normalized.startsWith(base + "/")) {
      normalized = relative(base, normalized);
    } else {
      const baseDir = basename(base);
      const idx = normalized.indexOf("/" + baseDir + "/");
      if (idx !== -1) {
        normalized = normalized.slice(idx + baseDir.length + 2);
      }
    }
  }

  normalized = normalized.replace(/^\.\//, "");

  const matched = mm.match([normalized], sources);
  return matched.length > 0;
}
