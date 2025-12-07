# Implementation Plan: Unentropy Publishing & Distribution

**Branch**: `007-publishing` | **Date**: 2025-12-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-publishing/spec.md`

## Summary

Complete publishing story for Unentropy covering npm registry (CLI via `bunx`) and GitHub Marketplace (Actions). Implement GitHub Actions workflows to automate publishing to npm on release creation and sync action files to dedicated repositories (`unentropy/track-metrics`, `unentropy/quality-gate`) with proper version tagging (exact + floating tags).

## Technical Context

**Language/Version**: TypeScript 5.9, Bun 1.3.3  
**Primary Dependencies**: Bun bundler, GitHub Actions, npm registry, gh CLI  
**Storage**: N/A (publishing workflow only)  
**Testing**: bun test (existing test suite for validation)  
**Target Platform**: GitHub Actions runners (ubuntu-latest)  
**Project Type**: single (existing monorepo structure)  
**Performance Goals**: All publishing steps complete within 10 minutes of release (SC-011)  
**Constraints**: Must support beta versioning (0.x), idempotent re-runs on partial failures  
**Scale/Scope**: 2 GitHub Actions (track-metrics, quality-gate), 1 npm package (unentropy)

### Research Completed (see research.md)

1. **RESOLVED**: npm package publishing - Use `target: "node"`, `#!/usr/bin/env node` shebang, bundle all dependencies
2. **RESOLVED**: Floating tag strategy - Git CLI with force-push in single atomic operation
3. **RESOLVED**: CLI bundle configuration - Single-file bundle, all dependencies bundled
4. **RESOLVED**: Partial failure handling - Idempotent design with pre-flight validation (no explicit rollback)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Serverless Architecture | ✅ PASS | All publishing runs within GitHub Actions workflows; no external servers |
| II. Technology Stack Consistency | ✅ PASS | Uses Bun runtime, TypeScript; Bun bundler for CLI build |
| III. Code Quality Standards | ✅ PASS | Existing lint/typecheck/format enforced; workflows use standard patterns |
| IV. Security Best Practices | ✅ PASS | NPM_TOKEN and ACTIONS_PUBLISH_TOKEN stored as repository secrets; never logged |
| V. Testing Discipline | ✅ PASS | CI runs tests before publish; workflows validate semver tags before proceeding |

**Additional Constraints Check**: ✅ PASS - Publishing workflows are self-contained within GitHub Actions; integrates with npm (external service) as required for distribution

## Project Structure

### Documentation (this feature)

```text
specs/007-publishing/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── github-actions-structure.md
│   ├── npm-package-config.md
│   └── release-workflow.md
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
# Publishing workflows (new)
.github/workflows/
├── ci.yml               # Existing CI workflow
├── metrics.yml          # Existing metrics workflow
└── publish.yml          # NEW: Release publishing workflow

# Existing action definitions (source)
.github/actions/
├── track-metrics/
│   ├── action.yml       # Action metadata with branding
│   ├── dist/            # Built JS bundle (gitignored until publish)
│   └── README.md        # Usage documentation
└── quality-gate/
    ├── action.yml
    ├── dist/
    └── README.md

# CLI source (existing)
src/
├── cli/                 # CLI implementation
│   ├── cmd/             # Command handlers
│   └── init/            # Init scaffolding
└── index.ts             # Package entry point

# Build scripts
scripts/
├── build-actions.ts     # Existing action bundler
└── build-cli.ts         # NEW: CLI bundler for npm

# Package configuration (modifications)
package.json             # Add bin, files, engines fields
```

**Structure Decision**: Single project with GitHub Actions workflows for publishing. No new source directories - only workflow files and package.json modifications.

## Constitution Check (Post-Design)

*Re-evaluated after Phase 1 design completion.*

| Principle | Status | Post-Design Notes |
|-----------|--------|-------------------|
| I. Serverless Architecture | ✅ PASS | Publishing workflow runs entirely in GitHub Actions; no servers |
| II. Technology Stack Consistency | ✅ PASS | Bun bundler for CLI, TypeScript throughout; Node shebang for compatibility |
| III. Code Quality Standards | ✅ PASS | CI runs before publish; standard workflow patterns |
| IV. Security Best Practices | ✅ PASS | Secrets in repository settings; idempotent check prevents accidental overwrites |
| V. Testing Discipline | ✅ PASS | Full test suite runs before any publish step |

**Additional Constraints Check**: ✅ PASS - Integrates with npm registry (external) as required for distribution; workflow self-contained in GitHub Actions

## Complexity Tracking

> **No constitution violations identified. All principles pass.**
