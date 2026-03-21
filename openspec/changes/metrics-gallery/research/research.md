# Research: Metrics Gallery

**Feature**: 005-metrics-gallery  
**Date**: 2025-12-10  
**Status**: Complete

This document consolidates design decisions for the Metrics Gallery feature and resolves the technical unknowns identified in the implementation plan.

## Decisions

### Decision 1: Object key as metric identifier

**Decision**: Use the object key in the metrics configuration as the unique metric identifier for all internal references, database storage, and quality gate thresholds.

**Rationale**: This enables the ultra-minimal `"loc": { "$ref": "loc" }` syntax where the key serves double duty as both the configuration entry key and the metric identifier. It eliminates the need for a separate `id` field while maintaining consistency with existing database storage (where the key is stored as `name`).

**Alternatives considered**:

- Keeping a separate `id` field was rejected as redundant and verbose for the common case where users want minimal configuration.
- Using template IDs as identifiers was rejected because it would prevent having multiple instances of the same template (e.g., source LOC vs test LOC).

### Decision 2: Template reference resolution with user overrides

**Decision**: When resolving `$ref` references, merge user-provided fields with template defaults, with user values taking precedence for `name`, `command`, `description`, `unit`, and `timeout`. The `type` field is inherited from the template and cannot be overridden.

**Rationale**: This provides the right balance of convenience and flexibility. Users get all the benefits of template metadata while being able to customize display names, commands, and other properties as needed. Preventing type overrides ensures consistency in how metrics are processed.

**Alternatives considered**:

- Allowing complete override of all fields was rejected because it would undermine the purpose of templates and could lead to inconsistent metric processing.
- Requiring all fields to be explicitly provided when using `$ref` was rejected as too verbose and defeating the purpose of templates.

### Decision 3: @collect shortcut implementation

**Decision**: Implement the `@collect` shortcut by transforming it to a CLI invocation (`bun src/index.ts collect <args>`) and executing it via the existing shell execution infrastructure, rather than creating direct in-process collector calls.

**Rationale**: This approach provides zero code duplication, perfect consistency with the CLI, minimal implementation effort (just 7 lines), and automatic updates when the CLI evolves. The performance difference is negligible for typical metric collection commands.

**Alternatives considered**:

- Creating direct in-process collector functions was rejected due to code duplication and maintenance overhead.
- Using a separate collector registry was rejected as unnecessary complexity when the CLI already provides the functionality.

### Decision 4: Error handling and validation

**Decision**: Provide clear, actionable error messages for all validation failures, including:

- Invalid key format (must be lowercase with hyphens)
- Invalid template references (with list of available templates)
- Missing commands when templates don't provide defaults
- Unknown collectors in @collect commands
- Invalid threshold references to non-existent metrics
- Missing required fields for custom metrics

**Rationale**: Clear error messages significantly reduce configuration frustration and enable users to correct mistakes quickly, especially important for the ultra-minimal use case where users expect things to "just work".

**Alternatives considered**:

- Providing generic error messages was rejected as unhelpful for troubleshooting.
- Attempting to auto-correct or provide fallbacks was rejected as potentially misleading and hiding configuration issues.

### Decision 5: Backward compatibility approach

**Decision**: Store the object key as the `name` field in the `metric_definitions` database table to maintain backward compatibility with existing queries and visualizations that expect to find metric identifiers in the `name` field.

**Rationale**: This allows existing dashboards, reports, and integrations to continue working without modification while enabling the new key-based identification system for configuration.

**Alternatives considered**:

- Adding a separate identifier field was rejected as more complex and requiring changes to all existing queries.
- Not maintaining backward compatibility was rejected as breaking existing user setups and reports.

### Decision 6: Template registry organization

**Decision**: Maintain a centralized registry of metric templates that includes all metadata (description, type, unit, default command) and makes it available for both configuration resolution and documentation generation.

**Rationale**: A centralized registry ensures consistency between configuration validation, documentation, and implementation. It also makes it easy to see all available templates in one place.

**Alternatives considered**:

- Scattering template definitions across multiple files was rejected as harder to maintain and document.
- Generating templates from code comments was rejected as less discoverable and harder to validate.

### Decision 7: Glob pattern support

**Decision**: Leverage the existing glob pattern support in the `size` collector (via Bun.Glob) when used through the `@collect` shortcut, without requiring additional implementation.

**Rationale**: The underlying collector already supports glob patterns, so exposing this functionality through `@collect` requires no additional code and provides valuable flexibility for users.

**Alternatives considered**:

- Implementing custom glob handling was rejected as duplicating existing functionality.
- Not supporting glob patterns was rejected as limiting usefulness for common use cases like checking multiple build artifacts.

### Decision 8: Versioning strategy

**Decision**: Treat the shift from array-based to object-based metrics configuration as a major version change (v4.0.0) due to the breaking change in configuration structure, while maintaining that future template additions will be minor versions.

**Rationale**: The change from `metrics: []` to `metrics: {}` is a breaking change that requires explicit user action to upgrade, warranting a major version bump. New templates are additive and non-breaking.

**Alternatives considered**:

- Attempting to support both formats simultaneously was rejected as overly complex and confusing.
- Making the change in a minor version was rejected as not properly communicating the breaking nature of the change.
