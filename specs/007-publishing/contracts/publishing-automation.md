# Contract: Publishing Automation

**Purpose**: Define the automated publishing workflow requirements and behavior  
**Related**: [spec.md](../spec.md)

## Overview

This contract defines how the automated publishing workflow orchestrates npm package publishing and GitHub Actions publishing when a release is created in the main repository.

## Workflow Trigger

**Event:**
- Git tag push matching pattern `v*` in `unentropy/unentropy` repository
- Triggered by: `git push --tags` or automated via bun version scripts
- Only tags matching semantic versioning trigger publishing

**Validation:**
- Tag must follow semantic versioning (vMAJOR.MINOR.PATCH)
- Tag format: `v0.1.0`, `v1.2.3` (with `v` prefix)
- Invalid tags (e.g., `latest`, `beta-1`, `v1.2`) skip publishing with warning

**Developer Workflow:**
```bash
# Option 1: Use bun scripts (recommended)
bun run version:patch   # Bumps version, creates tag, pushes automatically
bun run version:minor
bun run version:major

# Option 2: Manual (traditional)
bun pm version patch    # Bumps version and creates tag
git push --follow-tags  # Pushes commit and tag
```

## Required Repository Secrets

**npm Publishing:**
- `NPM_TOKEN` - npm authentication token with publish permission
  - Scope: Automation token (recommended) or Classic token with publish access
  - Used to authenticate `npm publish` command

**GitHub Actions Publishing:**
- `ACTIONS_PUBLISH_TOKEN` - GitHub Personal Access Token
  - Scope: `repo` (full repository access)
  - Used to push to `unentropy/track-metrics` and `unentropy/quality-gate` repositories
  - Must not be the default `GITHUB_TOKEN` (insufficient permissions for cross-repo push)

## Publishing Sequence

**High-level flow:**
1. Developer runs `bun run version:patch` (or minor/major)
2. Bun bumps version in package.json, commits, creates tag
3. Script automatically pushes commit and tag
4. GitHub Actions workflow triggers on tag push
5. Workflow validates tag format (semver)
6. Build CLI package and GitHub Actions
7. Publish to npm
8. Publish actions to target repositories
9. Create GitHub release automatically
10. Verify all steps completed successfully

**Failure handling:**
- Any build failure stops entire workflow (no publishing occurs)
- Publishing is idempotent (safe to retry after partial failure)
- No explicit rollback - re-run workflow to complete failed steps
- Each target checks if already published and skips if so

## Build Steps

### CLI Build

**Process:**
- Run Bun bundler on `src/cli/index.ts`
- Output to `dist/index.js` with Node shebang
- Target: `"node"` for cross-runtime compatibility
- Bundle all dependencies (single-file output)

**Validation:**
- `dist/index.js` file exists
- File starts with `#!/usr/bin/env node`
- File is valid JavaScript (no syntax errors)

### Actions Build

**Process:**
- Run existing action build process (defined elsewhere)
- Build both `track-metrics` and `quality-gate` actions
- Output to respective `dist/` directories

**Validation:**
- `dist/index.js` exists for each action
- Files are valid JavaScript
- No build errors or warnings fail the build

## npm Publishing

**Steps:**
1. Extract version from release tag (e.g., `v0.1.0` → `0.1.0`)
2. Verify package.json version matches extracted version
3. Check if version already published (skip if yes - idempotency)
4. Run `npm publish` with `NPM_TOKEN`
5. Verify package appears on npm registry

**Idempotency check:**
```bash
VERSION=$(jq -r .version package.json)
if npm view unentropy@$VERSION version 2>/dev/null; then
  echo "Version $VERSION already published, skipping..."
  exit 0
fi
npm publish
```

**Command examples:**
- `npm publish` (tags as `latest` by default)

**Validation:**
- npm publish exits with code 0 (success)
- Package version visible on npmjs.com/package/unentropy
- Correct dist-tag applied (latest or beta)

**Error handling:**
- Version already published: Fail workflow (don't overwrite)
- Authentication failure: Fail with clear message about NPM_TOKEN
- Registry unavailable: Retry with exponential backoff

## GitHub Actions Publishing

**For each action (track-metrics, quality-gate):**

1. **Clone target repository**
   - Clone `unentropy/{action-name}` to temporary directory
   - Use ACTIONS_PUBLISH_TOKEN for authentication

2. **Clear existing files**
   - Remove all files except `.git/` directory
   - Ensures clean slate for new version

3. **Copy files**
   - Copy `action.yml` from source to root of target repo
   - Copy `dist/` directory from source to target repo
   - Copy `README.md` from source to target repo

4. **Commit changes**
   - Stage all changes (`git add .`)
   - Commit with message: `"Release {version} from unentropy/unentropy"`
   - Include source release version for traceability

5. **Create/update tags**
   - Create exact version tag (e.g., `v0.1.3`)
   - Force-push floating minor tag (e.g., `v0.1`)
   - Force-push floating major tag (e.g., `v0`)

6. **Push to target repository**
   - Push commits to default branch
   - Push tags with `--force` for floating tags
   - Use ACTIONS_PUBLISH_TOKEN for authentication

## GitHub Marketplace Publishing

**Important:** Marketplace publishing is separate from the automated workflow.

**One-time manual setup (per action repository):**
1. Navigate to `unentropy/track-metrics` (or `quality-gate`) on GitHub
2. GitHub auto-detects `action.yml` and offers "Publish this Action to Marketplace"
3. Fill out listing details (description, icon, category)
4. Accept GitHub Marketplace Developer Agreement
5. Publish to Marketplace

**After initial setup:**
- Marketplace listing updates automatically when new tags are pushed
- No additional workflows needed in action repositories
- GitHub watches for new releases and updates the listing

**What the action repositories contain:**
- `action.yml` - Action definition
- `dist/` - Bundled JavaScript
- `README.md` - Documentation (shown on Marketplace)
- No CI/CD workflows needed

**Tag strategy:**
```
# For release v0.1.3
git tag v0.1.3                    # Exact version
git tag -f v0.1                   # Force-update minor
git tag -f v0                     # Force-update major
git push origin --tags --force
```

**Validation:**
- Target repository exists (fail early if not)
- PAT has push permissions (fail at push if not)
- All tags created successfully
- Files present in target repo match source

**Error handling:**
- Repo doesn't exist: Fail with message to create manually
- PAT lacks permissions: Fail with authentication error
- Tag protection: Fail with message to disable protection

## Idempotency and Retry

**Safe to retry:**
- npm publish will fail if version exists (won't overwrite)
- Git tags can be force-pushed (floating tags)
- File operations are replace-all (deterministic)

**Not safe to retry:**
- First npm publish of a version (duplicate error - but workflow has idempotency check)
- GitHub release creation (will error if release exists, but harmless)

**Retry strategy:**
- Workflow can be re-run if it fails partway
- npm publish will fail fast if version exists
- Actions publishing will succeed on retry (force-push)

## Validation Before Publishing

**Pre-flight checks:**
- Release tag is valid semver
- package.json version matches release tag
- All required secrets are configured
- Build outputs exist and are valid

**Fail fast if:**
- Tag format invalid
- Version mismatch
- Secrets missing
- Build failures

## Success Criteria

**Workflow succeeds when:**
- npm package published successfully
- Both action repositories updated with correct files
- All tags created (exact + floating)
- No errors in any step

**Verification steps:**
- Check npm package page: `https://npmjs.com/package/unentropy`
- Check action repos have new commits
- Check tags exist: `git ls-remote --tags origin`
- Test installation: `bunx unentropy@{version}`
- Test action usage: `uses: unentropy/track-metrics@v{major}`

## Partial Failure Handling (Idempotent Design)

**Design principle:** No explicit rollback. Workflow is re-runnable and skips already-completed steps.

**If npm succeeds but actions fail:**
- Re-run workflow
- npm publish step detects version exists, skips
- Actions publish proceeds normally
- Result: Both targets published

**If one action succeeds but other fails:**
- Re-run workflow
- npm skipped (already published)
- Successful action skipped (tag exists)
- Failed action retries and completes

**Why no explicit rollback:**
- npm unpublish has strict limitations (72-hour window, version unusable forever)
- GitHub tags can be force-pushed (idempotent by design)
- Simpler implementation, fewer failure modes

**Edge cases:**
| Scenario | Behavior |
|----------|----------|
| npm succeeds, actions fail | Re-run skips npm, publishes actions |
| npm fails, actions not attempted | Re-run retries npm, then actions |
| One action succeeds, other fails | Re-run skips successful, retries failed |
| All succeed, accidental re-run | All targets skipped (no-op) |

**Best practice:**
- Monitor workflow execution
- Re-run on failure (no manual intervention needed)
- Have manual publishing steps documented as fallback

## Workflow Timing

**Expected duration:**
- Build phase: 2-3 minutes
- npm publish: 30-60 seconds
- Actions publish: 1-2 minutes per action
- Total: 5-10 minutes

**Timeout settings:**
- Overall workflow: 15 minutes
- npm publish step: 5 minutes
- Each action publish: 5 minutes

## Monitoring and Notifications

**Success:**
- Workflow completes without errors
- GitHub release created automatically with basic notes
- npm package published and visible immediately
- Optional: Post to Slack/Discord with release notes

**Failure:**
- Workflow fails with clear error message
- GitHub sends notification to workflow initiator
- Logs include specific failure point for debugging
- Can retry by re-running workflow (idempotent design)

## Version-Specific Behavior

**Beta versions (0.x):**
- npm: Publish with `--tag beta`
- Actions: Create `v0`, `v0.x` floating tags
- All other behavior identical to stable

**Stable versions (1.x+):**
- npm: Publish with default `latest` tag
- Actions: Create `v1`, `v1.x` floating tags
- Breaking changes only in major versions

## Future Enhancements (Not Required Initially)

- Automated changelog generation (via changesets or release-please)
- Provenance attestation for npm packages
- GitHub Marketplace auto-update notification
- Pre-release testing in staging environment
- Automated rollback on verification failure
- Migration to changesets-based workflow (post-beta, approaching v1.0)

## Migration Path to Full Automation (Post-Beta)

When the project is ready for more sophisticated automation (approaching v1.0):

1. **Install changesets**: `bun add -D @changesets/cli`
2. **Initialize changesets**: `npx changeset init`
3. **Modify workflow** to use `changesets/action@v1`
4. **Developer workflow changes**:
   - Create changeset files instead of manual version bumps
   - Bot creates "Version Packages" PR
   - Merge PR to publish (instead of pushing tags)

This hybrid approach provides a smooth onboarding to best practices without overwhelming complexity during beta.
