# Proposal: Migrate from SpecKit to OpenSpec

## Intent

Migrate the Unentropy project from the legacy SpecKit specification system to OpenSpec to leverage a more fluid, agent-friendly workflow while preserving all existing specification content and enabling better integration with AI coding assistants.

## Scope

In scope:

- Migrate all existing SpecKit specifications from `specs/` directory to OpenSpec format
- Convert SpecKit contract files to OpenSpec artifacts
- Update documentation generation process to work with OpenSpec structure
- Remove all SpecKit-specific files and directories
- Preserve all existing specification content and structure
- Maintain backward compatibility for documentation generation

Out of scope:

- Changing the actual specification content or requirements
- Modifying implementation code (only specification files)
- Altering the project's core functionality
- Removing any non-SpecKit related files

## Approach

1. Set up OpenSpec with appropriate configuration in `openspec/config.yaml`
2. For each existing SpecKit feature:
   - Create corresponding OpenSpec change (if not already done)
   - Map SpecKit spec.md to OpenSpec source of truth spec
   - Convert contract files to appropriate OpenSpec artifacts (proposal, design, tasks)
   - Preserve all existing content in appropriate locations
3. Update documentation generation process to read from OpenSpec structure
4. Verify all specifications are correctly migrated
5. Remove all SpecKit-specific files and directories
6. Validate that the system works correctly with OpenSpec only
