# Documentation Structure

This file defines how specifications are transformed into user-facing documentation for Unentropy.

## Purpose

This structure serves as the blueprint for the `/generate-docs` command, which automates the transformation of internal specifications into public documentation suitable for the Astro-powered website.

## Navigation Hierarchy

The documentation follows a shallow, 2-level structure optimized for discoverability and maintenance.

### Getting Started (Order: 1)

**Purpose**: Help new users get up and running quickly

- **Quick Start** (`getting-started.md`)
  - **Sources**:
    - README.md (Quick Start section, key features)
    - 008-init-scaffolding (User Story 1, 6, 7)
  - **Content**:
    - Installation options
    - `bunx unentropy init` workflow
    - First metric collection with `bunx unentropy test`
    - Preview report with `bunx unentropy preview`
    - Adding GitHub workflows
    - Next steps

### Guides (Order: 2)

**Purpose**: Task-oriented guides for core features

- **Metrics** (`guides/metrics.md`)
  - **Sources**:
    - 005-metrics-gallery (all user stories, built-in metric definitions)
    - 001-metrics-tracking-poc (User Story 1 - custom metrics)
  - **Content**:
    - Built-in metrics (LOC, coverage, bundle size)
    - Custom metrics with `@collect` command
    - Metric collectors and how they work
    - Configuration examples

- **Storage** (`guides/storage.md`)
  - **Sources**:
    - 003-unified-s3-action (User Story 1, 2, configuration examples)
  - **Content**:
    - Storage options overview (artifact, S3, local)
    - GitHub Artifacts (default)
    - S3-compatible storage setup (AWS S3, Cloudflare R2, MinIO)
    - Local development storage
    - Configuration and secrets

- **Quality Gates** (`guides/quality-gates.md`)
  - **Sources**:
    - 004-metrics-quality-gate (User Stories 1, 2, 3, threshold examples)
  - **Content**:
    - What are quality gates
    - Setting up thresholds
    - PR comment integration
    - Quality gate modes (off, soft, hard)
    - Threshold evaluation logic
    - Handling missing baselines

- **Reports** (`guides/reports.md`)
  - **Sources**:
    - 006-metrics-report (User Story 4, visualization examples)
  - **Content**:
    - Generating HTML reports
    - Report structure and sections
    - Chart visualizations
    - Publishing to GitHub Pages
    - Customization options

### Reference (Order: 3)

**Purpose**: Complete API and configuration reference for lookup

- **CLI Commands** (`reference/cli.md`)
  - **Sources**:
    - 008-init-scaffolding (all functional requirements, CLI commands)
    - 001-metrics-tracking-poc (verify command)
  - **Content**:
    - `init` command (options, project types, examples)
    - `test` command (validation, collection)
    - `preview` command (report preview)
    - `verify` command (config validation)
    - Command options and flags

- **Configuration** (`reference/config.md`)
  - **Sources**:
    - 001-metrics-tracking-poc/contracts/config-schema.md
    - All spec contracts with config examples
  - **Content**:
    - Complete config schema
    - Metrics configuration
    - Storage configuration
    - Quality gate configuration
    - Collector configuration
    - Examples for each option

- **GitHub Actions** (`reference/actions.md`)
  - **Sources**:
    - 003-unified-s3-action/contracts/action-interface.md
    - 004-metrics-quality-gate/contracts/action-interface.md
  - **Content**:
    - `track-metrics` action inputs/outputs
    - `quality-gate` action inputs/outputs
    - Workflow examples
    - Action configuration
    - Integration patterns

### Troubleshooting (Order: 4)

**Purpose**: Common issues and solutions

- **Common Issues** (`troubleshooting.md`)
  - **Sources**:
    - Edge cases from all specs (001, 003, 004, 005, 006, 008)
  - **Content**:
    - Configuration errors
    - Collection failures
    - Storage issues
    - Quality gate problems
    - FAQ

## Extraction Rules

### From User Stories

**Extract:**
- User story narrative (the problem/goal)
- "Why this priority" → Convert to user benefit callout
- Acceptance scenarios → Step-by-step examples with code

**Transform:**
```
SPEC: "As a developer, I want to X so that Y"
      "Why this priority: Z"

DOCS: "You can X to achieve Y. This helps you Z."
```

**Skip:**
- Priority labels (P1, P2, P3)
- "Independent test" sections
- Test metadata and implementation details

### From Functional Requirements

**Extract:**
- Requirement descriptions
- Configuration constraints
- Supported features

**Transform:**
```
SPEC: "FR-001: System MUST support defining custom metrics with user-specified names"

DOCS: "## Custom Metrics
      
      Define your own metrics with custom names:
      
      ```json
      {
        "metrics": {
          "my-metric": { ... }
        }
      }
      ```"
```

**Skip:**
- FR-XXX identifiers
- MUST/SHOULD/MAY compliance language
- Internal implementation constraints

### From Acceptance Scenarios

**Extract:**
- Given/When/Then scenarios → Code examples
- Configuration samples
- Expected outputs

**Transform:**
```
SPEC: Given a config with thresholds,
      When PR is opened,
      Then system evaluates metrics

DOCS: "## Example: Coverage Threshold
      
      When you configure a threshold:
      
      ```json
      {
        "qualityGate": {
          "thresholds": [
            { "metric": "coverage", "mode": "min", "target": 80 }
          ]
        }
      }
      ```
      
      Unentropy evaluates it on every pull request."
```

### From Contracts

**Extract:**
- Full contract documents
- All code examples
- Schema definitions
- API specifications

**Transform:**
- Add introductory context paragraph
- Simplify technical headers to be user-friendly
- Preserve all technical accuracy
- Add usage examples where helpful

**Skip:**
- Internal versioning metadata
- Implementation notes not relevant to users

### From Edge Cases

**Extract:**
- Error conditions
- Unexpected scenarios
- Solutions/workarounds

**Transform:**
```
SPEC: "What happens when config file is missing?"

DOCS: "### Config file not found
      
      **Problem**: Error: Cannot find unentropy.json
      
      **Solution**: Run `bunx unentropy init` to create one, or specify a custom path with `--config`."
```

## Content Filters (What NOT to Extract)

### Internal Implementation Details
- Database schemas (unless user-facing)
- Storage provider internals
- Migration logic
- CI/CD pipeline specifics

### Spec Metadata
- Feature branch names
- Status markers (Draft, Implemented)
- Development checklists
- Spec versioning

### Testing Artifacts
- Integration test scenarios
- Contract test details
- Unit test specifications

### Technical Architecture
- Internal class structures
- Design patterns (unless relevant to user decisions)
- Performance optimization internals

## Tone and Style Guidelines

### Voice
- **Direct and concise**: Short paragraphs, clear statements
- **Approachable**: "You can..." not "The system enables users to..."
- **Practical**: Code examples first, theory second
- **Honest**: Don't oversell, explain limitations

### Structure
- **Short paragraphs**: 2-3 sentences maximum
- **Bullet points**: For lists and options
- **Code blocks early**: Show, then explain
- **Headings**: One concept per section
- **Examples**: Real-world scenarios, not contrived

### Writing Patterns

**Do:**
```markdown
You can track custom metrics by defining them in unentropy.json:

```json
{
  "metrics": {
    "api-count": {
      "command": "grep -r 'export.*function' src/api | wc -l"
    }
  }
}
```

This runs the command on each build and stores the result.
```

**Don't:**
```markdown
The Unentropy system enables users to configure custom metrics through the provision of metric definitions in the unentropy.json configuration file. The system will execute the specified command and persist the resulting value to the database for historical tracking purposes.
```

### Code Examples
- Always include language tags: ```json, ```bash, ```yaml
- Show complete, runnable examples
- Include expected output when helpful
- Use realistic values (not foo/bar unless teaching concepts)

### Callouts
Use sparingly for:
- **Tips**: Helpful shortcuts or best practices
- **Warnings**: Common mistakes or gotchas
- **Notes**: Additional context

```markdown
> **Tip**: Run `bunx unentropy test` to verify metrics collection before pushing to CI.
```

## Special Sections

### Quick Start Preservation
The README.md quick start style is good - preserve this:
- Numbered steps (1, 2, 3...)
- Command-first approach (show command, then explain)
- Example output blocks
- "That's it!" style conclusions

### Configuration Examples
Every configuration option should have:
1. Description of what it does
2. Code example showing usage
3. Expected behavior/output

### Troubleshooting Format
```markdown
### [Problem Title]

**Symptoms**: What the user sees
**Cause**: Why it happens
**Solution**: How to fix it
**Example**: Code showing the fix
```

## File Organization

```
docs/
├── getting-started.md        # 1 file
├── guides/
│   ├── metrics.md           # 4 files
│   ├── storage.md
│   ├── quality-gates.md
│   └── reports.md
├── reference/
│   ├── cli.md               # 3 files
│   ├── config.md
│   └── actions.md
└── troubleshooting.md        # 1 file

Total: 9 documentation files
```

## Astro/Starlight Integration

### Frontmatter Format
```yaml
---
title: Quality Gates
description: Set up automated thresholds to prevent quality regressions
sidebar:
  order: 3
---
```

### Navigation Auto-Generation
Starlight will auto-generate navigation from:
- Directory structure (guides/, reference/)
- Frontmatter `sidebar.order`
- File naming

No manual sidebar configuration needed.

## Maintenance

### When to Update Docs
- Spec marked as "Implemented"
- User-facing feature added or changed
- Configuration schema changes
- New edge cases discovered

### Re-generation
```bash
# Regenerate single doc
/generate-docs quality-gates

# Regenerate all docs
/generate-docs all
```

### Manual Enhancements
Docs are auto-generated as starting points. Maintainers should:
1. Review generated content for accuracy
2. Add context, tips, and examples
3. Refine wording for clarity
4. Add diagrams or screenshots where helpful

Use git to track changes between auto-generated and manually enhanced versions.

## Excluded Specs

These specs are **internal-only** and should NOT generate user-facing docs:

- **007-publishing**: Internal npm/action publishing process
- Any spec marked "Status: Internal" or "Type: Infrastructure"

## User-Facing Specs (Include in Docs)

- ✅ **001-metrics-tracking-poc**: Core concepts, configuration
- ✅ **003-unified-s3-action**: Storage options
- ✅ **004-metrics-quality-gate**: Quality gates
- ✅ **005-metrics-gallery**: Built-in metrics
- ✅ **006-metrics-report**: Report generation
- ✅ **008-init-scaffolding**: CLI commands, getting started
