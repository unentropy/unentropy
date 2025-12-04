#!/usr/bin/env bun

import { build } from "bun";
import { resolve, dirname } from "path";
import { mkdir } from "fs/promises";

const buildAction = async (entrypoint: string, outdir: string, outfile: string): Promise<void> => {
  const outPath = resolve(outdir, outfile);
  console.log(`Building ${entrypoint} -> ${outPath}`);

  await mkdir(dirname(outPath), { recursive: true });

  await build({
    entrypoints: [entrypoint],
    outdir,
    target: "bun",
    naming: outfile,
    minify: true,
  });

  console.log(`✓ Built ${outfile}`);
};

const main = async () => {
  try {
    await buildAction(
      "./src/actions/track-metrics.ts",
      "./.github/actions/track-metrics/dist",
      "track-metrics.js"
    );

    await buildAction(
      "./src/actions/quality-gate.ts",
      "./.github/actions/quality-gate/dist",
      "quality-gate.js"
    );

    console.log("\n✓ All actions built successfully");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
};

main();
