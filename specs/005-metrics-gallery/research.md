# Research: Metrics Gallery

**Feature**: 005-metrics-gallery  
**Date**: 2025-11-22  
**Status**: Updated - Added CLI Helper Research

## Overview

This document captures research findings and design decisions for implementing the Metrics Gallery feature. All technical clarifications from the planning phase are resolved here.

## Key Design Decisions

### 1. Configuration Syntax for Built-in Metric References

**Decision**: Use `$ref` property with metric ID for built-in metric references

**Rationale**:
- `$ref` is a well-established convention from JSON Schema and OpenAPI specs
- Clear distinction from regular metric definitions
- Familiar to developers who have used schema-based configurations
- Allows coexistence with other properties for overrides

**Alternatives Considered**:
- `preset: "coverage"` - Less standard, could conflict with future properties
- `extends: "coverage"` - Implies inheritance which is more complex than needed
- `template: "coverage"` - Less commonly used in configuration contexts

**Example**:
```json
{
  "metrics": [
    {"$ref": "coverage"},
    {"$ref": "bundle-size", "name": "custom-bundle"}
  ]
}
```

### 2. Override Behavior and Merge Strategy

**Decision**: Shallow merge with user properties taking precedence

**Rationale**:
- Simple and predictable behavior
- User intent is clear: explicit properties override defaults
- No need for deep merging since metric configs are flat structures
- Validation occurs after merge, catching conflicts early

**Merge Algorithm**:
1. Load built-in metric definition by ID
2. Apply user-provided properties as overrides
3. Validate final merged config against MetricConfig schema
4. Return resolved metric

**Example**:
```typescript
// Built-in: {id: "coverage", type: "numeric", unit: "%", command: "..."}
// User: {$ref: "coverage", name: "my-coverage"}
// Result: {name: "my-coverage", type: "numeric", unit: "%", command: "..."}
```

### 3. Command Implementation Strategy

**Decision**: Built-in metrics provide metadata only; users always provide commands (can use CLI helpers)

**Rationale**:
- Commands are technology-specific and cannot be standardized
- CLI helpers provide format parsing while maintaining tool agnosticism
- Users know their project structure and tooling best
- Keeps built-in metrics focused on metadata (name, type, unit, description)

**Implementation**:
```typescript
// src/metrics/registry.ts
export const BUILT_IN_METRICS: Record<string, MetricTemplate> = {
  coverage: {
    id: 'coverage',
    name: 'coverage',
    description: 'Overall test coverage percentage across the codebase',
    type: 'numeric',
    unit: '%'
    // Note: No command - user provides their own or uses CLI helpers
  },
  // ... more metrics
};
```

### 4. Schema Validation Extension

**Decision**: Extend existing MetricConfig Zod schema to support optional `$ref` property

**Rationale**:
- Simpler than maintaining separate types for MetricConfig and MetricReference
- Single interface easier to understand and maintain
- Zod can handle conditional validation (required fields depend on presence of $ref)
- Type safety maintained with conditional types

**Schema Design**:
```typescript
const MetricConfigSchema = z.object({
  $ref: z.string().optional(),
  name: z.string().optional(),
  type: z.enum(['numeric', 'label']).optional(),
  command: z.string().optional(),
  description: z.string().optional(),
  unit: z.string().optional(),
  timeout: z.number().optional(),
}).refine((data) => {
  // If $ref is present, it's a gallery reference (overrides optional)
  if (data.$ref) return true;
  // If no $ref, require name, type, command (custom metric)
  return data.name && data.type && data.command;
}, {
  message: "Metric must either have $ref or provide name, type, and command"
});
```

### 5. Resolution Timing

**Decision**: Resolve gallery references during config loading, before validation

**Rationale**:
- Config loader already centralized in `src/config/loader.ts`
- Early resolution means rest of system works with resolved metrics
- No changes needed to collector, storage, or reporter
- Validation of resolved metrics uses existing logic

**Resolution Flow**:
1. Load unentropy.json
2. Parse JSON
3. For each metric in metrics array:
   - If has `$ref`, resolve from gallery and merge overrides
   - If no `$ref`, keep as-is
4. Validate all resolved metrics with existing schema
5. Return final config

### 6. Default Threshold Behavior

**Decision**: Store threshold defaults in gallery but don't automatically apply them

**Rationale**:
- Quality gate feature (004) is optional, not required
- Users who don't use quality gates shouldn't have thresholds
- Threshold defaults documented for users to copy if desired
- Keeps gallery feature independent of quality gate feature

**Implementation**:
- Built-in metrics include threshold recommendations in comments/docs
- Users explicitly configure quality gate thresholds if they want them
- Built-in metrics only provide command, unit, type - not threshold config

### 7. Error Messages for Invalid References

**Decision**: List available built-in metric IDs in error message

**Rationale**:
- Helps users discover valid options
- Reduces back-and-forth with documentation
- Common pattern in CLI tools and config validation

**Example Error**:
```
Invalid metric reference: "$ref: unknown-metric"
Available built-in metrics: coverage, function-coverage, loc, bundle-size, 
build-time, test-time, dependencies-count
```

## Command Research

### Traditional Commands (Complex)

**Coverage Commands**:
```bash
# Bun/Node.js - Complex parsing required
bun test --coverage --coverage-reporter=json 2>/dev/null | jq -r '.total.lines.pct' 2>/dev/null || echo '0'

# Function coverage
bun test --coverage --coverage-reporter=json 2>/dev/null | jq -r '.total.functions.pct' 2>/dev/null || echo '0'
```

**Bundle Size**:
```bash
find dist/ -name '*.js' -type f | xargs wc -c | tail -1 | awk '{print int($1/1024)}'
```

**Build/Test Time**:
```bash
(time bun run build) 2>&1 | grep real | awk '{print $2}' | sed 's/[^0-9.]//g'
```

**Problems with Traditional Approach**:
- Complex shell pipelines with jq/awk parsing
- Error-prone syntax (pipe failures, missing files)
- Technology-specific knowledge required
- Hard to debug and maintain

### CLI Helper Commands (Simplified)

**Coverage Commands**:
```bash
# Generate coverage first, then parse with CLI helper
bun test --coverage && unentropy collect coverage-json ./coverage/coverage.json
bun test --coverage && unentropy collect coverage-lcov ./coverage/lcov.info
```

**Bundle Size**:
```bash
bun run build && unentropy collect size ./dist/
```

**File Size**:
```bash
unentropy collect size ./dist/bundle.js
```

**Benefits of CLI Helper Approach**``:
- Simple, readable commands
- Built-in error handling and fallbacks
- Standard format support (LCOV, JSON, XML)
- Tool agnostic - works with any tool outputting standard formats
- Reduced configuration complexity

## Integration Points

### With Existing Config System

**Current Flow**:
1. `loader.ts` reads unentropy.json
2. `schema.ts` validates with Zod
3. Returns validated UnentropyConfig

**Updated Flow**:
1. `loader.ts` reads unentropy.json
2. **NEW**: `loader.ts` resolves $ref entries via `metrics/resolver.ts`
3. `schema.ts` validates resolved config with Zod
4. Returns validated UnentropyConfig

**Code Location**: Modify `src/config/loader.ts` function `loadConfig()`

### With Metric Collection

**No Changes Required**:
- Collector receives resolved MetricConfig objects
- Commands are executed same as before
- Gallery metrics indistinguishable from custom metrics after resolution

### Backward Compatibility

**Guarantee**: Existing configs without $ref work unchanged
- Schema validation allows both forms
- Resolution step skips non-$ref entries
- All existing tests pass without modification

### 8. CLI Helpers for Standard Formats

**Decision**: Add format-specific CLI helpers to simplify metric collection commands while maintaining tool agnosticism

**Rationale**:
- Current approach requires complex shell commands with jq/awk parsing
- CLI helpers provide standard-compliant format parsing
- Reduces user error and configuration complexity
- Maintains tool agnosticism by supporting standard formats only
- Optional - users can still use custom commands

**CLI Command Structure**:
```bash
unentropy collect <format-type> <source-path> [options]
```

**Supported Format Types**:
- `coverage-lcov <path>` - Parse LCOV format coverage reports
- `coverage-json <path>` - Parse JSON format coverage reports  
- `coverage-xml <path>` - Parse XML format coverage reports
- `size <path>` - Calculate size of file or directory (KB)

**Configuration Examples**:

**Before (complex)**:
```json
{
  "$ref": "coverage",
  "command": "bun test --coverage --coverage-reporter=json 2>/dev/null | jq -r '.total.lines.pct' 2>/dev/null || echo '0'"
}
```

**After (simplified with CLI helper)**:
```json
{
  "$ref": "coverage",
  "command": "bun test --coverage && unentropy collect coverage-json ./coverage/coverage.json"
}
```

**Bundle size example**:
```json
{
  "$ref": "bundle-size",
  "command": "bun run build && unentropy collect size ./dist/"
}
```

**File size example**:
```json
{
  "$ref": "bundle-size",
  "command": "unentropy collect size ./dist/bundle.js"
}
```

**Implementation Architecture**:
- New CLI module: `src/cli/cmd/collect.ts`
- Parser library: `src/metrics/collectors/` for different formats
- Each parser outputs single numeric value to stdout
- Comprehensive error handling with sensible defaults
- Integration with existing CLI via yargs command structure

**Benefits**:
1. **Simplified Commands**: Replace complex jq/awk pipelines with simple CLI helpers
2. **Standard Compliance**: Support industry-standard formats (LCOV, JSON, XML)
3. **Tool Agnostic**: Work with any tool outputting standard formats
4. **Error Handling**: Built-in error handling and fallback values
5. **Optional**: Users can still use custom commands when needed
6. **Backward Compatible**: Existing configurations continue to work unchanged

### 9. SCC Implementation for LOC Collector

**Decision**: Use SCC (Sloc Cloc and Code) as the implementation for the `loc` built-in metric, with CLI helper support for path exclusions and language filtering.

**Rationale**:
- SCC is much faster than shell-based `find + wc -l` approach
- Accurately counts code lines (excludes blanks and comments automatically)
- Supports 200+ programming languages with automatic detection
- Provides JSON output for reliable parsing
- Language filtering and directory exclusion are built-in features
- Well-maintained open-source tool (MIT licensed, 7.8k GitHub stars)

**Benefits Over Shell-Based Approach**:
1. **Performance**: SCC binary is optimized for code counting (significantly faster than file enumeration)
2. **Accuracy**: Properly excludes blank lines and comments (not just line counts)
3. **Language Support**: Automatically detects and counts multiple languages in same codebase
4. **Reliability**: JSON output prevents parsing errors from complex shell pipelines
5. **Features**: Built-in support for directory exclusion and language filtering

**Implementation Details**:
- SCC invocation: `scc --format json <path>`
- Output format: JSON array with language breakdown and total
- Total entry: Always includes `Name: "Total"` with `Code`, `Lines`, `Blanks`, `Comment`, `Complexity` fields
- CLI helper extracts `Code` field (lines excluding blanks/comments)
- Language filtering: Filter output by `Name` field for specific language
- Directory exclusion: Use SCC's `--exclude-dir` flag

**CLI Helper Command Structure**:
```bash
unentropy collect loc <path> [--exclude <patterns>] [--language <language>]
```

**Configuration Examples**:

**Basic LOC counting**:
```json
{
  "$ref": "loc",
  "command": "unentropy collect loc ./src/"
}
```

**With directory exclusions**:
```json
{
  "$ref": "loc",
  "command": "unentropy collect loc ./src/ --exclude dist node_modules .git"
}
```

**Language-specific counting**:
```json
{
  "$ref": "loc",
  "command": "unentropy collect loc ./ --language TypeScript"
}
```

**Backward Compatibility**:
- Existing shell-based LOC commands continue to work (no breaking changes)
- SCC is optional - users can use traditional `find + wc -l` if preferred
- `loc` metric definition remains unchanged (users control commands via `$ref`)

**Installation Requirements**:
- SCC must be available in PATH for LOC CLI helper to work
- Installation instructions provided in documentation
- GitHub Actions: Add SCC download step to workflow if using LOC helper
- Local development: `brew install scc` on macOS or download binary

### 10. @collect Implementation Strategy

**Decision**: Transform @collect commands to CLI invocations in `runCommand()` instead of implementing in-process collector registry

**Rationale**:
- Avoids code duplication - reuses 100% of existing CLI infrastructure
- Minimal implementation - only 7 lines of code added
- Perfect consistency - CLI and @collect use identical code paths
- Automatic updates - changes to CLI automatically work in @collect
- No new dependencies - uses existing shell execution infrastructure

**Implementation**:
```typescript
// In runCommand() - src/collector/runner.ts
let commandToRun = command;
if (command.trim().startsWith("@collect ")) {
  const collectArgs = command.trim().slice("@collect ".length);
  commandToRun = `bun src/index.ts collect ${collectArgs}`;
}
// Execute via existing shell infrastructure
```

**Alternatives Considered**:
1. **In-process collector registry**: More complex, duplicates yargs parsing logic, harder to maintain
2. **Yargs-based shared parsing**: Still duplicates configuration, adds 150+ lines of code
3. **CLI delegation (chosen)**: Simplest, most maintainable, zero duplication

**Trade-offs**:
- Performance: Subprocess overhead vs in-process execution (negligible for CI/CD)
- Simplicity: Clear winner - 7 lines vs 150+ lines
- Maintainability: Single source of truth for all collector logic
- Consistency: Perfect - literally the same code path

**Result**: 83% reduction in code changes compared to in-process approach while achieving identical functionality

## Open Questions

None. All design decisions finalized and documented above.

## Next Steps

Proceed to Phase 1: Data Model and Contracts
