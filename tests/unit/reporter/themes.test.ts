import { describe, test, expect } from "bun:test";
import { resolveTheme, BUILT_IN_THEME_NAMES } from "../../../src/reporter/templates/default/themes";

describe("resolveTheme", () => {
  test("returns Lattice palette by default", () => {
    const theme = resolveTheme(undefined);
    expect(theme.name).toBe("lattice");
    expect(theme.dark["--bg"]).toBe("#1c2230");
    expect(theme.dark["--accent"]).toBe("#6fb3d2");
    expect(theme.light["--bg"]).toBe("#f4f6fa");
    expect(theme.light["--accent"]).toBe("#2c7ea2");
  });

  test("resolves a built-in palette by name (Lattice)", () => {
    const theme = resolveTheme("lattice");
    expect(theme.name).toBe("lattice");
    expect(theme.dark["--accent"]).toBe("#6fb3d2");
  });

  test("exposes the list of built-in names", () => {
    expect(BUILT_IN_THEME_NAMES).toContain("lattice");
  });

  test("every Lattice variable is a 7-char hex string", () => {
    const theme = resolveTheme("lattice");
    const required = [
      "--bg",
      "--surface",
      "--surface-card",
      "--border",
      "--border-soft",
      "--text",
      "--text-dim",
      "--text-muted",
      "--accent",
      "--up",
      "--down",
      "--warn",
    ] as const;
    for (const key of required) {
      expect(theme.dark[key]).toMatch(/^#[0-9a-f]{6}$/);
      expect(theme.light[key]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe("custom theme override", () => {
  test("accepts a full custom theme object", () => {
    const custom = {
      dark: { ...resolveTheme("lattice").dark, "--accent": "#ff00ff" },
      light: { ...resolveTheme("lattice").light, "--accent": "#aa00aa" },
    };
    const theme = resolveTheme(custom);
    expect(theme.name).toBe("custom");
    expect(theme.dark["--accent"]).toBe("#ff00ff");
    expect(theme.light["--accent"]).toBe("#aa00aa");
  });

  test("fills missing variables from Lattice defaults", () => {
    const partial = {
      dark: { "--accent": "#ff00ff" },
      light: { "--accent": "#aa00aa" },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const theme = resolveTheme(partial as any);
    expect(theme.dark["--accent"]).toBe("#ff00ff");
    expect(theme.dark["--bg"]).toBe("#1c2230"); // Lattice default
  });
});

describe("built-in palettes", () => {
  const accents = {
    lattice: { dark: "#6fb3d2", light: "#2c7ea2" },
    flux: { dark: "#d4a574", light: "#9c6a1e" },
    halftone: { dark: "#b48bc8", light: "#7d4ba5" },
    specimen: { dark: "#6db49a", light: "#2f7d62" },
  };

  test.each(Object.entries(accents))(
    "%s has its expected accent in dark/light",
    (name, expected) => {
      const theme = resolveTheme(name);
      expect(theme.dark["--accent"]).toBe(expected.dark);
      expect(theme.light["--accent"]).toBe(expected.light);
    }
  );

  test("BUILT_IN_THEME_NAMES contains all four", () => {
    expect(BUILT_IN_THEME_NAMES).toEqual(
      expect.arrayContaining(["lattice", "flux", "halftone", "specimen"])
    );
  });
});
