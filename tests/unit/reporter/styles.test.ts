import { describe, test, expect } from "bun:test";
import { buildStyleSheet } from "../../../src/reporter/templates/default/styles";
import { resolveTheme } from "../../../src/reporter/templates/default/themes";

describe("buildStyleSheet", () => {
  const lattice = resolveTheme("lattice");

  test("emits both dark and light palettes so the runtime toggle can switch", () => {
    const css = buildStyleSheet(lattice);
    expect(css).toContain(":root {");
    expect(css).toContain("--bg: #1c2230"); // Lattice dark
    expect(css).toContain("--bg: #f4f6fa"); // Lattice light
  });

  test("emits prefers-color-scheme block so OS preference is followed by default", () => {
    const css = buildStyleSheet(lattice);
    expect(css).toContain("@media (prefers-color-scheme: light)");
  });

  test("emits [data-theme] override selectors for both modes", () => {
    const css = buildStyleSheet(lattice);
    expect(css).toContain('[data-theme="dark"]');
    expect(css).toContain('[data-theme="light"]');
  });

  test("includes the semantic component layer", () => {
    const css = buildStyleSheet(lattice);
    expect(css).toContain(".uent-titlebar");
    expect(css).toContain(".uent-section-head");
    expect(css).toContain(".uent-card");
    expect(css).toContain(".uent-statusbar");
    expect(css).toContain(".uent-chip");
    expect(css).toContain(".uent-stat-v");
    expect(css).toContain(".uent-trend-up");
    expect(css).toContain(".uent-trend-down");
    expect(css).toContain(".uent-trend-stable");
    expect(css).toContain(".uent-theme-toggle");
  });

  test("includes the print media rules", () => {
    const css = buildStyleSheet(lattice);
    expect(css).toContain("@media print");
    expect(css).toContain("page-break-inside: avoid");
  });
});
