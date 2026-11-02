import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { copyFileSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { CONFIG_TEMPLATES } from "../../../../src/cli/init/templates.js";
import { executeCollect } from "../../../../src/collector/collect-runner.js";

const collectCommands = Object.entries(CONFIG_TEMPLATES).flatMap(([projectType, template]) =>
  Object.entries(template.metrics)
    .filter(([, metric]) => metric.command.startsWith("@collect "))
    .map(([metricName, metric]) => ({
      label: `${projectType} ${metricName}`,
      args: metric.command.slice("@collect ".length),
    }))
);

describe("init templates", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "unentropy-templates-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it.each(collectCommands)("$label uses a known @collect collector", async ({ args }) => {
    const result = await executeCollect(args, undefined, tempDir);
    expect(result.error ?? "").not.toMatch(/Unknown (arguments|collector)/);
  });

  it("PHP test-coverage reads the Clover report that the suggested phpunit command writes", async () => {
    copyFileSync(
      join(process.cwd(), "tests/fixtures/clover/sample.xml"),
      join(tempDir, "coverage.xml")
    );
    const command = CONFIG_TEMPLATES.php.metrics["test-coverage"]?.command ?? "";

    const result = await executeCollect(command.slice("@collect ".length), undefined, tempDir);

    expect(result).toEqual({ success: true, value: "75" });
  });
});
