# Feature Specification: GitHub Action Publishing

**Feature Branch**: `007-action-publishing`  
**Created**: 2025-01-03  
**Status**: Draft  
**Input**: User description: "Automated publishing of GitHub Actions (track-metrics and quality-gate) from monorepo to dedicated repositories for GitHub Marketplace listing"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Release Triggers Automated Action Publishing (Priority: P1)

As a maintainer of the Unentropy project, I want my GitHub Actions to be automatically published to dedicated repositories when I create a release in the main repository, so that users can discover and use them via the GitHub Marketplace with a clean reference syntax.

**Why this priority**: This is the core functionality that enables the entire publishing workflow. Without this, there is no automation and actions cannot be listed on the Marketplace.

**Independent Test**: Can be fully tested by creating a release in the main repository and verifying that both target repositories receive the correct files with proper tags.

**Acceptance Scenarios**:

1. **Given** a release `v1.2.3` is published in `unentropy/unentropy`, **When** the publish workflow runs, **Then** both `unentropy/track-metrics` and `unentropy/quality-gate` repositories are updated with the corresponding action files.

2. **Given** the publish workflow completes successfully, **When** I check the target repositories, **Then** each contains `action.yml`, `dist/` folder with bundled JavaScript, and `README.md`.

3. **Given** a release `v1.2.3` is published, **When** the workflow creates tags, **Then** three tags are created in each target repository: `v1.2.3` (exact), `v1.2` (minor), and `v1` (major).

---

### User Story 2 - Users Reference Actions with Clean Syntax (Priority: P2)

As a user of Unentropy actions, I want to reference the actions using a simple syntax like `uses: unentropy/track-metrics@v1`, so that my workflow files are clean and I can easily adopt new versions.

**Why this priority**: This is the end-user benefit that justifies the publishing automation. Users should have a seamless experience.

**Independent Test**: Can be tested by creating a workflow in any repository that references `unentropy/track-metrics@v1` and verifying it executes correctly.

**Acceptance Scenarios**:

1. **Given** the actions are published to dedicated repositories, **When** a user adds `uses: unentropy/track-metrics@v1` to their workflow, **Then** the action runs successfully using the latest v1.x.x version.

2. **Given** a user wants to pin to a specific version, **When** they use `uses: unentropy/quality-gate@v1.2.3`, **Then** the exact version is used regardless of newer releases.

3. **Given** a new patch release `v1.2.4` is published, **When** a user's workflow references `@v1` or `@v1.2`, **Then** they automatically get the new patch version on next run.

---

### User Story 3 - Actions Discoverable on GitHub Marketplace (Priority: P3)

As a potential user of Unentropy, I want to find the track-metrics and quality-gate actions in the GitHub Marketplace, so that I can evaluate and adopt them for my projects.

**Why this priority**: Marketplace listing increases discoverability but is a one-time manual step after initial automated publishing.

**Independent Test**: Can be tested by searching for "unentropy" in the GitHub Marketplace and verifying both actions appear with proper descriptions and categories.

**Acceptance Scenarios**:

1. **Given** the first release has been published to `unentropy/track-metrics`, **When** a maintainer manually publishes to Marketplace (one-time), **Then** the action appears in Marketplace search results.

2. **Given** an action is listed on Marketplace, **When** subsequent releases are published via automation, **Then** the Marketplace listing is automatically updated with the new version.

---

### Edge Cases

- What happens when the target repository does not exist? The workflow should fail with a clear error message indicating the repository must be created first.
- What happens when the PAT token lacks required permissions? The workflow should fail at the push step with an authentication error, logged clearly for debugging.
- What happens when building actions fails? The workflow should fail before attempting to publish, preventing partial or broken releases.
- What happens when a release tag doesn't follow semver (e.g., `latest`, `beta`)? The workflow should skip publishing and log a warning that only semver tags are supported.
- What happens when force-pushing floating tags fails due to branch protection? The workflow should document that target repositories must not have tag protection rules.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST trigger the publishing workflow when a release is published in the main repository.
- **FR-002**: System MUST build all actions using the existing build process before publishing.
- **FR-003**: System MUST copy `action.yml`, `dist/` folder, and `README.md` from each action's source directory to the corresponding target repository.
- **FR-004**: System MUST create an exact version tag (e.g., `v1.2.3`) in each target repository matching the release tag.
- **FR-005**: System MUST update floating minor tags (e.g., `v1.2`) to point to the latest patch release.
- **FR-006**: System MUST update floating major tags (e.g., `v1`) to point to the latest release in that major version.
- **FR-007**: System MUST use a Personal Access Token (PAT) stored as a repository secret to authenticate pushes to target repositories.
- **FR-008**: System MUST validate that the release tag follows semantic versioning format before proceeding with publishing.
- **FR-009**: System MUST publish both `track-metrics` and `quality-gate` actions as part of a single workflow run.
- **FR-010**: System MUST clear existing files in target repositories (except `.git`) before copying new files to ensure clean state.
- **FR-011**: System MUST include commit messages that reference the source release version for traceability.

### Key Entities

- **Source Action**: An action defined in `.github/actions/{name}/` containing `action.yml`, `dist/`, and `README.md`. Currently: `track-metrics` and `quality-gate`.
- **Target Repository**: A dedicated public repository (`unentropy/{action-name}`) that contains only the publishable action files and serves as the Marketplace entry point.
- **Release Tag**: A semantic version tag (e.g., `v1.2.3`) that triggers publishing and determines the version numbers for all created tags.
- **Floating Tag**: A mutable tag (`v1`, `v1.2`) that always points to the latest compatible release, enabling users to auto-update.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Publishing workflow completes successfully within 5 minutes of release creation.
- **SC-002**: 100% of releases with valid semver tags result in updated target repositories with correct files.
- **SC-003**: Users can reference actions using `@v1` syntax within 5 minutes of a release being published.
- **SC-004**: Zero manual intervention required for routine releases after initial Marketplace setup.
- **SC-005**: Both actions are updated atomically - either both succeed or neither is published (no partial releases).

## Assumptions

- The `unentropy` GitHub organization exists and the maintainer has admin access.
- Target repositories (`unentropy/track-metrics`, `unentropy/quality-gate`) will be created manually before first use.
- A PAT with `repo` scope will be created and stored as `ACTIONS_PUBLISH_TOKEN` secret.
- Target repositories will not have branch protection or tag protection rules that would block force-pushes.
- The first Marketplace publication for each action will be done manually to accept the Developer Agreement.
- README files will be maintained in the source action directories and copied during publishing.
- All releases in the main repository follow semantic versioning (vMAJOR.MINOR.PATCH format).
