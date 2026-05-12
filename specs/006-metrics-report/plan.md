# Implementation Plan: Metrics Report

**Branch**: `006-metrics-report` | **Date**: 2025-12-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-metrics-report/spec.md`

## Summary

Enhance the HTML report template with interactive visualization features: synchronized tooltips across charts, drag-to-zoom with native crosshair plugin integration, date range filtering (preset filters: 7/30/90 days/All, plus custom date range picker with calendar), dummy data toggle for sparse data preview, and PNG export for individual charts. All features are client-side rendered using embedded JSON data.

## Technical Context

**Language/Version**: TypeScript 5.x (Bun runtime)  
**Primary Dependencies**: Preact (SSR to static HTML), Chart.js 4.4.0, chartjs-adapter-date-fns, Tailwind CSS (CDN)  
**Note**: Zoom functionality is implemented natively in the crosshair plugin (no chartjs-plugin-zoom dependency)  
**Custom Date Picker**: Lightweight calendar library (to be researched - see research.md Section 12)  
**Storage**: SQLite (read-only during report generation)  
**Testing**: Bun test (unit, integration), visual review fixtures  
**Target Platform**: Static HTML file, any modern browser  
**Project Type**: Single project (src/, tests/)  
**Performance Goals**: Charts render <2s, tooltip sync <50ms, zoom/filter response <300ms  
**Constraints**: Self-contained HTML, bundled dependencies (no external CDN for date picker), no framework runtime  
**Scale/Scope**: Reports with 1-100+ builds, 1-20 metrics

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Serverless Architecture | ✅ PASS | Report is static HTML, no server required |
| II. Technology Stack Consistency | ✅ PASS | Uses Bun, TypeScript, Chart.js per constitution |
| III. Code Quality Standards | ✅ PASS | Strict TypeScript, Prettier, minimal comments |
| IV. Security Best Practices | ✅ PASS | No secrets involved in report generation |
| V. Testing Discipline | ✅ PASS | Visual fixtures + unit/integration tests |

**Additional Constraints Check**:
- ✅ Lightweight and self-contained (static HTML)
- ✅ No external servers (CDN for libraries only, graceful fallback)
- ✅ CI/CD compatible (report generated in GitHub Actions)

## Project Structure

### Documentation (this feature)

```text
specs/006-metrics-report/
├── plan.md              # This file
├── research.md          # Phase 0 output - technical decisions
├── data-model.md        # Phase 1 output - entity definitions
├── quickstart.md        # Phase 1 output - implementation guide
├── contracts/           # Phase 1 output - interface definitions
│   ├── report-data-schema.md # Embedded JSON structure
│   └── report-layout.md      # Visual/behavioral spec for UX review
├── checklists/
│   └── requirements.md  # FR tracking
└── tasks.md             # Phase 2 output - implementation tasks
```

### Source Code (repository root)

```text
src/
├── reporter/
│   ├── templates/
│   │   └── default/
│   │       ├── components/
│   │       │   ├── Header.tsx           # + date filter buttons, custom picker popover
│   │       │   ├── Footer.tsx           # + build count and date range display
│   │       │   ├── MetricCard.tsx       # + export button, zoom reset
│   │       │   ├── ChartCanvas.tsx      # Existing
│   │       │   ├── PreviewToggle.tsx    # NEW: dummy data toggle
│   │       │   ├── DateRangeFilter.tsx  # NEW: preset + custom filter buttons
│   │       │   └── ChartScripts.tsx     # + sync, zoom, filter, export, custom picker logic
│   │       └── HtmlDocument.tsx
│   ├── synthetic.ts      # NEW: dummy data generation
│   ├── charts.ts         # Chart.js configuration
│   ├── generator.ts      # Report generation orchestration
│   └── types.ts          # + new interfaces
└── ...

tests/
├── fixtures/
│   └── visual-review/    # 4 fixture scenarios
├── integration/
│   └── reporting.test.ts # + new feature tests
└── unit/
    └── reporter/
        ├── synthetic.test.ts      # NEW
        └── generator.test.ts      # + toggle/filter tests
```

**Structure Decision**: Single project structure - all report code in `src/reporter/`, tests mirror structure in `tests/`.

## Complexity Tracking

No violations requiring justification. All features use:
- Native crosshair plugin with integrated drag-to-zoom (no external zoom plugin)
- Standard DOM APIs (event listeners, canvas export)
- CSS-only toggle styling (Tailwind peer utilities)
