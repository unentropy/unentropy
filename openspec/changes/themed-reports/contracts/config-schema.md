**Domain**: config

Extends: openspec/specs/cli/contracts/config-schema.md

## Overview

This contract extends the `unentropy.json` configuration schema with `report.theme` and `report.mode` keys for controlling the visual appearance of generated HTML reports.

---

## New Configuration Fields

### `report.theme`

**Type**: `string | object`  
**Default**: `"lattice"`

Controls the color palette used in the report.

**Built-in names** (string):

| Value        | Description                       |
| ------------ | --------------------------------- |
| `"lattice"`  | Cool blue accent, default palette |
| `"flux"`     | Warm amber accent                 |
| `"halftone"` | Purple accent                     |
| `"specimen"` | Green accent                      |

**Custom palette** (object):

```typescript
interface CustomThemeInput {
  dark?: Partial<Record<ThemeVarName, string>>;
  light?: Partial<Record<ThemeVarName, string>>;
}
```

Where `ThemeVarName` is one of:

```
"--bg" | "--surface" | "--surface-card" | "--border" |
"--border-soft" | "--text" | "--text-dim" | "--text-muted" |
"--accent" | "--up" | "--down" | "--warn"
```

Each value must be a 7-character hex color (e.g., `#1c2230`). Omitted variables fall back to Lattice defaults.

**Examples:**

```json
{
  "report": {
    "theme": "flux"
  }
}
```

```json
{
  "report": {
    "theme": {
      "dark": { "--accent": "#ff00ff" },
      "light": { "--accent": "#aa00aa" }
    }
  }
}
```

---

### `report.mode`

**Type**: `"auto" | "light" | "dark"`  
**Default**: `"auto"`

Controls how the report selects between light and dark palettes.

| Value     | Behavior                                                                                      |
| --------- | --------------------------------------------------------------------------------------------- |
| `"auto"`  | Emits both palette variants; `prefers-color-scheme` selects at runtime                        |
| `"light"` | Locks to light palette; sets `data-theme="light"` on `<html>`; emits only light CSS variables |
| `"dark"`  | Locks to dark palette; sets `data-theme="dark"` on `<html>`; emits only dark CSS variables    |

**Example:**

```json
{
  "report": {
    "mode": "dark"
  }
}
```

---

## Updated TypeScript Schema

```typescript
const ThemeVarRecordSchema = z.record(
  z.string().regex(/^--[a-z][a-z0-9-]*$/, {
    message: "theme variable names must match ^--[a-z][a-z0-9-]*$",
  }),
  z.string().regex(/^#[0-9a-fA-F]{6}$/, {
    message: "theme values must be 7-character hex (e.g. #1c2230)",
  })
);

const CustomThemeSchema = z
  .object({
    dark: ThemeVarRecordSchema.optional(),
    light: ThemeVarRecordSchema.optional(),
  })
  .strict();

export const ReportConfigSchema = z
  .object({
    sections: z
      .array(ReportSectionSchema)
      .min(1, { message: "report.sections cannot be empty" })
      .optional(),
    theme: z
      .union([
        z.enum(["lattice", "flux", "halftone", "specimen"], {
          message: "theme must be one of: lattice, flux, halftone, specimen",
        }),
        CustomThemeSchema,
      ])
      .optional(),
    mode: z
      .enum(["auto", "light", "dark"], {
        message: "mode must be one of: auto, light, dark",
      })
      .optional(),
  })
  .strict();
```

---

## Validation Behavior

- Unknown `theme` string → warning logged, falls back to `"lattice"`
- Custom theme with partial variables → missing variables filled from Lattice defaults
- Invalid `mode` value → Zod validation error at config load time
- Invalid hex format in custom theme → Zod validation error at config load time
- Invalid CSS variable name format → Zod validation error at config load time

---

## Full Example Configuration

```json
{
  "metrics": {
    "coverage": {
      "type": "numeric",
      "command": "echo 85",
      "unit": "percent"
    }
  },
  "report": {
    "theme": "specimen",
    "mode": "auto"
  }
}
```
