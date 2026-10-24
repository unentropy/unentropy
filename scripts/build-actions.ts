#!/usr/bin/env -S npx tsx

import { build } from "esbuild";
import { resolve, dirname } from "path";
import { mkdir } from "fs/promises";

interface ActionBuild {
  name: string;
  runner: string;
  module: string;
}

const actions: ActionBuild[] = [
  { name: "track-metrics", runner: "runTrackMetricsAction", module: "./track-metrics" },
  { name: "quality-gate", runner: "runQualityGateAction", module: "./quality-gate" },
];

const entryContents = ({ runner, module }: ActionBuild): string =>
  [
    `import * as core from "@actions/core";`,
    `import { ${runner} } from "${module}";`,
    `${runner}().catch((e) => { core.setFailed(\`Unhandled error: \${e instanceof Error ? e.message : String(e)}\`); process.exit(1); });`,
  ].join("\n");

const buildAction = async (action: ActionBuild): Promise<void> => {
  const outfile = `${action.name}.mjs`;
  const outPath = resolve(`./.github/actions/${action.name}/dist`, outfile);
  console.log(`Building ${action.name} -> ${outPath}`);

  await mkdir(dirname(outPath), { recursive: true });

  await build({
    stdin: {
      contents: entryContents(action),
      resolveDir: resolve("./src/actions"),
      sourcefile: `${action.name}.entry.ts`,
      loader: "ts",
    },
    outfile: outPath,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node24",
    minify: true,
    banner: {
      js: 'import { createRequire as __cr } from "node:module";const require = __cr(import.meta.url);',
    },
  });

  console.log(`✓ Built ${outfile}`);
};

const main = async () => {
  try {
    for (const action of actions) {
      await buildAction(action);
    }

    console.log("\n✓ All actions built successfully");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
};

main();
