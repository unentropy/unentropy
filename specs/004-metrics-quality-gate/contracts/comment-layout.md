# Quality Gate Comment Layout Specification

**Feature**: 004-metrics-quality-gate  
**Date**: 2025-12-14  
**Updated**: 2025-12-14 (Simplified layout: cleaner header, inline status, shorter columns)  
**Purpose**: Visual and behavioral contract for the GitHub PR comment UX

## 1. Overview

### Purpose
The Quality Gate PR Comment provides immediate feedback on code metrics for pull requests. It compares PR metrics against baseline values from the main branch and displays threshold evaluation results.

### Target Users
- **PR Authors**: Quick check if their changes meet quality thresholds
- **Reviewers**: Assess code health impact at a glance
- **Team Leads**: Ensure quality standards are maintained

### Design Principles
- **Scannable**: Overall status visible immediately (PASS/FAIL badge)
- **Actionable**: Failing metrics clearly highlighted with reasons
- **Non-intrusive**: Collapsible sections for additional detail
- **Informative**: Delta values show impact of changes
- **Self-explanatory**: Built-in help section for new users

---

## 2. Comment Structure

### Overall Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  <!-- unentropy-quality-gate -->   (hidden marker)              │
├─────────────────────────────────────────────────────────────────┤
│                           HEADER                                │
│  🛡️ Quality Gate: **PASS** ✅                                   │
├─────────────────────────────────────────────────────────────────┤
│                     EVALUATED METRICS TABLE                     │
│  | Metric            | Base     | PR       | Δ      |           │
│  |-------------------|----------|----------|--------|           │
│  | ✅ metric-name    | ...      | ...      | ...    |           │
│  | ❌ metric-name    | ...      | ...      | ...    |           │
│                                                                 │
│  ✅ X passed • ❌ Y failed                                      │
├─────────────────────────────────────────────────────────────────┤
│              OTHER TRACKED METRICS (collapsible)                │
│  ▶ Other tracked metrics (no thresholds configured)            │
├─────────────────────────────────────────────────────────────────┤
│                           FOOTER                                │
│  ▶ About this check (mode, reference, help)                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Catalog

### 3.1 Comment Marker (Hidden)

```markdown
<!-- unentropy-quality-gate -->
```

**Purpose**: HTML comment used to identify and update the canonical comment on subsequent runs.

**Behavior**:
- Configurable via `pr-comment-marker` action input
- Default: `<!-- unentropy-quality-gate -->`
- Action searches for existing comment containing this marker
- If found: Updates existing comment in place
- If not found: Creates new comment

---

### 3.2 Header

#### Variant A: Normal State (Baseline Available)

```
┌─────────────────────────────────────────────────────────────────┐
│  ## 🛡️ Quality Gate: **PASS** ✅                                │
└─────────────────────────────────────────────────────────────────┘
```

**Elements**:
- **Shield icon** (🛡️): Visual identifier for quality gate
- **Status badge**: PASS/FAIL/UNKNOWN with corresponding emoji

**Note**: Mode and reference branch are moved to the footer's "About this check" section for a cleaner header.

**Status Badge Variants**:

| Status | Badge | Usage |
|--------|-------|-------|
| Pass | `**PASS** ✅` | All evaluated thresholds met |
| Fail | `**FAIL** ❌` | One or more thresholds violated |
| Unknown | `**UNKNOWN** ⚠️` | Cannot evaluate (no baseline, no thresholds, etc.) |

---

#### Variant B: No Baseline Data

```
┌─────────────────────────────────────────────────────────────────┐
│  ## 🛡️ Quality Gate: **UNKNOWN** ⚠️                             │
│                                                                 │
│  ### No Baseline Data Available                                 │
│                                                                 │
│  This appears to be the first pull request, or baseline data    │
│  is not yet available.                                          │
│  Metrics were collected successfully, but there's no reference  │
│  baseline to compare against.                                   │
│                                                                 │
│  **Collected Metrics** (5):                                     │
│  - coverage: 82.5%                                              │
│  - bundle-size: 256 KB                                          │
│  - loc: 1,234                                                   │
│  - test-count: 47                                               │
│  - complexity: 12                                               │
│                                                                 │
│  _...and 3 more metrics_                                        │
│                                                                 │
│  Once the main branch has metrics data, future PRs will be      │
│  evaluated against that baseline.                               │
└─────────────────────────────────────────────────────────────────┘
```

**Visibility**: Shown when:
- No metrics exist in baseline database, OR
- None of the collected metrics have baseline values

**Content**:
- Clear explanation of the situation
- List of first 5 collected metrics with values
- Truncation message if more than 5 metrics
- Guidance on next steps

---

### 3.3 Evaluated Metrics Table

```
┌─────────────────────────────────────────────────────────────────┐
│  | Metric            | Base     | PR       | Δ      |           │
│  |-------------------|----------|----------|--------|           │
│  | ✅ coverage       | 80.0%    | 85.0%    | +5.0%  |           │
│  | ❌ bundle-size    | 256 KB   | 280 KB   | +24 KB |           │
│  | ✅ test-count     | 47       | 52       | +5     |           │
│                                                                 │
│  _...and 10 more evaluated metrics_                             │
│                                                                 │
│  ✅ **15 passed** • ❌ **2 failed**                             │
└─────────────────────────────────────────────────────────────────┘
```

**Visibility**: Shown when at least one metric has a configured threshold.

**Table Columns**:

| Column | Description | Format |
|--------|-------------|--------|
| Metric | Status icon + metric name/key | `✅ name` or `❌ name` or `⚠️ name` |
| Base | Value from reference branch | Formatted with unit (or "N/A") |
| PR | Current PR value | Formatted with unit (or "N/A") |
| Δ | Delta (change from baseline) | Signed value, `-` for zero, or "N/A" |

**Inline Status Icons** (prefixed to metric name):

| Status | Display |
|--------|---------|
| Pass | `✅ metric-name` |
| Fail | `❌ metric-name` |
| Unknown | `⚠️ metric-name` |

**Row Limit**:
- Maximum rows shown: configurable via `max-pr-comment-metrics` (default: 30)
- If exceeded: Shows truncation message "_...and X more evaluated metrics_"

**Summary Line**:
- Shows count of passed and failed metrics
- Icons only appear if count > 0

---

### 3.4 Other Tracked Metrics (Collapsible)

```
┌─────────────────────────────────────────────────────────────────┐
│  <details>                                                      │
│  <summary>Other tracked metrics (no thresholds configured)</summary>
│                                                                 │
│  | Metric     | Base     | PR       | Δ      |                  │
│  |------------|----------|----------|--------|                  │
│  | loc        | 1,234    | 1,300    | +66    |                  │
│  | complexity | 45       | 48       | +3     |                  │
│  | comments   | 120      | 120      | -      |                  │
│                                                                 │
│  </details>                                                     │
└─────────────────────────────────────────────────────────────────┘
```

**Visibility**: Shown when there are metrics without configured thresholds.

**Behavior**:
- Collapsed by default (uses `<details>` element)
- Click to expand and view all tracked metrics

**Table Columns**:
- Same as Evaluated Metrics table (Metric, Base, PR, Δ)
- No inline status icon (these metrics have no thresholds to evaluate)
- Provides informational view of metric changes

**Purpose**: Keep the main comment concise while still showing all collected data for reference.

---

### 3.5 Footer (Collapsible Info)

```
┌─────────────────────────────────────────────────────────────────┐
│  ---                                                            │
│  <details>                                                      │
│  <summary>About this check</summary>                            │
│                                                                 │
│  **Mode**: soft • **Reference**: main                           │
│                                                                 │
│  Powered by [Unentropy](https://unentropy.dev) │
│  </details>                                                     │
└─────────────────────────────────────────────────────────────────┘
```

**Elements**:
- Horizontal rule separator
- Collapsible details section
- **Mode and reference branch** (moved from header for cleaner layout)
- Tool attribution with link

---

## 4. Value Formatting

### Unit-Based Formatting

Values are formatted based on their unit type for readability:

| Unit Type | Example Values | Format |
|-----------|----------------|--------|
| `percent` | 80.0%, 99.5% | One decimal place with % suffix |
| `integer` | 1,234 | Thousands separators |
| `bytes` | 256 KB, 1.5 MB, 2 GB | Human-readable with appropriate unit |
| `duration` | 45s, 2m 30s, 1h 15m | Human-readable time format |
| `decimal` | 3.14 | Standard decimal representation |

### Delta Formatting

| Change | Format |
|--------|--------|
| Positive | `+5.0%`, `+256 KB`, `+100` |
| Negative | `-2.5%`, `-128 KB`, `-50` |
| Zero | `-` (dash indicating no change) |
| Missing | `N/A` |

---

## 5. Visual States

### Comment States Matrix

| Scenario | Header Status | Evaluated Table | Tracked Section |
|----------|---------------|-----------------|-----------------|
| All pass | ✅ PASS | Shown | Shown if metrics exist |
| Some fail (soft) | ❌ FAIL | Shown | Shown if metrics exist |
| Some fail (hard) | ❌ FAIL | Shown | Shown if metrics exist |
| No baseline | ⚠️ UNKNOWN | Hidden | Hidden |
| No thresholds | ⚠️ UNKNOWN | Hidden | Shown |
| Mode off | N/A | Hidden | Hidden |

### Edge Cases

| Scenario | Display |
|----------|---------|
| No GITHUB_TOKEN | No comment posted (warning logged) |
| Not in PR context | No comment posted (warning logged) |
| API error | No comment posted (warning logged, action continues) |
| Empty metrics | No Baseline message shown |
| Single metric | Normal table with one row |

---

## 6. Interaction Behaviors

### Comment Update Behavior

| Scenario | Action |
|----------|--------|
| First run on PR | Create new comment |
| Subsequent runs | Update existing comment in place |
| Marker not found | Create new comment |
| Multiple runs same commit | Update to latest results |

### Comment Identification

The action uses the comment marker to identify its canonical comment:
1. Lists all comments on the PR (up to 100)
2. Searches for comment body containing the marker string
3. If found: Updates that comment via `updateComment` API
4. If not found: Creates new comment via `createComment` API

---

## 7. Configuration Options

| Input | Default | Effect on Comment |
|-------|---------|-------------------|
| `enable-pr-comment` | `true` | Set to `false` to disable commenting |
| `pr-comment-marker` | `<!-- unentropy-quality-gate -->` | Custom marker for comment identification |
| `max-pr-comment-metrics` | `30` | Max rows in evaluated metrics table |

---

## 8. Accessibility Considerations

### Screen Reader Support

- Header status badge uses both emoji and text (e.g., "PASS ✅" reads as "PASS checkmark")
- Tables use standard markdown table format
- Inline status icons prefix metric names (e.g., "✅ coverage")
- Collapsible sections use native `<details>` element
- Link to Unentropy has descriptive text

### Visual Accessibility

- Status is conveyed by icon at both header level and inline per metric
- High-contrast emoji choices (✅ green, ❌ red, ⚠️ yellow)
- Clear visual hierarchy with headers
- Compact table with shortened headers improves readability

---

## 9. Example Comments

### Example A: All Passing

```markdown
<!-- unentropy-quality-gate -->

## 🛡️ Quality Gate: **PASS** ✅

| Metric | Base | PR | Δ |
|--------|------|-----|---|
| ✅ coverage | 80.0% | 82.5% | +2.5% |
| ✅ bundle-size | 256 KB | 250 KB | -6 KB |
| ✅ test-count | 47 | 52 | +5 |

✅ **3 passed** • **0 failed**

<details>
<summary>Other tracked metrics (no thresholds configured)</summary>

| Metric | Base | PR | Δ |
|--------|------|-----|---|
| loc | 1,234 | 1,300 | +66 |
| complexity | 45 | 45 | - |

</details>

---
<details>
<summary>About this check</summary>

**Mode**: soft • **Reference**: main

Powered by [Unentropy](https://unentropy.dev)
</details>
```

### Example B: Failing Metrics

```markdown
<!-- unentropy-quality-gate -->

## 🛡️ Quality Gate: **FAIL** ❌

| Metric | Base | PR | Δ |
|--------|------|-----|---|
| ❌ coverage | 80.0% | 72.5% | -7.5% |
| ❌ bundle-size | 256 KB | 512 KB | +256 KB |
| ✅ test-count | 47 | 47 | - |

✅ **1 passed** • ❌ **2 failed**

---
<details>
<summary>About this check</summary>

**Mode**: hard • **Reference**: main

Powered by [Unentropy](https://unentropy.dev)
</details>
```

### Example C: No Baseline

```markdown
<!-- unentropy-quality-gate -->

## 🛡️ Quality Gate: **UNKNOWN** ⚠️

### No Baseline Data Available

This appears to be the first pull request, or baseline data is not yet available.
Metrics were collected successfully, but there's no reference baseline to compare against.

**Collected Metrics** (5):
- coverage: 82.5%
- bundle-size: 256 KB
- loc: 1,234
- test-count: 47
- complexity: 12

Once the main branch has metrics data, future PRs will be evaluated against that baseline.

---
<details>
<summary>About this check</summary>

**Mode**: soft • **Reference**: main

Powered by [Unentropy](https://unentropy.dev)
</details>
```
