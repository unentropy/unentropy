import type { Argv } from "yargs";
import fg from "fast-glob";
import { readFileSync } from "fs";
import { extname, resolve } from "path";
import sloc from "sloc";
import { loadConfig } from "../../config/loader.js";
import { isExtensionSupported } from "../../metrics/collectors/loc/language-map.js";
import { cmd } from "./cmd";

interface SourcesArgs {
  config?: string;
  absolute?: boolean;
  loc?: boolean;
  sort?: string;
}

export const SourcesCommand = cmd({
  command: "sources",
  describe: "list files in the analysis scope (sources)",
  builder: (yargs: Argv<SourcesArgs>) => {
    return yargs
      .option("config", {
        alias: "c",
        type: "string",
        default: "unentropy.json",
        description: "Path to configuration file",
      })
      .option("absolute", {
        type: "boolean",
        default: false,
        description: "Print absolute paths instead of relative",
      })
      .option("loc", {
        alias: "l",
        type: "boolean",
        default: false,
        description: "Show lines of code per file",
      })
      .option("sort", {
        type: "string",
        default: "name",
        description: "Sort by name or loc (loc requires --loc)",
        choices: ["name", "loc"] as const,
      });
  },
  async handler(argv: SourcesArgs) {
    const resolvedConfigPath = argv.config || "unentropy.json";
    const showLoc = argv.loc ?? false;
    const sortBy = argv.sort || "name";
    const useAbsolute = argv.absolute ?? false;

    let config;
    try {
      config = await loadConfig(resolvedConfigPath);
    } catch {
      console.error(
        `Error: Config file not found: ${resolvedConfigPath}\nRun 'bunx unentropy init' to create one.`
      );
      process.exit(1);
    }

    if (!config.sources || config.sources.length === 0) {
      console.error(
        `Error: No sources configured in ${resolvedConfigPath}\nAdd a "sources" array to your configuration.`
      );
      process.exit(1);
    }

    if (sortBy === "loc" && !showLoc) {
      console.error("Error: --sort loc requires --loc");
      process.exit(1);
    }

    const projectRoot = config.basePath || process.cwd();

    let files: string[];
    try {
      files = await fg(config.sources, {
        onlyFiles: true,
        followSymbolicLinks: false,
        cwd: projectRoot,
        absolute: useAbsolute,
      });
    } catch (error) {
      console.error(
        `Error: Failed to resolve sources: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }

    if (files.length === 0) {
      return;
    }

    if (showLoc) {
      const fileData: { path: string; loc: number }[] = [];
      let totalLoc = 0;
      let readErrors = 0;

      for (const filePath of files) {
        try {
          const resolvedPath = useAbsolute ? filePath : resolve(projectRoot, filePath);
          const content = readFileSync(resolvedPath, "utf-8");
          const ext = extname(filePath).toLowerCase().slice(1);
          let sourceLoc: number;
          if (isExtensionSupported(ext)) {
            const stats = sloc(content, ext);
            sourceLoc = stats.source;
          } else {
            sourceLoc = content.split("\n").filter((line) => line.trim().length > 0).length;
          }
          fileData.push({ path: filePath, loc: sourceLoc });
          totalLoc += sourceLoc;
        } catch {
          readErrors++;
        }
      }

      if (sortBy === "loc") {
        fileData.sort((a, b) => a.loc - b.loc);
      } else {
        fileData.sort((a, b) => a.path.localeCompare(b.path));
      }

      const pathHeader = "Path";
      const locHeader = "LOC";
      const maxPathLen = Math.max(pathHeader.length, ...fileData.map((f) => f.path.length));
      const colWidth = maxPathLen + 2;

      console.log(`${pathHeader.padEnd(colWidth)}${locHeader}`);

      for (const entry of fileData) {
        const locStr = String(entry.loc);
        console.log(`${entry.path.padEnd(colWidth)}${locStr.padStart(8)}`);
      }

      const separatorLen = Math.max(colWidth + 8, 24);
      console.log("─".repeat(separatorLen));

      const errorNote = readErrors > 0 ? ` (${readErrors} file(s) skipped due to read errors)` : "";
      console.log(`${fileData.length} file(s), ${totalLoc.toLocaleString()} LOC${errorNote}`);
    } else {
      files.sort((a, b) => a.localeCompare(b));

      for (const filePath of files) {
        console.log(filePath);
      }
    }
  },
});
