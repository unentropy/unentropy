# Contract: GitHub Actions Structure

**Purpose**: Define the structure and requirements for published GitHub Actions  
**Related**: [spec.md](../spec.md)

## Overview

This contract defines how Unentropy actions (track-metrics and quality-gate) are structured and published to dedicated repositories for use via GitHub Marketplace and direct repository references.

## Target Repositories

**Repositories:**
- `unentropy/track-metrics` - Metrics collection action
- `unentropy/quality-gate` - Quality gate evaluation action

**Repository properties:**
- Public visibility (required for marketplace)
- No branch protection on main/master branch
- No tag protection rules (allows force-pushing floating tags)
- Created manually before first publish

## Required Files in Target Repositories

**Each action repository must contain:**
- `action.yml` - Action metadata and interface definition
- `dist/` - Directory containing bundled JavaScript action code
- `README.md` - Action documentation and usage examples

**Excluded from target repos:**
- Source TypeScript files
- Test files
- Build configuration
- Any files from main monorepo not in above list

## action.yml Required Fields

**Metadata:**
- `name`: Action display name (e.g., "Unentropy Track Metrics")
- `description`: Short description of action purpose
- `author`: Action author/maintainer

**Branding (for Marketplace):**
- `icon`: Icon name from Feather icons set
- `color`: Color identifier from GitHub's allowed colors
- Visible on Marketplace listing page

**Interface:**
- `inputs`: Object defining all action inputs with descriptions and default values
- `outputs`: Object defining all action outputs with descriptions
- `runs`: Object specifying action runtime (Node.js version, entry point)

**Example structure:**
```
name: Action Name
description: What the action does
author: Maintainer Name
branding:
  icon: icon-name
  color: color-name
inputs:
  input-name:
    description: Input description
    required: false
    default: default-value
outputs:
  output-name:
    description: Output description
runs:
  using: node20
  main: dist/index.js
```

## Versioning Strategy

### Beta Phase (0.x versions)

**Tags created for release v0.1.3:**
- `v0.1.3` - Exact version (immutable)
- `v0.1` - Latest patch in 0.1.x series (mutable, force-pushed)
- `v0` - Latest version in 0.x series (mutable, force-pushed)

**User references:**
- `uses: unentropy/track-metrics@v0` - Auto-updates to latest 0.x
- `uses: unentropy/track-metrics@v0.1` - Auto-updates to latest 0.1.x
- `uses: unentropy/track-metrics@v0.1.3` - Locked to exact version

### Stable Phase (1.x+ versions)

**Tags created for release v1.2.3:**
- `v1.2.3` - Exact version (immutable)
- `v1.2` - Latest patch in 1.2.x series (mutable, force-pushed)
- `v1` - Latest version in 1.x series (mutable, force-pushed)

**User references:**
- `uses: unentropy/track-metrics@v1` - Auto-updates to latest 1.x
- `uses: unentropy/track-metrics@v1.2` - Auto-updates to latest 1.2.x
- `uses: unentropy/track-metrics@v1.2.3` - Locked to exact version

## Tag Management

**Creating tags:**
- Exact version tags are created once and never modified
- Floating tags (major, minor) are force-pushed on each release
- Tags reference commit in target repo (not source monorepo)

**Tag naming:**
- Must start with `v` prefix (e.g., `v0.1.0`, not `0.1.0`)
- Must follow semver format exactly (MAJOR.MINOR.PATCH)
- No pre-release suffixes on published tags (no `-beta`, `-rc`)

**Validation:**
- Release tag in source repo must be valid semver
- Non-semver tags are skipped with warning message

## dist/ Directory Structure

**Contents:**
- `index.js` - Action entry point (referenced in action.yml runs.main)
- `*.js` - Additional bundled JavaScript files if needed
- No TypeScript source files
- No source maps (optional, can include for debugging)

**Build requirements:**
- All dependencies bundled (no node_modules in target repo)
- Compatible with Node.js version specified in action.yml
- Minified/optimized for fast action execution

## README Requirements

**Must include:**
- Action name and description
- Usage example with full workflow snippet
- Inputs documentation (all parameters, types, defaults)
- Outputs documentation (all outputs, types, when available)
- Link to source repository (unentropy/unentropy)
- License information
- Beta/stable status indicator

**Should include:**
- Multiple usage examples (basic, advanced)
- Common configuration patterns
- Troubleshooting section
- Link to main Unentropy documentation
- Link to other Unentropy actions

**Example workflow snippet structure:**
```yaml
name: Example
on: [push]
jobs:
  example:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: unentropy/track-metrics@v0
        with:
          input-name: value
```

## Marketplace Listing (P3)

**Preparation:**
- action.yml branding must be complete
- README must have comprehensive documentation
- At least one release tag must exist

**Publishing process:**
- First publish is manual (accept Developer Agreement)
- Subsequent releases auto-update marketplace listing
- Categories and tags selected during first publish

**Beta indication:**
- README clearly marks action as beta during 0.x phase
- Marketplace description can indicate "Beta" status
- Version numbers (0.x) signal pre-release to users

## Commit Messages

**Format:**
- Include source release version in message
- Example: `"Release v0.1.3 from unentropy/unentropy"`
- Provides traceability from published action to source

## Publishing Atomicity

**Both actions must be published together:**
- If one fails, neither should be in inconsistent state
- Consider rollback strategy for partial failures
- Validation runs before any publishing step

## Validation Checklist

Before publishing actions:
- [ ] Both target repositories exist
- [ ] action.yml has all required fields
- [ ] Branding (icon, color) specified
- [ ] dist/index.js exists and is executable
- [ ] README is comprehensive
- [ ] Release tag is valid semver
- [ ] PAT has required permissions
- [ ] No tag protection on target repos
