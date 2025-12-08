---
description: Generate user-facing documentation from specification files
handoffs:
  - label: Review Generated Documentation
    agent: build
    prompt: Review the generated documentation files for accuracy and clarity
    send: false
---

## User Input

```text
$ARGUMENTS
```

**Scope**: You can specify what to generate:
- **Spec number**: `004` → Generate docs from spec 004
- **Doc name**: `quality-gates` → Generate guides/quality-gates.md
- **Section**: `guides` → Generate all guides
- **Section**: `reference` → Generate all reference docs
- **All**: `all` → Generate all documentation

If no argument provided, prompt the user to specify scope.

## Overview

This command automates the transformation of internal specifications into user-facing documentation suitable for the Astro/Starlight website. It reads the documentation structure from `specs/documentation-structure.md` and applies extraction rules to convert formal specifications into approachable, practical guides.

## Execution Steps

### 1. Setup

Parse user input to determine scope:
- If `$ARGUMENTS` is empty: prompt user to specify scope and EXIT
- If argument is a number (e.g., `004`): generate docs sourced from that spec
- If argument is a doc name (e.g., `quality-gates`): generate that specific doc
- If argument is a section (e.g., `guides`): generate all docs in that section
- If argument is `all`: generate all documentation

Load documentation structure:
- Read and parse: `@specs/documentation-structure.md`
- Build mapping of: spec sources → target doc files
- Identify which docs need to be generated based on scope

### 2. Validate Prerequisites

Check required files exist:
- Verify all source spec files are available
- Verify contracts/ subdirectories exist where referenced
- If any source missing: WARN user and skip that doc

Create output directory:
- Create `docs/` directory if it doesn't exist
- Create subdirectories: `docs/guides/`, `docs/reference/`

### 3. Load Source Content

For each doc to be generated, load all source specifications:

**Example for guides/quality-gates.md:**
- Read spec file: `@specs/004-metrics-quality-gate/spec.md`
- Parse sections: User Stories, Functional Requirements, Edge Cases
- Extract relevant content per extraction rules

**Content Loading Strategy:**
- Load full spec files into context
- Identify relevant sections (User Stories, Functional Requirements, etc.)
- Skip internal sections (Testing, Success Criteria metadata, Spec versioning)

### 4. Apply Extraction Rules

Transform spec content following `documentation-structure.md` rules:

#### User Stories → Guide Content

For each user story:
1. Extract narrative (the problem/goal statement)
2. Extract "Why this priority" → Convert to user benefit
3. Extract acceptance scenarios → Code examples
4. **Transform tone**: "As a developer, I want X" → "You can X to achieve..."

**Skip:**
- Priority labels
- Independent test sections
- Test implementation details

#### Functional Requirements → Feature Lists

For each FR-XXX requirement:
1. Extract feature description
2. Remove compliance language (MUST/SHOULD)
3. Convert to user-facing capability description
4. Group related requirements into sections

**Skip:**
- FR-XXX identifiers (just use content)
- Internal implementation constraints

#### Acceptance Scenarios → Examples

For each Given/When/Then:
1. Extract the scenario
2. Convert to step-by-step code example
3. Add expected output where helpful
4. Include configuration samples

#### Contracts → API Reference

For contract files (config-schema.md, action-interface.md):
1. Load full content
2. Add introductory context paragraph
3. Simplify headers to be user-friendly
4. Preserve all code examples and technical accuracy

#### Edge Cases → Troubleshooting

For each edge case:
1. Identify the problem
2. Extract solution/workaround
3. Format as: Problem → Cause → Solution → Example

### 5. Generate Documentation Files

For each target doc, create markdown with:

**Frontmatter:**
```yaml
---
title: [Derived from doc mapping]
description: [Brief, compelling description]
sidebar:
  order: [From navigation structure]
unentropy_docs:
  generated: [ISO 8601 timestamp, e.g., 2025-12-08T14:32:00Z]
  sources:
    - [List of spec file paths used, e.g., specs/005-metrics-gallery/spec.md]
    - [One path per line]
  scope: [Scope argument used for generation, e.g., metrics, all, 004]
---
```

**Metadata Fields:**
- `unentropy_docs.generated` - Current timestamp in ISO 8601 format (UTC)
- `unentropy_docs.sources` - Array of spec file paths that were used to generate this doc (from documentation-structure.md mapping)
- `unentropy_docs.scope` - The scope argument that was used (for reference)

**Content Structure:**

1. **Introduction Paragraph**
   - What this doc covers
   - Why it matters
   - Link to related docs

2. **Main Sections**
   - Organized by logical flow (getting started → advanced)
   - Short paragraphs (2-3 sentences max)
   - Code examples early and often
   - Headings: One concept per section

3. **Examples Throughout**
   - Real-world scenarios
   - Complete, runnable code
   - Expected outputs shown
   - Realistic values (not foo/bar)

4. **Related Links**
   - Link to other relevant docs
   - Link to GitHub for issues

**Tone Guidelines (Critical):**
- Direct: "You can..." not "The system enables..."
- Concise: Short paragraphs, bullet points for lists
- Practical: Code first, theory second
- Approachable: No formal academic language

### 6. Apply Content Filters

**Exclude these from generated docs:**

❌ **Internal Implementation**:
- Database schemas (unless user-facing)
- Storage provider internals
- Migration logic
- CI/CD specifics

❌ **Spec Metadata**:
- Feature branch names
- Status markers (Draft/Implemented)
- Development checklists
- Spec versioning info

❌ **Testing Artifacts**:
- Integration test details
- Contract test specs
- Unit test scenarios

### 7. Validation

Before writing files, validate:

✅ **Content Quality:**
- All code blocks have language tags (```json, ```bash, etc.)
- All internal links use relative paths
- No spec-specific jargon (FR-XXX, SC-XXX)
- Tone is conversational and direct

✅ **Completeness:**
- All promised sections exist
- Examples included for major features
- Troubleshooting covers common issues

✅ **Markdown Syntax:**
- Valid YAML frontmatter
- Proper heading hierarchy (no skipped levels)
- Lists formatted consistently
- Tables properly formatted

### 8. Write Output

Write generated documentation:
- Save to: `docs/[path-from-mapping].md`
- Use UTF-8 encoding
- Unix line endings (LF)
- Trailing newline

**Include metadata in frontmatter:**
- Add `unentropy_docs` section with:
  - `generated`: Current timestamp in ISO 8601 format (e.g., `2025-12-08T14:32:00Z`)
  - `sources`: List of spec file paths from documentation-structure.md mapping for this doc
  - `scope`: The scope argument that triggered generation (e.g., `all`, `metrics`, `004`)
- This metadata enables the `/check-docs` command to track consistency

**Example outputs:**
- `docs/getting-started.md`
- `docs/guides/metrics.md`
- `docs/guides/storage.md`
- `docs/guides/quality-gates.md`
- `docs/guides/reports.md`
- `docs/reference/cli.md`
- `docs/reference/config.md`
- `docs/reference/actions.md`
- `docs/troubleshooting.md`

### 9. Report Completion

Display summary:

```
✓ Generated documentation

Files created:
  - docs/guides/quality-gates.md (from spec 004)
  [... other files ...]

Next steps:
  1. Review generated docs for accuracy
  2. Add context, tips, and examples where helpful
  3. Test code examples
  4. Commit to repository

Run `/generate-docs [scope]` to regenerate anytime.
```

## Special Instructions

### Code Examples Format

Always format code with language tags:

```markdown
Install Unentropy:

\```bash
bunx unentropy init
\```

Configure a metric:

\```json
{
  "metrics": {
    "coverage": {
      "$ref": "coverage"
    }
  }
}
\```
```

### Callouts

Use sparingly for tips, warnings, notes:

```markdown
> **Tip**: Run `bunx unentropy test` before pushing to CI to catch issues early.

> **Warning**: S3 credentials must be configured as GitHub secrets.

> **Note**: Quality gates run only on pull requests, not main branch.
```

### Linking

Use relative links for internal docs:

```markdown
See [Configuration Reference](../reference/config.md) for all options.

Learn about [Quality Gates](quality-gates.md) to prevent regressions.
```

### Section Ordering

Follow this order within each doc:

1. What (brief intro)
2. Why (user benefit)
3. How (step-by-step)
4. Examples (complete code)
5. Advanced (optional features)
6. Troubleshooting (common issues)
7. Related (links to other docs)

### README.md Special Case

If scope includes getting-started.md, preserve the README.md style:
- Numbered steps (1, 2, 3)
- Command-first (show command, explain after)
- Example output blocks
- "That's it!" conclusions

### Troubleshooting Format

Format each issue consistently:

```markdown
### Config File Not Found

**Symptoms**: Error: "Cannot find unentropy.json"

**Cause**: No configuration file in current or parent directories

**Solution**: Run `bunx unentropy init` to create one

**Example**:
\```bash
cd /path/to/project
bunx unentropy init
\```
```

## Error Handling

### Missing Source Files

If spec file doesn't exist:
```
⚠ Warning: Spec 004 not found, skipping guides/quality-gates.md
```

Continue with other docs.

### Invalid Scope

If scope argument is invalid:
```
❌ Error: Invalid scope "xyz"

Valid options:
  - Spec numbers: 001, 003, 004, 005, 006, 008
  - Doc names: metrics, storage, quality-gates, reports, cli, config, actions
  - Sections: guides, reference
  - All: all
```

EXIT with code 1.

### Parsing Errors

If spec file cannot be parsed:
```
⚠ Warning: Failed to parse spec 004, check file format
```

Skip that doc, continue with others.

## Scope Resolution Examples

| User Input | Resolves To | Action |
|------------|-------------|--------|
| `004` | spec 004-metrics-quality-gate | Generate guides/quality-gates.md |
| `quality-gates` | guides/quality-gates.md | Generate guides/quality-gates.md |
| `guides` | guides/ section | Generate all 4 guides/*.md files |
| `reference` | reference/ section | Generate all 3 reference/*.md files |
| `all` | everything | Generate all 9 docs |
| `cli` | reference/cli.md | Generate reference/cli.md |
| `008` | spec 008-init-scaffolding | Generate getting-started.md + reference/cli.md |

## Context Management

To preserve tokens:

1. **Load specs progressively**: Load one spec at a time, generate its docs, then release
2. **Summarize when possible**: Don't include entire spec files in memory simultaneously
3. **Extract only needed sections**: Parse specs to extract relevant sections only
4. **Reuse patterns**: Once extraction patterns are established, apply consistently

## Quality Checklist

Before finalizing each doc, verify:

- [ ] Title and description in frontmatter
- [ ] Introduction paragraph explains purpose
- [ ] All code blocks have language tags
- [ ] No FR-XXX or SC-XXX identifiers
- [ ] Tone is direct and approachable ("You can...")
- [ ] Examples are complete and realistic
- [ ] Links use relative paths
- [ ] No internal implementation details
- [ ] Troubleshooting includes solutions
- [ ] Related docs linked at bottom

## Output File Paths

**All paths are absolute**:
- Mapping source: `/home/mat/Projects/unentropy/specs/documentation-structure.md`
- Spec sources: `/home/mat/Projects/unentropy/specs/*/spec.md`
- Output directory: `/home/mat/Projects/unentropy/docs/`
- Subdirectories: `/home/mat/Projects/unentropy/docs/guides/`, `/home/mat/Projects/unentropy/docs/reference/`

## Example Transformation

**Input (spec 004, User Story 1):**
```
### User Story 1 - Configure and enforce metric thresholds on pull requests (Priority: P1)

Repository maintainers want to ensure that key code metrics (for example, coverage 
or complexity) do not regress beyond agreed limits when new changes are proposed.

**Why this priority**: This story delivers the core value of the feature: protecting 
code quality by turning metrics into clear, enforceable rules on incoming changes.

**Acceptance Scenarios**:
1. Given a repository with metrics tracking enabled and per-metric thresholds configured,
   When a pull request is opened or updated,
   Then the system evaluates each configured metric against its threshold.
```

**Output (guides/quality-gates.md section):**
```markdown
## Setting Up Quality Gates

Quality gates help you prevent code quality regressions by automatically checking 
metrics against thresholds on every pull request. When a metric crosses its threshold, 
the quality gate fails and notifies you.

### Configure Thresholds

Add thresholds to your `unentropy.json`:

\```json
{
  "qualityGate": {
    "thresholds": [
      {
        "metric": "coverage",
        "mode": "min",
        "target": 80
      }
    ]
  }
}
\```

When you open a pull request, Unentropy evaluates each metric against its threshold. 
If coverage drops below 80%, the quality gate fails and posts a comment on your PR.
```

Note how:
- Formal "User Story" → Direct "You can..." language
- "Why this priority" → User benefit in intro
- Given/When/Then → Code example with context
- Priority/metadata removed
- Concise, practical tone

## File Count Summary

Based on documentation-structure.md mapping:

**Total files to generate: 9**
- 1 × Getting Started
- 4 × Guides (metrics, storage, quality-gates, reports)
- 3 × Reference (cli, config, actions)
- 1 × Troubleshooting

Each generated from 1-3 source specs plus contracts where applicable.
