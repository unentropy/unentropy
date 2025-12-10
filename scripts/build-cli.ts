#!/usr/bin/env bun

import { build } from "bun";
import { resolve, dirname } from "path";
import { mkdir } from "fs/promises";

const buildCli = async (): Promise<void> => {
  const entrypoint = "./src/index.ts";
  const outdir = "./dist";
  const outfile = "index.js";
  const outPath = resolve(outdir, outfile);

  console.log(`Building CLI ${entrypoint} -> ${outPath}`);

  await mkdir(dirname(outPath), { recursive: true });

  await build({
    entrypoints: [entrypoint],
    outdir,
    target: "node",
    naming: outfile,
    minify: true,
    banner: "#!/usr/bin/env bun",
  });

  console.log(`✓ Built ${outfile}`);
};

const main = async () => {
  try {
    await buildCli();
    console.log("\n✓ CLI built successfully");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
};

main();
