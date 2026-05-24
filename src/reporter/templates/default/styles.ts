import type { ResolvedTheme, ThemeVariant } from "./themes";

export type ThemeMode = "auto" | "light" | "dark";

function rootBlock(selector: string, vars: ThemeVariant): string {
  const lines = Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`);
  return `${selector} {\n${lines.join("\n")}\n}`;
}

const COMPONENT_LAYER = `
/* ---- Component layer (consumes CSS variables) ---- */
body { background: var(--bg); color: var(--text); font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif; }
.uent-mono { font-family: 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace; }

/* Title bar */
.uent-titlebar { background: var(--surface); border-bottom: 1px solid var(--border); }
.uent-dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
.uent-path { color: var(--text-dim); }
.uent-path .uent-slash { color: var(--accent); }
.uent-path .uent-dim { color: var(--text-muted); }

/* Sub-toolbar */
.uent-toolbar { background: var(--surface); border-bottom: 1px solid var(--border); }
.uent-toolbar-label { color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.12em; }
.uent-chip { color: var(--text-dim); background: transparent; border: 1px solid transparent; transition: color 0.1s ease, background 0.1s ease; }
.uent-chip:hover { color: var(--text); }
.uent-chip.uent-chip-active { background: var(--border); color: var(--accent); }
.uent-builds { color: var(--text-muted); }

/* Section heading */
.uent-section-head { color: var(--text); }
.uent-section-marker { color: var(--accent); }
.uent-section-comment { color: var(--text-muted); }

/* Cards */
.uent-card { background: var(--surface-card); border: 1px solid var(--border); border-radius: 4px; }
.uent-metric-name { color: var(--text); }
.uent-metric-desc { color: var(--text-muted); }

/* Stats */
.uent-stats { border-top: 1px dashed var(--border-soft); border-bottom: 1px dashed var(--border-soft); }
.uent-stat-l { color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.12em; }
.uent-stat-v { color: var(--text); }
.uent-trend-up { color: var(--up); }
.uent-trend-down { color: var(--down); }
.uent-trend-stable { color: var(--text-dim); }

/* Status bar */
.uent-statusbar { background: var(--surface); border-top: 1px solid var(--border); color: var(--text-muted); }
.uent-statusbar .uent-version { color: var(--accent); }

/* Preview banner */
.uent-preview-banner { background: var(--surface); border-bottom: 1px solid var(--border); color: var(--text-dim); }
.uent-preview-banner .uent-preview-icon { color: var(--warn); }

/* Toggle switch (reuses var colors) */
.uent-toggle-track { background: var(--border); }
.uent-toggle-track.uent-toggle-on { background: var(--accent); }

/* Date picker popover */
.uent-popover { background: var(--surface); border: 1px solid var(--border); }
.uent-input { background: var(--surface-card); border: 1px solid var(--border); color: var(--text); }
.uent-input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 25%, transparent); }

/* Empty state */
.uent-empty-flourish { color: var(--text-muted); }

/* Logo link */
.uent-logo-link { transition: opacity 0.1s ease; }
.uent-logo-link:hover { opacity: 0.75; }

/* Theme toggle */
.uent-theme-toggle { background: transparent; border: none; cursor: pointer; color: var(--text-dim); padding: 4px; border-radius: 3px; display: inline-flex; align-items: center; transition: color 0.1s ease, background 0.1s ease; }
.uent-theme-toggle:hover { color: var(--text); background: var(--border); }
.uent-theme-toggle .uent-theme-icon { width: 14px; height: 14px; display: none; }
.uent-theme-toggle[data-mode="light"] .uent-theme-icon-light { display: block; }
.uent-theme-toggle[data-mode="dark"] .uent-theme-icon-dark { display: block; }
.uent-theme-toggle[data-mode="system"] .uent-theme-icon-system { display: block; }
`;

const PRINT_LAYER = `
@media print {
  body { background: white !important; color: black !important; }
  .no-print { display: none !important; }
  .metric-card { page-break-inside: avoid; break-inside: avoid; }
  canvas { max-height: 300px; }
}`;

export function buildStyleSheet(theme: ResolvedTheme): string {
  const parts: string[] = [
    rootBlock(":root", theme.dark),
    `@media (prefers-color-scheme: light) {\n${rootBlock("  :root", theme.light)
      .split("\n")
      .map((l) => "  " + l)
      .join("\n")}\n}`,
    rootBlock('[data-theme="dark"]', theme.dark),
    rootBlock('[data-theme="light"]', theme.light),
    COMPONENT_LAYER,
    PRINT_LAYER,
  ];

  return parts.join("\n\n");
}
