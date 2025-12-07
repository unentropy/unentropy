# Feature Specification: Unentropy Publishing & Distribution

**Feature Branch**: `007-publishing`  
**Created**: 2025-01-03  
**Updated**: 2025-12-07  
**Status**: Draft  
**Input**: User description: "Complete publishing story for Unentropy covering npm registry (CLI via bunx) and GitHub Marketplace (Actions)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Install CLI via npm (Priority: P1)

As a developer, I want to run `bunx unentropy init` to quickly scaffold Unentropy configuration in my project, so that I can start tracking metrics without installing anything globally.

**Why this priority**: This is the primary entry point for individual developers and the fastest path to value. It enables the entire CLI-based workflow.

**Independent Test**: Can be fully tested by running `bunx unentropy init` in a fresh project directory and verifying it generates valid configuration.

**Acceptance Scenarios**:

1. **Given** unentropy is published to npm, **When** a user runs `bunx unentropy init` in any directory, **Then** the latest version is downloaded and executed
2. **Given** a user wants a specific version, **When** they run `bunx unentropy@0.1.0 init`, **Then** that exact version is used
3. **Given** unentropy is published, **When** a user searches npm for "metrics tracking", **Then** unentropy appears in search results with proper description and keywords
4. **Given** beta versions (0.x), **When** published to npm, **Then** they are tagged as "beta" and users can install with `bunx unentropy@beta`

---

### User Story 2 - Use Actions with Clean Syntax (Priority: P2)

As a team using Unentropy actions, I want to reference them in my workflows using simple syntax like `uses: unentropy/track-metrics@v0`, so that my workflow files are maintainable and I automatically benefit from compatible updates during the beta phase.

**Why this priority**: Once users discover actions (via documentation, npm package, or direct repo links), using them must be straightforward. This is essential for adoption even before marketplace listing.

**Independent Test**: Can be fully tested by creating a workflow that references `unentropy/track-metrics@v0` and verifying it executes correctly.

**Acceptance Scenarios**:

1. **Given** actions are published to dedicated repos, **When** a user adds `uses: unentropy/track-metrics@v0` to their workflow, **Then** the action runs successfully with the latest 0.x version
2. **Given** a user wants stability, **When** they use `uses: unentropy/quality-gate@v0.1.3`, **Then** the exact version is locked
3. **Given** a new patch release (e.g., v0.1.4), **When** a user's workflow uses `@v0` or `@v0.1`, **Then** they automatically get the latest compatible version
4. **Given** beta versions, **When** actions are published, **Then** floating tags `v0`, `v0.1`, etc. work correctly for pre-1.0 versions

---

### User Story 3 - Discover Actions on GitHub Marketplace (Priority: P3)

As a developer browsing the GitHub Marketplace, I want to discover Unentropy actions (track-metrics and quality-gate) when searching for code quality or metrics tools, so that I can evaluate and adopt them for my CI/CD workflow.

**Why this priority**: Marketplace discovery is valuable for organic growth but not essential for beta users. Early adopters will find actions via documentation, npm package links, or direct GitHub repo URLs. Marketplace can be added post-beta.

**Independent Test**: Can be tested by searching for "metrics" or "code quality" in GitHub Marketplace and verifying both actions appear with proper categories and descriptions.

**Acceptance Scenarios**:

1. **Given** actions are listed on Marketplace, **When** a user searches for "metrics tracking", **Then** both track-metrics and quality-gate appear in results
2. **Given** an action is listed, **When** a user views the action page, **Then** they see usage examples, documentation, and version history
3. **Given** marketplace listing exists, **When** subsequent versions are published, **Then** the marketplace automatically reflects new versions
4. **Given** beta versions (0.x), **When** listed on marketplace, **Then** they are clearly marked as "beta" or "pre-release"

---

### Edge Cases

**npm Publishing:**
- What happens when npm package name is already taken? Manual intervention required before first publish (validate name availability)
- What happens when npm package version already exists? The workflow should fail before creating the GitHub release, preventing duplicate publishes
- What happens when building the CLI bundle fails? The workflow should fail before attempting to publish to npm
- What happens when npm registry is unavailable? The workflow should retry with exponential backoff and eventually fail with clear message
- What happens when npm authentication fails (expired token, 2FA required)? The workflow should fail with clear error message indicating token issues

**GitHub Actions Publishing:**
- What happens when the target GitHub Action repo doesn't exist? The workflow should fail with clear error message indicating repos must be created manually first
- What happens when PAT lacks required permissions? The workflow should fail at push step with authentication error
- What happens when building actions fails? The workflow should fail before publishing, preventing partial or broken releases
- What happens for non-semver release tags (e.g., `latest`, `beta-1`)? The workflow should skip publishing and log warning that only semver tags are supported
- What happens when force-pushing floating tags fails due to branch protection? The workflow should document that target repos must not have tag protection rules

**General:**
- What happens when one publish succeeds but another fails (npm succeeds, actions fail)? The workflow should be idempotent and allow retrying; consider rollback strategy in contracts
- What happens during beta (0.x) version publishing? All workflows support beta versioning with `v0`, `v0.1` floating tags, and `beta` npm dist-tag

## Requirements *(mandatory)*

### Functional Requirements

**npm Publishing:**
- **FR-001**: System MUST build the CLI using Bun bundler before publishing to npm
- **FR-002**: System MUST include a `bin` field in package.json pointing to the CLI entry point
- **FR-003**: System MUST publish the package to npm when a release is created in the main repository
- **FR-004**: System MUST include only necessary files in the npm package (`dist/`, `README.md`, `LICENSE`)
- **FR-005**: System MUST generate the CLI bundle with proper shebang for Bun runtime (`#!/usr/bin/env bun`)
- **FR-006**: System MUST validate package version matches release tag before publishing
- **FR-007**: System MUST tag beta versions (0.x) with `beta` dist-tag on npm
- **FR-008**: System MUST include keywords in package.json for npm search discoverability

**GitHub Actions Publishing:**
- **FR-009**: System MUST copy `action.yml`, `dist/`, and `README.md` to target repos for each action
- **FR-010**: System MUST create exact version tag (e.g., `v0.1.0`) in target repos matching release tag
- **FR-011**: System MUST update floating minor tags (e.g., `v0.1`) to latest patch release
- **FR-012**: System MUST update floating major tags (e.g., `v0`) to latest release in that major version during beta
- **FR-013**: System MUST use PAT stored as repository secret to authenticate pushes to target repos
- **FR-014**: System MUST validate release tag follows semantic versioning before proceeding
- **FR-015**: System MUST publish both `track-metrics` and `quality-gate` actions to their respective repos
- **FR-016**: System MUST clear existing files in target repos (except `.git`) before copying new files

**Metadata & Discovery:**
- **FR-017**: npm package MUST include keywords for discoverability (metrics, ci, github-actions, code-quality, testing, coverage, bun)
- **FR-018**: npm package MUST specify Bun as required runtime in engines field
- **FR-019**: GitHub Actions MUST include proper branding (icon, color) in action.yml for future Marketplace listing
- **FR-020**: All published artifacts MUST reference the source repository and release version for traceability

### Key Entities

- **npm Package**: The published `unentropy` package containing the bundled CLI, installed via `bunx` or `npm install -g`
- **CLI Entry Point**: The executable script (`dist/index.js`) with Node shebang that users invoke via `unentropy` command
- **Source Action**: An action defined in `.github/actions/{name}/` containing `action.yml`, `dist/`, and `README.md`. Currently: `track-metrics` and `quality-gate`
- **Target Repository**: A dedicated public repository (`unentropy/{action-name}`) that contains only the publishable action files and serves as the Marketplace entry point
- **Release Tag**: A semantic version tag (e.g., `v0.1.0`, `v1.2.3`) that triggers publishing and determines version numbers for all created tags
- **Floating Tag**: A mutable tag (`v0`, `v0.1`, `v1`, `v1.2`) that always points to the latest compatible release, enabling users to auto-update
- **npm dist-tag**: A label (e.g., `latest`, `beta`) that identifies release channels on npm registry

## Success Criteria *(mandatory)*

### Measurable Outcomes

**npm Publishing:**
- **SC-001**: Users can run `bunx unentropy init` successfully within 5 minutes of a release being published to npm
- **SC-002**: npm package page displays correct version, description, and documentation immediately after publish
- **SC-003**: Package installs successfully on all platforms where Bun is supported (macOS, Linux, Windows)
- **SC-004**: Beta versions (0.x) are correctly tagged and installable via `bunx unentropy@beta`

**GitHub Actions Publishing:**
- **SC-005**: 100% of valid semver releases result in updated target repos with correct files and tags
- **SC-006**: Users can reference actions with `@v0` syntax within 5 minutes of release (during beta phase)
- **SC-007**: Floating tags (`v0`, `v0.1`) always point to the latest compatible release

**Discovery:**
- **SC-008**: Unentropy package appears in npm search results for relevant keywords (metrics, ci, code-quality)
- **SC-009**: GitHub action repos have complete README documentation enabling users to adopt without marketplace

**Quality:**
- **SC-010**: Zero manual intervention required for routine beta releases after initial setup (npm account, PAT, target repos)
- **SC-011**: All publishing steps complete within 10 minutes of creating a release

## Assumptions

**npm Publishing:**
- npm account exists with publish permissions for `unentropy` package name
- npm authentication token with publish scope will be stored as `NPM_TOKEN` repository secret
- Bun runtime version 1.0.0+ is specified in package.json engines field
- Package name `unentropy` is available (not claimed by another package)
- Beta versions (0.x.x) are acceptable for initial npm publish

**GitHub Actions Publishing:**
- The `unentropy` GitHub organization exists with admin access
- Target repositories (`unentropy/track-metrics`, `unentropy/quality-gate`) created manually before first use
- PAT with `repo` scope stored as `ACTIONS_PUBLISH_TOKEN` repository secret
- Target repos have no branch/tag protection blocking force-pushes to tags
- Beta versions (v0.x.x) are acceptable for initial action releases

**Marketplace (P3 - Future):**
- First Marketplace publication will be done manually to accept GitHub Developer Agreement
- Marketplace listing can wait until post-beta (v1.0.0) or can be done during beta with clear "beta" indication

**General:**
- All releases in main repository follow semantic versioning (vMAJOR.MINOR.PATCH)
- README files maintained in source directories and copied during publishing
- Beta phase covers 0.x.x versions with intent to reach 1.0.0 for stable release
- Publishing workflows support both beta (0.x) and stable (1.x+) versions with same automation
