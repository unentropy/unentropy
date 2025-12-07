# Research: Unentropy Publishing & Distribution

**Feature Branch**: `007-publishing`  
**Research Date**: 2025-12-07  
**Status**: Complete

## Overview

This document resolves all "NEEDS CLARIFICATION" items from the Technical Context in `plan.md` and documents best practices for the technologies involved.

---

## 1. npm Package Publishing with Bun Bundler

### Decision: Use `target: "node"` with Node.js shebang

**Configuration:**
```typescript
await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  target: "node",
  format: "esm",
  minify: true,
  banner: "#!/usr/bin/env node",
});
```

**package.json additions:**
```json
{
  "bin": {
    "unentropy": "./dist/index.js"
  },
  "files": [
    "dist",
    "README.md"
  ],
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### Rationale

- `#!/usr/bin/env node` provides maximum compatibility - works with Node.js, Bun, and Deno
- `target: "node"` generates bundles compatible with both Node.js and Bun runtimes
- Enables both `npx unentropy` and `bunx unentropy` to work
- Bun can transparently run Node-compatible scripts
- No `engines.bun` field needed (npm doesn't recognize it)

### Alternatives Considered

| Alternative | Verdict | Reason |
|-------------|---------|--------|
| `#!/usr/bin/env bun` shebang | Rejected | Limits users to Bun-only |
| `target: "bun"` | Rejected | Adds `// @bun` pragma, may not work in Node.js |
| Dual entrypoints (node + bun) | Rejected | Unnecessary complexity |

---

## 2. GitHub Actions Floating Tag Strategy

### Decision: Git CLI with force-push in single atomic operation

**Tagging approach:**
```bash
# Parse version: v0.1.3 → v0, v0.1, v0.1.3
VERSION="v0.1.3"
MAJOR="v0"
MINOR="v0.1"

# Create/update all tags locally
git tag -fa "$VERSION" -m "Release $VERSION"
git tag -fa "$MINOR" -m "Update $MINOR tag"
git tag -fa "$MAJOR" -m "Update $MAJOR tag"

# Single push for atomicity
git push origin "$VERSION" "$MINOR" "$MAJOR" --force
```

### Rationale

- **Git CLI is simpler** - No API complexity, familiar commands, works well in Actions
- **Force-push is standard** - Official GitHub recommendation, used by actions/checkout
- **Single push is atomic** - All-or-nothing tag update prevents inconsistent state
- **Annotated tags** - Using `-a` flag creates proper tag objects with messages

### How Major Actions Handle This

- `actions/checkout`: Uses `v6`, `v5`, `v4` major floating tags, force-pushed on each release
- Both `v6` and `v6.0.1` point to the same commit
- No minor floating tags observed in most official actions

### Required PAT Permissions

- **Scope:** `repo` (full control) OR `public_repo` (for public repos only)
- **Fine-grained PAT alternative:** `Contents: write` on target repos

### Alternatives Considered

| Alternative | Verdict | Reason |
|-------------|---------|--------|
| GitHub REST API for refs | Rejected | More complex, rate limits |
| JasonEtco/build-and-tag-action | Rejected | Designed for single-repo |
| Branches instead of tags | Rejected | Unconventional for actions versioning |

---

## 3. CLI Bundle Configuration

### Decision: Single-file bundle with all dependencies bundled

**Recommended configuration:**
```typescript
// scripts/build-cli.ts
await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  target: "node",
  format: "esm",
  minify: true,
  sourcemap: "external",
  banner: "#!/usr/bin/env node",
  naming: "index.js",
});
```

### Rationale

- **Single-file bundle:** Minimizes download size and file system operations for `bunx` cold-start
- **Bundle all dependencies:** Tree-shaking eliminates unused code; no version conflicts with user's packages
- **No externals needed:** Current dependencies (`yargs`, `zod`, `preact`) are all pure JS, bundle well
- **Text imports work:** `with { type: "text" }` import attribute inlines file contents as string literals

### Key Differences from Action Bundling

| Aspect | Actions Build | CLI Build |
|--------|---------------|-----------|
| Target | `"bun"` | `"node"` |
| Shebang | None needed | `#!/usr/bin/env node` |
| Distribution | Committed to repo | Published to npm |
| Compatibility | Bun only | Node.js + Bun |

### Cross-Platform Compatibility

- **No native dependencies** in CLI code
- **Pure JavaScript output** runs identically on macOS, Linux, Windows
- **Shebang handling:** Windows npm/bun handle translation automatically

### Alternatives Considered

| Alternative | Verdict | Reason |
|-------------|---------|--------|
| Preserve module structure | Rejected | Slower `bunx` cold-start |
| External dependencies | Rejected | Requires npm install step |
| Code-splitting | Rejected | Only useful for multiple entry points |

---

## 4. Partial Publish Rollback Strategy

### Decision: Idempotent design with pre-flight validation (no explicit rollback)

**Workflow phases:**
```
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 1: PRE-FLIGHT VALIDATION                                │
│  - Validate semver tag                                          │
│  - Check npm: does version exist? (skip if yes)                │
│  - Check target repos exist and accessible                      │
│  - Build all artifacts                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 2: PUBLISH (idempotent)                                 │
│  - For each target: check if published, skip if yes            │
│  - Publish to target                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 3: FAILURE HANDLING                                     │
│  - Workflow fails with clear error                             │
│  - User re-runs after fixing issue                             │
│  - Skip logic prevents duplicate publications                   │
└─────────────────────────────────────────────────────────────────┘
```

### Rationale

- **npm unpublish limitations:** 72-hour window, version numbers become unusable forever, cooldown periods
- **GitHub tags are easily re-taggable:** Delete and recreate; floating tags force-pushed by design
- **Industry standard:** Lerna, Nx, Changesets all use detect-and-skip patterns

### Idempotency Implementation

```bash
# npm idempotency
VERSION=$(jq -r .version package.json)
if npm view unentropy@$VERSION version 2>/dev/null; then
  echo "Version $VERSION already published, skipping..."
else
  npm publish
fi

# Action idempotency
if git ls-remote --tags origin | grep -q "refs/tags/v$VERSION"; then
  echo "Tag already exists, skipping exact tag..."
fi
# Floating tags always force-pushed (idempotent by design)
git tag -f "v0"
git push -f origin "v0"
```

### Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| npm succeeds, actions fail | Re-run skips npm, publishes actions |
| npm fails, actions not attempted | Re-run retries npm, then publishes actions |
| One action succeeds, other fails | Re-run skips successful, retries failed |
| All succeed, accidental re-run | All targets skipped (no-op) |

### Alternatives Considered

| Alternative | Verdict | Reason |
|-------------|---------|--------|
| Explicit rollback | Rejected | npm unpublish limitations make this unreliable |
| Two-phase commit | Rejected | npm doesn't support staging; adds complexity |
| Strict ordering (npm first) | Partial | Doesn't help if npm succeeds, actions fail |

---

## 5. Beta Version Publishing

### Decision: Semantic versioning with `beta` dist-tag

**Version strategy:**
```bash
# Beta release
npm version 0.1.0
npm publish --tag beta

# Users install beta
bunx unentropy@beta init

# When stable
npm version 1.0.0
npm publish  # Goes to 'latest' tag
```

**Floating tags during beta:**
- `v0` - Points to latest 0.x release
- `v0.1` - Points to latest 0.1.x release
- `v0.1.3` - Exact version

### Rationale

- `latest` tag reserved for stable releases (npm default behavior)
- `beta` tag allows early adopters to test without affecting stable users
- Semver compatible: `0.1.0` < `1.0.0`

---

## Summary: Resolved Clarifications

| Item | Resolution |
|------|------------|
| npm bin/files config | `bin: { "unentropy": "./dist/index.js" }`, `files: ["dist", "README.md"]` |
| Floating tag strategy | Git CLI with force-push, single atomic push for all tags |
| CLI bundle config | Single-file, `target: "node"`, bundle all deps, Node shebang |
| Rollback strategy | Idempotent design with pre-flight validation; no explicit rollback |

All unknowns from Technical Context are now resolved. Ready for Phase 1: Design & Contracts.
