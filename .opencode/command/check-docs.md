# Check Documentation Consistency

## Purpose
Check if documentation files are up-to-date with their source specifications by comparing git modification timestamps and analyzing changes.

## Usage
/check-docs [scope]

## Arguments
- `scope` (optional): Specific scope to check
  - Spec number (e.g., `004`)
  - Doc name (e.g., `quality-gates`)
  - Section (e.g., `guides`, `reference`)
  - `all` - check all documentation
  - If omitted: auto-detect outdated docs by finding specs modified after their corresponding doc generation

## Process

1. **Load documentation structure**
   - Read `specs/documentation-structure.md` to get doc → spec mappings

2. **Determine scope**
   - If scope provided: Find docs matching that scope from mapping
   - If scope empty: For each doc with `unentropy_docs` metadata, check if any source specs were modified after `generated` timestamp

3. **For each doc in scope:**
   
   a. **Parse metadata from frontmatter**
      - Extract `unentropy_docs.generated` timestamp (ISO 8601)
      - Extract `unentropy_docs.sources` list
      - If missing metadata: Flag as "⚠️ Missing metadata" and skip detailed check
   
   b. **Check each source file**
      - Run `git log -1 --format=%ct <source-file>` to get last modified timestamp
      - Compare to doc's `generated` timestamp
      - If source newer: Mark doc as OUTDATED
      - If source older or same: Mark as UP TO DATE
   
   c. **For OUTDATED docs, analyze changes**
      - Run `git log --since=<generated-timestamp> --oneline <source-file>` to get commit list
      - Run `git diff <commit-at-generated-time>..HEAD -- <source-file>` to get detailed changes
      - Parse diff to identify:
        - Added/modified User Stories (pattern: `### User Story \d+`)
        - Added/modified Metric Templates (pattern: `**\`.*\`**`)
        - Added/modified Functional Requirements (pattern: `- \*\*FR-\d+\*\*`)
        - Changes in Edge Cases section
        - Contract file modifications
   
   d. **Generate specific recommendations**
      - Map detected changes to documentation sections:
        - User Story changes → Update guide examples/workflows
        - Metric Template additions → Add to Built-in Metrics section
        - FR additions/changes → Update configuration reference
        - Edge Cases → Update troubleshooting
        - Contract changes → Update reference docs
      - Be specific about which section needs updating and why

4. **Output report**
   
   Format:
   ```
   📋 Documentation Consistency Check
   
   Scope: <scope-description> [auto-detected|user-specified]
   
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
      ✓ Modified: User Story 2 acceptance scenarios
      
      Recommended updates:
      • Add 'test-time' metric to Built-in Metrics section
      • Update @collect command examples in Custom Metrics section
      • Review User Story 2 changes and update corresponding examples
   
   ---
   
   ✅ docs/guides/storage.md
      Sources: specs/003-unified-s3-action/spec.md (unchanged)
      Generated: 2025-12-08 16:20:00 UTC
      
      UP TO DATE
   
   ---
   
   ⚠️  docs/reference/config.md
      Missing metadata - cannot verify consistency
      
      Recommendation: Run `/generate-docs config` to regenerate with metadata
   
   ---
   
   Summary:
   • 1 outdated (requires regeneration)
   • 1 up to date
   • 1 missing metadata
   
   Next steps:
   1. Review recommended changes above
   2. Run `/generate-docs metrics` to regenerate outdated docs
   ```

## Notes
- Uses git to determine modification times (more accurate than filesystem mtime)
- Only checks sources listed in doc's metadata (narrow scope - Option A from earlier)
- Warns about missing metadata but continues
- Separate from `/generate-docs` - user reviews report first, then decides to regenerate
- If git history unavailable, warn and fall back to file timestamps
