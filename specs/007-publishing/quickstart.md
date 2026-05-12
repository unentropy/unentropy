# Quickstart: Publishing Unentropy

**Feature Branch**: `007-publishing`

## Prerequisites

Before publishing, ensure you have:

1. **npm Account**: With publish permissions for `unentropy` package
2. **GitHub Organization**: `unentropy` org exists with admin access
3. **Target Repositories**: Created manually:
   - `unentropy/track-metrics`
   - `unentropy/quality-gate`
4. **Repository Secrets**: Configured in `unentropy/unentropy`:
   - `NPM_TOKEN` - npm automation token with publish scope
   - `ACTIONS_PUBLISH_TOKEN` - GitHub PAT with `repo` scope

## One-Time Setup

### 1. Create Target Repositories

```bash
# Using gh CLI
gh repo create unentropy/track-metrics --public --description "Track custom code metrics in CI/CD"
gh repo create unentropy/quality-gate --public --description "Evaluate PR metrics against baseline thresholds"
```

### 2. Configure Repository Secrets

```bash
# In unentropy/unentropy repo settings
gh secret set NPM_TOKEN --body "npm_xxxx..."
gh secret set ACTIONS_PUBLISH_TOKEN --body "ghp_xxxx..."
```

### 3. Verify package.json Configuration

Ensure these fields are configured:

```json
{
  "name": "unentropy",
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

## Publishing a Release (Simplified Workflow)

### Step 1: Build and Test Locally

```bash
# Run full CI checks
bun run check
bun test

# Build CLI (optional - workflow will rebuild)
bun run build:cli

# Build actions (optional - workflow will rebuild)
bun run build:actions

# Test CLI locally
bun dist/index.js --version
```

### Step 2: Bump Version and Publish (One Command!)

```bash
# For patch release (0.1.0 → 0.1.1)
bun run version:patch

# For minor release (0.1.0 → 0.2.0)
bun run version:minor

# For major release (0.1.0 → 1.0.0)
bun run version:major
```

**That's it!** The script will:
- Bump version in package.json
- Create a git commit
- Create a version tag (e.g., v0.1.1)
- Push commit and tag to GitHub
- Trigger the publishing workflow automatically

### Step 3: Monitor Workflow

Watch the workflow run:
```bash
gh run list --workflow publish.yml
gh run watch
```

### Step 4: Verify Publishing

The workflow runs automatically. Verify:

```bash
# Check npm package
npm view unentropy

# Check action repos
gh api repos/unentropy/track-metrics/tags
gh api repos/unentropy/quality-gate/tags

# Test installation
bunx unentropy@beta --version
```

## Manual Publishing (Fallback)

If automation fails, publish manually:

### npm Package

```bash
# Build CLI
bun run build:cli

# Verify package contents
npm pack
tar -tzf unentropy-0.1.0.tgz

# Publish
npm publish --tag beta  # For 0.x versions
npm publish              # For 1.x+ versions
```

### GitHub Actions

```bash
# Clone target repo
git clone https://github.com/unentropy/track-metrics.git target
cd target

# Clear and copy files
rm -rf *
cp ../unentropy/.github/actions/track-metrics/action.yml .
cp -r ../unentropy/.github/actions/track-metrics/dist .
cp ../unentropy/.github/actions/track-metrics/README.md .

# Commit and tag
git add -A
git commit -m "Release v0.1.0 from unentropy/unentropy"
git tag -fa v0.1.0 -m "Release v0.1.0"
git tag -fa v0.1 -m "Update v0.1 tag"
git tag -fa v0 -m "Update v0 tag"

# Push
git push origin main --force
git push origin v0.1.0 v0.1 v0 --force
```

## Verifying User Experience

After publishing, verify the user workflows work:

### CLI via bunx

```bash
# Create test directory
mkdir test-project && cd test-project

# Run init command
bunx unentropy@beta init

# Verify configuration created
cat unentropy.json
```

### GitHub Action

Create a test workflow:

```yaml
name: Test Unentropy
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: unentropy/track-metrics@v0
        with:
          storage-type: sqlite-local
```

## Troubleshooting

### npm publish fails with "version exists"

The version is already published. Bump version and try again:
```bash
bun run version:patch
```

### PAT authentication error

Verify PAT has `repo` scope:
```bash
gh auth status
# If needed, regenerate and update secret
gh secret set ACTIONS_PUBLISH_TOKEN
```

### Target repo doesn't exist

Create the repository first:
```bash
gh repo create unentropy/track-metrics --public
```

### Workflow timeout

Check for:
- npm registry availability
- GitHub API rate limits
- Large bundle sizes

## Development Workflow Summary

**Daily development:**
```bash
git commit -m "feat: add new feature"
git push
# No publishing - just normal development
```

**When ready to release:**
```bash
bun run version:patch  # or minor/major
# Done! Workflow handles everything else
```

## Alternative: Manual Version Bump

If you prefer manual control, you can still use traditional workflow:

```bash
bun pm version patch    # Bumps version, creates tag locally
git push --follow-tags  # Pushes and triggers workflow
```

The automated scripts are just convenience wrappers around this!

## Next Steps

After publishing:

1. **Announce release** - Update changelog, notify users
2. **Monitor adoption** - Check npm download stats
3. **Gather feedback** - Watch for GitHub issues
4. **Plan next release** - Triage issues, prioritize features

## Future: Migration to Changesets (Post-Beta)

When ready for more sophisticated automation (approaching v1.0):

1. Install changesets: `bun add -D @changesets/cli`
2. Initialize: `npx changeset init`
3. Update workflow to use `changesets/action`
4. New workflow: Create changeset → Merge PR → Bot publishes

This provides a clear path to industry best practices while keeping beta workflow simple.
