#!/usr/bin/env -S npx tsx

import { build } from "esbuild";
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
    entryPoints: [entrypoint],
    outfile: outPath,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    minify: true,
    banner: {
      js: '#!/usr/bin/env node\nimport { createRequire as __cr } from "node:module";const require = __cr(import.meta.url);',
    },
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
