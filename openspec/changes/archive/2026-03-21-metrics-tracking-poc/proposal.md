## Why

This change migrates the 001-metrics-tracking-poc feature from SpecKit format to OpenSpec format. The migration is needed to align with the project's adoption of OpenSpec for specification-driven development, providing better integration with AI-assisted development workflows and more structured artifact management.

## What Changes

- Migrate 001-metrics-tracking-poc from specs/ directory to OpenSpec structure
- Convert spec.md to OpenSpec spec.md in openspec/specs/001-metrics-tracking-poc/
- Move contract files to appropriate OpenSpec artifacts (design, tasks, or delta specs)
- Migrate supporting files (research.md, plan.md, tasks.md, quickstart.md, checklists/) to appropriate OpenSpec locations
- Preserve all content while following OpenSpec principles
- Update documentation generation to use OpenSpec structure

## Capabilities

### New Capabilities

- `metrics-tracking-poc`: Foundational metrics tracking system with configuration management, data persistence, and report generation capabilities

### Modified Capabilities

- None (this is a migration of existing functionality without requirement changes)

## Impact

- Documentation generation scripts will need to read from openspec/specs/ instead of specs/
- All existing functionality is preserved
- No breaking changes to user-facing APIs or configuration
