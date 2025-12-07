# Data Model: Unentropy Publishing & Distribution

**Feature Branch**: `007-publishing`  
**Created**: 2025-12-07

## Overview

This feature is primarily workflow-based (CI/CD automation) rather than data-storage focused. The "data model" consists of configuration files, workflow artifacts, and publishing metadata rather than database entities.

## Key Entities

### 1. npm Package

**Definition**: The published `unentropy` package containing the bundled CLI

**Attributes:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Package name: `"unentropy"` |
| version | semver | Yes | Version matching release tag (e.g., `0.1.0`) |
| bin | object | Yes | CLI entry point: `{ "unentropy": "./dist/index.js" }` |
| files | array | Yes | Published files: `["dist", "README.md"]` |
| engines | object | Yes | Runtime requirement: `{ "node": ">=18.0.0" }` |
| keywords | array | Yes | Discovery keywords |
| dist-tag | string | Yes | `"beta"` for 0.x, `"latest"` for 1.x+ |

**Lifecycle:**
1. Version bumped in package.json
2. CLI bundled to dist/index.js
3. Published to npm registry
4. Available via `bunx unentropy`

### 2. CLI Entry Point

**Definition**: The executable script (`dist/index.js`) that users invoke

**Attributes:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| shebang | string | Yes | `#!/usr/bin/env node` (first line) |
| format | string | Yes | ESM (`"module"` type) |
| bundled | boolean | Yes | All dependencies bundled inline |
| target | string | Yes | `"node"` for cross-runtime compatibility |

**Build Configuration:**
```typescript
{
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  target: "node",
  format: "esm",
  minify: true,
  banner: "#!/usr/bin/env node",
  naming: "index.js"
}
```

### 3. Source Action

**Definition**: An action defined in `.github/actions/{name}/` in the monorepo

**Current instances:**
- `track-metrics` - Metrics collection action
- `quality-gate` - Quality gate evaluation action

**Attributes:**
| Field | Location | Description |
|-------|----------|-------------|
| action.yml | `.github/actions/{name}/action.yml` | Action metadata and interface |
| dist/ | `.github/actions/{name}/dist/` | Built JS bundle |
| README.md | `.github/actions/{name}/README.md` | Usage documentation |

**Files copied to target repo during publish:**
- `action.yml` → `/action.yml`
- `dist/*` → `/dist/*`
- `README.md` → `/README.md`

### 4. Target Repository

**Definition**: A dedicated public repository containing only the publishable action files

**Instances:**
- `unentropy/track-metrics`
- `unentropy/quality-gate`

**Properties:**
| Property | Value |
|----------|-------|
| Visibility | Public (required for marketplace) |
| Branch protection | Disabled (allow force-push) |
| Tag protection | Disabled (allow force-push floating tags) |
| Created | Manually before first publish |

**Contents after publish:**
```
/
├── action.yml
├── dist/
│   └── index.js (or action-specific name)
└── README.md
```

### 5. Release Tag

**Definition**: A semantic version tag in the source repository that triggers publishing

**Format**: `vMAJOR.MINOR.PATCH` (e.g., `v0.1.0`, `v1.2.3`)

**Attributes:**
| Attribute | Value |
|-----------|-------|
| Prefix | `v` (required) |
| Format | Semantic versioning (MAJOR.MINOR.PATCH) |
| Trigger | GitHub release "published" event |

**Validation rules:**
- Must start with `v`
- Must be valid semver (three numeric parts)
- No pre-release suffixes (no `-beta`, `-rc`)
- Non-semver tags are skipped with warning

### 6. Floating Tag

**Definition**: A mutable tag that always points to the latest compatible release

**Types:**
| Tag | Points to | Example |
|-----|-----------|---------|
| Major | Latest release in that major version | `v0` → `v0.3.2` |
| Minor | Latest patch in that minor version | `v0.3` → `v0.3.2` |

**Behavior:**
- Force-pushed on each release
- Enables users to auto-update within semver bounds
- Created in target repositories (not source)

**User reference patterns:**
```yaml
# Auto-update to latest 0.x
uses: unentropy/track-metrics@v0

# Auto-update to latest 0.3.x
uses: unentropy/track-metrics@v0.3

# Locked to exact version
uses: unentropy/track-metrics@v0.3.2
```

### 7. npm Dist-Tag

**Definition**: A label that identifies release channels on npm registry

**Tags used:**
| Tag | Usage | Phase |
|-----|-------|-------|
| `latest` | Default stable version | 1.x+ stable |
| `beta` | Latest pre-release version | 0.x beta |

**Publishing commands:**
```bash
# Beta (0.x versions)
npm publish --tag beta

# Stable (1.x+ versions)
npm publish  # Defaults to 'latest'
```

## State Transitions

### Release Lifecycle

```
┌─────────────────┐
│  Code in main   │
└────────┬────────┘
         │ Create GitHub Release with tag vX.Y.Z
         ▼
┌─────────────────┐
│ Release Created │
└────────┬────────┘
         │ Workflow triggered
         ▼
┌─────────────────┐
│  Build Phase    │──► Build CLI + Actions
└────────┬────────┘
         │ Validation passed
         ▼
┌─────────────────┐
│ npm Published   │──► Package available on npm
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Actions Synced  │──► Target repos updated
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Tags Updated    │──► Exact + floating tags
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Published     │──► Users can consume
└─────────────────┘
```

### Version State

| State | npm dist-tag | Action tag | User access |
|-------|--------------|------------|-------------|
| Beta (0.x) | `beta` | `@v0`, `@v0.x` | `bunx unentropy@beta` |
| Stable (1.x+) | `latest` | `@v1`, `@v1.x` | `bunx unentropy` |

## Validation Rules

### Semver Tag Validation

```typescript
const SEMVER_REGEX = /^v(\d+)\.(\d+)\.(\d+)$/;

function isValidReleaseTag(tag: string): boolean {
  return SEMVER_REGEX.test(tag);
}

function parseVersion(tag: string): { major: string; minor: string; patch: string } {
  const [, major, minor, patch] = tag.match(SEMVER_REGEX)!;
  return { major, minor, patch };
}
```

### Package Version Match

```typescript
function validateVersionMatch(releaseTag: string, packageVersion: string): boolean {
  const tagVersion = releaseTag.replace(/^v/, '');
  return tagVersion === packageVersion;
}
```

## Relationships

```
┌──────────────────┐
│  Release Tag     │
│  (source repo)   │
└────────┬─────────┘
         │ triggers
         ▼
┌──────────────────┐      ┌──────────────────┐
│  npm Package     │      │  Target Repos    │
│  - index.js      │      │  - track-metrics │
│  - README        │      │  - quality-gate  │
└──────────────────┘      └────────┬─────────┘
                                   │ contains
                                   ▼
                          ┌──────────────────┐
                          │  Floating Tags   │
                          │  - v0, v0.1      │
                          │  - exact version │
                          └──────────────────┘
```
