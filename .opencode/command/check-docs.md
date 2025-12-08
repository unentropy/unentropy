---
description: Check documentation consistency by comparing source specs with generated docs
handoffs:
  - label: Regenerate Outdated Documentation
    agent: build
    prompt: Run /generate-docs to regenerate the outdated documentation files identified
    send: false
---

## User Input

```text
$ARGUMENTS
```

**Scope**: You can specify what to check:
- **Spec number**: `004` → Check docs sourced from spec 004
- **Doc name**: `quality-gates` → Check guides/quality-gates.md
- **Section**: `guides` → Check all guides
- **Section**: `reference` → Check all reference docs
- **All**: `all` → Check all documentation
- **Auto-detect**: (empty) → Find docs where source specs were modified after doc generation

If no argument provided, auto-detect outdated docs by finding specs modified after their corresponding doc generation.

## Overview

This command checks whether documentation files are up-to-date with their source specifications by comparing git modification timestamps and analyzing changes. It reads the `unentropy_docs` metadata from generated documentation frontmatter to determine source files and generation timestamps, then uses git to identify if sources have been modified since generation.

The command is **read-only** and produces a detailed consistency report with specific recommendations. Users can review the report and decide whether to regenerate documentation using `/generate-docs`.

## Execution Steps

### 1. Setup

Parse user input to determine scope:
- If `$ARGUMENTS` is empty: Auto-detect mode (find outdated docs)
- If argument is a number (e.g., `004`): Check docs sourced from that spec
- If argument is a doc name (e.g., `quality-gates`): Check that specific doc
- If argument is a section (e.g., `guides`, `reference`): Check all docs in that section
- If argument is `all`: Check all documentation

Validate git availability:
- Run `git --version` to ensure git is available
- If git not available: WARN user and EXIT (cannot check without git)

### 2. Load Documentation Structure

Read and parse the documentation mapping:
- Read: `@specs/documentation-structure.md`
- Parse the spec → doc file mappings
- Build list of all documentation files that should have `unentropy_docs` metadata

Expected mapping structure:
- `docs/getting-started.md` ← spec 008
- `docs/guides/metrics.md` ← specs 001, 005
- `docs/guides/storage.md` ← spec 003
- `docs/guides/quality-gates.md` ← spec 004
- `docs/guides/reports.md` ← spec 006
- `docs/reference/cli.md` ← spec 008
- `docs/reference/config.md` ← multiple specs
- `docs/reference/actions.md` ← specs 001, 003, 004
- `docs/troubleshooting.md` ← multiple specs

### 3. Determine Scope

Based on parsed scope argument, filter the documentation list:

**Auto-detect mode** (no argument):
- Check all docs with `unentropy_docs` metadata
- Only report docs that are OUTDATED or have missing metadata
- Skip docs that are up-to-date (reduces noise)

**Specific scope** (argument provided):
- If spec number: Filter to docs that list that spec in their sources
- If doc name: Filter to that specific doc file
- If section: Filter to docs in that directory (guides/ or reference/)
- If `all`: Include all docs

Store the scope description for the report header.

### 4. Check Each Document

For each documentation file in scope:

#### a. Read and Parse Frontmatter

Read the file: `@docs/[path].md`

Parse YAML frontmatter to extract:
- `unentropy_docs.generated` - ISO 8601 timestamp (e.g., `2025-12-08T14:32:00Z`)
- `unentropy_docs.sources` - Array of spec file paths
- `unentropy_docs.scope` - Scope used during generation (optional, for reference)

**If metadata missing:**
- Mark as: `⚠️ Missing metadata`
- Add recommendation: "Run `/generate-docs [name]` to regenerate with metadata"
- Skip detailed timestamp checking for this doc
- Continue to next doc

#### b. Convert Generation Timestamp

Convert the ISO 8601 timestamp to Unix epoch for comparison:
- Parse: `2025-12-08T14:32:00Z` → `1733668320` (Unix timestamp)
- This enables numeric comparison with git timestamps

#### c. Check Each Source File

For each source file in `unentropy_docs.sources`:

**Get last modification time:**
```bash
git log -1 --format=%ct <source-file>
```

This returns Unix timestamp of the last commit affecting that file.

**Compare timestamps:**
- If source timestamp > doc generated timestamp: Mark as MODIFIED
- If source timestamp ≤ doc generated timestamp: Mark as UNCHANGED
- Track which sources are modified and which are not

**Count modifications:**
- Count how many source files have been modified
- If any source modified: Mark doc as OUTDATED
- If no sources modified: Mark doc as UP TO DATE

#### d. For OUTDATED Docs, Analyze Changes

When a doc is outdated, provide detailed change analysis:

**1. Get commit list since generation:**
```bash
git log --since=<generated-timestamp> --oneline <source-file>
```

Parse output to extract:
- Commit hash (first 7 chars)
- Commit date
- Commit message

**2. Get detailed diff since generation:**

First, find the commit at generation time:
```bash
git log --until=<generated-timestamp> --format=%H -n 1 <source-file>
```

Then get diff from that commit to HEAD:
```bash
git diff <commit-at-generated-time>..HEAD -- <source-file>
```

**3. Parse diff to identify specific changes:**

Look for these patterns in the diff output:

- **User Story additions/modifications**: 
  - Pattern: `### User Story \d+`
  - Extract story number and title

- **Metric Template additions**:
  - Pattern: `**\`[^`]+\`**` in metrics sections
  - Extract template name

- **Functional Requirement changes**:
  - Pattern: `- \*\*FR-\d+\*\*`
  - Extract FR number and description

- **Edge Cases section changes**:
  - Pattern: Changes in `## Edge Cases` section
  - Extract edge case titles

- **Contract file modifications**:
  - Pattern: Changes in `contracts/` files
  - Note which contract files changed

**4. Generate Specific Recommendations:**

Map detected changes to documentation sections that need updates:

| Change Type | Documentation Impact |
|-------------|---------------------|
| User Story additions/changes | Update guide examples and workflows |
| Metric Template additions | Add to Built-in Metrics section |
| FR additions/changes | Update configuration reference |
| Edge Cases changes | Update troubleshooting section |
| Contract changes | Update API reference docs |

Be specific:
- "Add 'test-time' metric to Built-in Metrics section"
- NOT "Update metrics documentation"

### 5. Generate Report

Format and output the consistency check report:

**Report Structure:**

```
📋 Documentation Consistency Check

Scope: <scope-description> [auto-detected|user-specified: <argument>]

<for each doc in scope>

📄 docs/<path>.md
   Sources: specs/XXX/spec.md (modified YYYY-MM-DD)
            specs/YYY/spec.md (unchanged)
   Generated: YYYY-MM-DD HH:MM:SS UTC
   
   <STATUS>
   
   <details if outdated>

---

</for each doc>

Summary:
• X outdated (requires regeneration)
• Y up to date
• Z missing metadata

Next steps:
1. Review recommended changes above
2. Run `/generate-docs <scope>` to regenerate outdated docs
```

**Status Indicators:**

✅ **UP TO DATE** - All sources older or same as generation timestamp
```
✅ docs/guides/storage.md
   Sources: specs/003-unified-s3-action/spec.md (unchanged)
   Generated: 2025-12-08 16:20:00 UTC
   
   UP TO DATE
```

⚠️ **OUTDATED** - One or more sources modified after generation
```
⚠️  docs/guides/metrics.md
   Sources: specs/005-metrics-gallery/spec.md (modified 2025-12-09)
            specs/001-metrics-tracking-poc/spec.md (unchanged)
   Generated: 2025-12-08 10:15:00 UTC
   
   OUTDATED (1 source modified)
   
   Recent commits in specs/005-metrics-gallery/spec.md:
   • a3f5c2b (2025-12-09 14:23) - Added metric template 'test-time'
   • b7e8d1a (2025-12-09 14:45) - Updated @collect syntax examples
   
   Detected changes:
   ✓ Added: Metric template 'test-time' in Performance Metrics section
   ✓ Modified: FR-011 - @collect command syntax
   ✓ Modified: User Story 2 acceptance scenarios
   
   Recommended updates:
   • Add 'test-time' metric to Built-in Metrics section
   • Update @collect command examples in Custom Metrics section
   • Review User Story 2 changes and update corresponding examples
```

⚠️ **MISSING METADATA** - Cannot verify (no `unentropy_docs` in frontmatter)
```
⚠️  docs/reference/config.md
   Missing metadata - cannot verify consistency
   
   Recommendation: Run `/generate-docs config` to regenerate with metadata
```

### 6. Report Completion

Display the formatted report to the user.

In auto-detect mode, if all docs are up to date:
```
📋 Documentation Consistency Check

Scope: Auto-detected

✅ All documentation is up to date!

Checked 9 documentation files - no outdated docs found.
```

## Special Instructions

### Git Commands

All git operations use the working directory: `/home/mat/Projects/unentropy/`

**Getting file modification time:**
```bash
git log -1 --format=%ct specs/004-metrics-quality-gate/spec.md
```
Returns: `1733668320` (Unix timestamp)

**Getting commits since a timestamp:**
```bash
git log --since=2025-12-08T14:32:00Z --oneline specs/004-metrics-quality-gate/spec.md
```
Returns:
```
a3f5c2b Added metric template 'test-time'
b7e8d1a Updated @collect syntax examples
```

**Finding commit at specific time:**
```bash
git log --until=2025-12-08T14:32:00Z --format=%H -n 1 specs/004-metrics-quality-gate/spec.md
```
Returns: Full commit hash at or before that timestamp

**Getting diff since commit:**
```bash
git diff c2a1b3f..HEAD -- specs/004-metrics-quality-gate/spec.md
```
Returns: Unified diff format showing all changes

### Timestamp Conversion

Documentation `generated` field uses ISO 8601 format: `2025-12-08T14:32:00Z`

To compare with git timestamps:
1. Parse ISO 8601 to Unix epoch (seconds since 1970-01-01)
2. Compare numerically: `source_timestamp > doc_timestamp` = OUTDATED

Example:
- Doc generated: `2025-12-08T14:32:00Z` = `1733668320`
- Source modified: `1733672000`
- Comparison: `1733672000 > 1733668320` = TRUE (outdated)

### Diff Analysis Patterns

When parsing `git diff` output, look for these additions (lines starting with `+`):

**User Story:**
```diff
+### User Story 3 - Track test execution time (Priority: P2)
```
Extract: "User Story 3", "Track test execution time"

**Metric Template:**
```diff
+- **`test-time`**: Measures total test suite execution time in seconds
```
Extract: "test-time", template description

**Functional Requirement:**
```diff
+- **FR-015**: The system MUST support time-based metrics
```
Extract: "FR-015", requirement text

**Edge Case:**
```diff
+### When metrics exceed maximum numeric value
```
Extract: Edge case title

### Handling Multiple Sources

When a doc has multiple sources (e.g., `docs/reference/config.md`):
- Check each source independently
- Report each source with its individual status (modified/unchanged)
- If ANY source is modified, mark doc as OUTDATED
- Show commit history for ALL modified sources (not just one)
- Aggregate recommendations from all modified sources

Example:
```
📄 docs/reference/actions.md
   Sources: specs/001-metrics-tracking-poc/spec.md (modified 2025-12-07)
            specs/003-unified-s3-action/spec.md (modified 2025-12-09)
            specs/004-metrics-quality-gate/spec.md (unchanged)
   Generated: 2025-12-06 10:00:00 UTC
   
   ⚠️  OUTDATED (2 sources modified)
   
   Recent commits in specs/001-metrics-tracking-poc/spec.md:
   • e4f5a1c (2025-12-07 09:15) - Updated track-metrics action inputs
   
   Recent commits in specs/003-unified-s3-action/spec.md:
   • d2c3b4a (2025-12-09 11:30) - Added S3 bucket configuration
   • a1b2c3d (2025-12-09 14:00) - Updated action authentication
   
   Recommended updates:
   • Update track-metrics action input parameters
   • Add S3 bucket configuration examples
   • Update S3 authentication documentation
```

### Date Formatting

When displaying dates in the report:
- Use human-readable format: `2025-12-09` for dates
- Use full datetime for generation timestamps: `2025-12-08 10:15:00 UTC`
- Use relative format for commits: `2025-12-09 14:23` (date + time, no seconds)

## Error Handling

### Missing Git

If git is not available:
```
❌ Error: Git is required for documentation consistency checking

This command uses git to compare file modification times.

Please ensure git is installed and available in your PATH.
```

EXIT with code 1.

### Invalid Scope

If scope argument is invalid:
```
❌ Error: Invalid scope "xyz"

Valid options:
  - Spec numbers: 001, 003, 004, 005, 006, 008
  - Doc names: getting-started, metrics, storage, quality-gates, reports, cli, config, actions, troubleshooting
  - Sections: guides, reference
  - All: all
  - Auto-detect: (leave empty)
```

EXIT with code 1.

### Documentation Structure File Missing

If `specs/documentation-structure.md` doesn't exist:
```
❌ Error: Documentation structure file not found

Expected: specs/documentation-structure.md

This file is required to map documentation files to their source specifications.
```

EXIT with code 1.

### Documentation File Missing

If a doc file in scope doesn't exist:
```
⚠️  docs/guides/quality-gates.md
   File not found - may not have been generated yet
   
   Recommendation: Run `/generate-docs quality-gates` to generate this documentation
```

Continue checking other docs.

### Git History Unavailable

If git history is missing for a file (e.g., new file without commits):
```
⚠️  docs/guides/metrics.md
   Sources: specs/005-metrics-gallery/spec.md (no git history)
   Generated: 2025-12-08 10:15:00 UTC
   
   ⚠️  WARNING: Cannot determine source modification time
   
   Recommendation: Ensure source files are committed to git, or regenerate documentation
```

Mark as WARNING and continue.

### Metadata Parse Errors

If frontmatter exists but is malformed:
```
⚠️  docs/reference/config.md
   Invalid metadata format - cannot parse unentropy_docs section
   
   Recommendation: Run `/generate-docs config` to regenerate with valid metadata
```

Continue checking other docs.

## Scope Resolution Examples

| User Input | Resolves To | Action |
|------------|-------------|--------|
| *(empty)* | Auto-detect | Check all docs, report only outdated ones |
| `004` | spec 004 | Check guides/quality-gates.md |
| `005` | spec 005 | Check guides/metrics.md |
| `quality-gates` | guides/quality-gates.md | Check guides/quality-gates.md |
| `metrics` | guides/metrics.md | Check guides/metrics.md |
| `guides` | guides/ section | Check all 4 guides/*.md files |
| `reference` | reference/ section | Check all 3 reference/*.md files |
| `all` | everything | Check all 9 documentation files |
| `getting-started` | getting-started.md | Check docs/getting-started.md |
| `troubleshooting` | troubleshooting.md | Check docs/troubleshooting.md |

## Output File Paths

**All paths are absolute**:
- Documentation structure: `/home/mat/Projects/unentropy/specs/documentation-structure.md`
- Spec sources: `/home/mat/Projects/unentropy/specs/*/spec.md`
- Documentation files: `/home/mat/Projects/unentropy/docs/**/*.md`
- Working directory: `/home/mat/Projects/unentropy/`

## Example Full Report

```
📋 Documentation Consistency Check

Scope: Auto-detected

📄 docs/guides/metrics.md
   Sources: specs/005-metrics-gallery/spec.md (modified 2025-12-09)
            specs/001-metrics-tracking-poc/spec.md (unchanged)
   Generated: 2025-12-08 10:15:00 UTC
   
   ⚠️  OUTDATED (1 source modified)
   
   Recent commits in specs/005-metrics-gallery/spec.md:
   • a3f5c2b (2025-12-09 14:23) - Added metric template 'test-time'
   • b7e8d1a (2025-12-09 14:45) - Updated @collect syntax examples
   
   Detected changes:
   ✓ Added: Metric template 'test-time' in Performance Metrics section
   ✓ Modified: FR-011 - @collect command syntax
   
   Recommended updates:
   • Add 'test-time' metric to Built-in Metrics section
   • Update @collect command examples in Custom Metrics section

---

⚠️  docs/reference/config.md
   Missing metadata - cannot verify consistency
   
   Recommendation: Run `/generate-docs config` to regenerate with metadata

---

Summary:
• 1 outdated (requires regeneration)
• 6 up to date
• 1 missing metadata

Next steps:
1. Review recommended changes above
2. Run `/generate-docs metrics` to regenerate outdated docs
3. Run `/generate-docs config` to add missing metadata
```

## Quality Checklist

Before outputting the report, verify:

- [ ] All timestamps converted to human-readable format
- [ ] Modified sources clearly marked with dates
- [ ] Specific recommendations provided for outdated docs
- [ ] Summary counts are accurate
- [ ] Next steps are actionable and specific
- [ ] Auto-detect mode filters out up-to-date docs (reduces noise)
- [ ] All scope mode includes all docs (even up-to-date ones)
- [ ] Git commands executed successfully
- [ ] Error messages are helpful and actionable

## Context Management

To preserve tokens:

1. **Read docs one at a time**: Load one doc, check it, generate report section, release
2. **Parse frontmatter only**: Don't read entire doc content, just YAML frontmatter
3. **Summarize diffs**: Extract key changes, don't include full diff output in report
4. **Progressive reporting**: Build report incrementally rather than loading all data first
