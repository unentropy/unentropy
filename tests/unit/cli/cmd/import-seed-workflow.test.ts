import { describe, test, expect } from "bun:test";
import { renderSeedWorkflow } from "../../../../src/cli/cmd/import-seed-workflow";

describe("renderSeedWorkflow", () => {
  test("emits canonical YAML with default artifact name", () => {
    const yaml = renderSeedWorkflow("unentropy-metrics");
    expect(yaml).toContain("name: unentropy seed");
    expect(yaml).toContain('branches: ["unentropy-import-*"]');
    expect(yaml).toContain("uses: actions/checkout@v4");
    expect(yaml).toContain("uses: actions/upload-artifact@v4");
    expect(yaml).toContain("name: unentropy-metrics");
    expect(yaml).toContain("path: seed.db");
    expect(yaml).toContain("if-no-files-found: error");
    expect(yaml).toContain("retention-days: 90");
  });

  test("substitutes a custom artifact name", () => {
    const yaml = renderSeedWorkflow("custom-metrics");
    expect(yaml).toContain("name: custom-metrics");
    expect(yaml).not.toContain("name: unentropy-metrics");
  });

  test("output is deterministic across calls", () => {
    const a = renderSeedWorkflow("unentropy-metrics");
    const b = renderSeedWorkflow("unentropy-metrics");
    expect(a).toBe(b);
  });

  test("emitted YAML ends with a newline so it is git-friendly", () => {
    const yaml = renderSeedWorkflow("unentropy-metrics");
    expect(yaml.endsWith("\n")).toBe(true);
  });
});
