export const THEME_VAR_NAMES = [
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

export type ThemeVarName = (typeof THEME_VAR_NAMES)[number];

export type ThemeVariant = Record<ThemeVarName, string>;

export interface ResolvedTheme {
  name: string;
  dark: ThemeVariant;
  light: ThemeVariant;
}

const LATTICE: ResolvedTheme = {
  name: "lattice",
  dark: {
    "--bg": "#1c2230",
    "--surface": "#161b27",
    "--surface-card": "#11151f",
    "--border": "#2a3148",
    "--border-soft": "#262d42",
    "--text": "#cad3e0",
    "--text-dim": "#9aa6bb",
    "--text-muted": "#5a6680",
    "--accent": "#6fb3d2",
    "--up": "#8ec07c",
    "--down": "#e08490",
    "--warn": "#d4a663",
  },
  light: {
    "--bg": "#f4f6fa",
    "--surface": "#e8ecf2",
    "--surface-card": "#ffffff",
    "--border": "#d0d6e0",
    "--border-soft": "#dde2ea",
    "--text": "#2a3344",
    "--text-dim": "#4f5a72",
    "--text-muted": "#7c8699",
    "--accent": "#2c7ea2",
    "--up": "#4a8d3a",
    "--down": "#b94656",
    "--warn": "#a67224",
  },
};

const FLUX: ResolvedTheme = {
  name: "flux",
  dark: {
    "--bg": "#1f2128",
    "--surface": "#181a20",
    "--surface-card": "#12141a",
    "--border": "#2d2f38",
    "--border-soft": "#2a2c34",
    "--text": "#cdd3df",
    "--text-dim": "#98a0af",
    "--text-muted": "#5e6573",
    "--accent": "#d4a574",
    "--up": "#8cb892",
    "--down": "#d27b80",
    "--warn": "#e8b876",
  },
  light: {
    "--bg": "#f7f4ed",
    "--surface": "#efe9dc",
    "--surface-card": "#fffdf6",
    "--border": "#dccfbb",
    "--border-soft": "#e5dac8",
    "--text": "#3a352e",
    "--text-dim": "#5e574b",
    "--text-muted": "#7a705e",
    "--accent": "#9c6a1e",
    "--up": "#5e8736",
    "--down": "#b54a4a",
    "--warn": "#a06f25",
  },
};

const HALFTONE: ResolvedTheme = {
  name: "halftone",
  dark: {
    "--bg": "#22202a",
    "--surface": "#1b1923",
    "--surface-card": "#16141d",
    "--border": "#322e3e",
    "--border-soft": "#2d2937",
    "--text": "#d4cfd9",
    "--text-dim": "#9991a5",
    "--text-muted": "#665e78",
    "--accent": "#b48bc8",
    "--up": "#9bbb89",
    "--down": "#d28590",
    "--warn": "#d9b572",
  },
  light: {
    "--bg": "#f5f2f8",
    "--surface": "#ebe6f0",
    "--surface-card": "#fdfbfe",
    "--border": "#d6cee0",
    "--border-soft": "#dfd7e8",
    "--text": "#322a3a",
    "--text-dim": "#544a5e",
    "--text-muted": "#7a6f8a",
    "--accent": "#7d4ba5",
    "--up": "#4f8e3f",
    "--down": "#b94656",
    "--warn": "#a67224",
  },
};

const SPECIMEN: ResolvedTheme = {
  name: "specimen",
  dark: {
    "--bg": "#1d2228",
    "--surface": "#171b20",
    "--surface-card": "#12161b",
    "--border": "#2b333a",
    "--border-soft": "#272e35",
    "--text": "#d0d6db",
    "--text-dim": "#98a1a8",
    "--text-muted": "#5e6770",
    "--accent": "#6db49a",
    "--up": "#9fb87c",
    "--down": "#d28590",
    "--warn": "#d4a974",
  },
  light: {
    "--bg": "#f4f5f2",
    "--surface": "#e8ebe5",
    "--surface-card": "#ffffff",
    "--border": "#cfd5cb",
    "--border-soft": "#dde0d8",
    "--text": "#2c332e",
    "--text-dim": "#52594f",
    "--text-muted": "#76806f",
    "--accent": "#2f7d62",
    "--up": "#5d8a3a",
    "--down": "#b54a4a",
    "--warn": "#a06f25",
  },
};

export interface CustomThemeInput {
  dark?: Partial<ThemeVariant>;
  light?: Partial<ThemeVariant>;
}

export type ThemeInput = string | CustomThemeInput | undefined;

const BUILT_IN_THEMES: Record<string, ResolvedTheme> = {
  lattice: LATTICE,
  flux: FLUX,
  halftone: HALFTONE,
  specimen: SPECIMEN,
};

export const BUILT_IN_THEME_NAMES = ["lattice", "flux", "halftone", "specimen"] as const;
export type BuiltInThemeName = (typeof BUILT_IN_THEME_NAMES)[number];

function isCustom(input: ThemeInput): input is CustomThemeInput {
  return typeof input === "object" && input !== null;
}

export function resolveTheme(input: ThemeInput): ResolvedTheme {
  if (input === undefined) return LATTICE;

  if (typeof input === "string") {
    const found = BUILT_IN_THEMES[input];
    if (!found) {
      console.warn(`Unknown theme '${input}', falling back to lattice`);
      return LATTICE;
    }
    return found;
  }

  if (isCustom(input)) {
    return {
      name: "custom",
      dark: { ...LATTICE.dark, ...(input.dark ?? {}) },
      light: { ...LATTICE.light, ...(input.light ?? {}) },
    };
  }

  return LATTICE;
}
