# Contract: npm Package Structure

**Purpose**: Define the structure and requirements for the published npm package  
**Related**: [spec.md](../spec.md)

## Overview

This contract defines how the Unentropy CLI is packaged and published to npm registry, enabling users to run `bunx unentropy` commands without local installation.

## Package.json Required Fields

- **name**: Must be `"unentropy"` (exact, lowercase)
- **version**: Must match release tag (e.g., `0.1.0` for release `v0.1.0`)
- **bin**: Object mapping `"unentropy"` to `"./dist/index.js"` (CLI entry point)
- **files**: Array limiting published files to `["dist", "README.md"]`
- **keywords**: Array for npm search discoverability (metrics, ci, github-actions, code-quality, testing, coverage, bun)
- **engines**: Object specifying `"node": ">=18.0.0"` (Bun supports Node engine field)
- **type**: Must be `"module"` for ES modules
- **exports**: Object defining package entry points
- **module**: Path to ES module entry point (`./dist/index.js`)
- **types**: Path to TypeScript definitions if generated
- **description**: Short description for npm package page
- **license**: License identifier (currently MIT)
- **homepage**: Link to project homepage/repository
- **repository**: Object with git repository URL
- **bugs**: Object with issues URL

## Files Included in Distribution

**Required files:**
- `dist/index.js` - Bundled CLI executable with Node shebang
- `README.md` - Package documentation and usage instructions
- `LICENSE` - License file (MIT)

**Excluded files (via .gitignore and files field):**
- Source TypeScript files (`src/`)
- Test files (`tests/`)
- Configuration files (tsconfig.json, etc.)
- GitHub workflows (`.github/`)
- Specification documents (`specs/`)
- Development dependencies

## CLI Entry Point Requirements

**File**: `dist/index.js`

**Must have:**
- Shebang line: `#!/usr/bin/env node` (first line - enables both Node.js and Bun execution)
- Executable permissions (will be set automatically by npm during install)
- Bundled with all runtime dependencies (single-file bundle)
- Cross-runtime compatible (works with Node.js 18+ and Bun 1.0+)

**Execution modes:**
- `bunx unentropy` - Runs latest version without local install
- `bunx unentropy@0.1.0` - Runs specific version
- `bunx unentropy@beta` - Runs latest beta (0.x) version
- `npm install -g unentropy` - Global install, enables `unentropy` command

## Beta Versioning (0.x)

**Version format:**
- Beta versions: `0.1.0`, `0.2.0`, etc.
- Pre-release suffixes not used (no `-beta.1`, `-rc.1`)

**npm dist-tags:**
- `latest`: Points to most recent published version (even if 0.x)
- `beta`: Points to most recent 0.x version (during beta phase)

**Behavior:**
- `bunx unentropy` installs `latest` tag
- `bunx unentropy@beta` installs `beta` tag
- Breaking changes acceptable in 0.x per semver spec

## Stable Versioning (1.x+)

**Version format:**
- Stable versions: `1.0.0`, `1.1.0`, `1.0.1`, etc.
- Follow semver strictly (MAJOR.MINOR.PATCH)

**npm dist-tags:**
- `latest`: Points to most recent stable version (1.x+)
- `beta`: May point to pre-release (e.g., `2.0.0-beta.1`) if testing next major

**Behavior:**
- Breaking changes only in major versions (2.0.0, 3.0.0)
- Same package structure and build process as beta

## Build Output

**Bundling strategy:**
- Use Bun bundler to create single `dist/index.js` file
- Target: `"node"` (for Node.js + Bun compatibility)
- Dependencies: Bundle all (no external dependencies required)
- Minification: Enabled for size reduction
- Source maps: External (optional, for debugging)

**Type definitions:**
- Generate `.d.ts` files if CLI is intended for programmatic use
- Optional for pure CLI tool
- Include in `files` array if generated

## Package Metadata for Discovery

**keywords (minimum required):**
- metrics
- ci
- github-actions
- code-quality
- testing
- coverage
- bun

**Optional but recommended:**
- serverless
- cli
- developer-tools
- static-analysis

## README Requirements

**Must include:**
- Installation instructions (`bunx unentropy init`)
- Quick start example
- Link to full documentation
- License information
- Beta/stable status indicator

**Should include:**
- Available commands overview
- Link to GitHub repository
- Link to GitHub Actions in marketplace (when available)
- Contributing guidelines

## Validation Checklist

Before publishing:
- [ ] Version in package.json matches release tag
- [ ] `bin` field points to correct file
- [ ] `files` array limits distribution to required files only
- [ ] Shebang `#!/usr/bin/env node` present and correct in dist/index.js
- [ ] Keywords included for discovery
- [ ] engines field specifies Node.js 18+ requirement
- [ ] README is up to date
- [ ] LICENSE file included
- [ ] Build succeeds and produces valid dist/index.js
- [ ] Local test: `bunx ./package.tgz init` works
