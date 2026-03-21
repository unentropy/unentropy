## Context

This is the migration of the 001-metrics-tracking-poc feature from SpecKit to OpenSpec format. The feature establishes the foundational proof-of-concept for the Unentropy metrics tracking system, defining core capabilities for configuration management, metric persistence, and report generation.

The original SpecKit structure contained:

- spec.md (feature specification)
- contracts/ (technical specifications)
- research.md, plan.md, tasks.md, quickstart.md (supporting documentation)
- checklists/ (verification checklists)

## Goals / Non-Goals

**Goals:**

- Migrate all content from SpecKit 001-metrics-tracking-poc to OpenSpec structure
- Preserve all existing functionality and documentation
- Organize content according to OpenSpec principles
- Maintain traceability between original and migrated content
- Enable OpenSpec workflow for future development

**Non-Goals:**

- Modify existing functionality or requirements
- Remove or deprecate any existing features
- Change the technical architecture or implementation
- Update business logic or user-facing behavior

## Decisions

### Content Organization Decision

**Chosen Approach:** Migrate contracts to design.md as technical specifications, preserve spec.md as requirements, and distribute supporting files appropriately.

**Rationale:**

- The contracts directory contains technical specifications (config schema, database schema, etc.) that belong in OpenSpec design.md
- The spec.md contains user stories, requirements, and success criteria that belong in OpenSpec spec.md
- Supporting documentation (research, plan, tasks) will be evaluated for relevance to proposal, design, or tasks artifacts

**Alternatives Considered:**

1. Keeping all contracts as separate files in openspec/specs/001-metrics-tracking-poc/contracts/ - Rejected because OpenSpec encourages consolidating technical specifications in design.md
2. Moving all content to tasks.md - Rejected because tasks.md should contain implementation steps, not specifications
3. Distributing contracts across proposal, design, and tasks - Rejected because it would fragment related technical specifications

### File Migration Decision

**Chosen Approach:**

- spec.md → openspec/specs/001-metrics-tracking-poc/spec.md (requirements)
- contracts/\* → openspec/changes/metrics-tracking-poc/design.md (technical design)
- research.md, plan.md → openspec/changes/metrics-tracking-poc/proposal.md (background/context)
- tasks.md → openspec/changes/metrics-tracking-poc/tasks.md (implementation steps)
- quickstart.md → openspec/changes/metrics-tracking-poc/design.md (implementation guidance)
- checklists/ → openspec/changes/metrics-tracking-poc/tasks.md (verification steps)

**Rationale:** This follows OpenSpec principles where proposal covers "why", design covers "how", and tasks cover implementation steps.

**Alternatives Considered:**

1. Putting all supporting files in proposal - Rejected because it would overload the proposal with implementation details
2. Creating separate directories for each supporting file type - Rejected because it adds unnecessary complexity
3. Leaving supporting files in original location - Rejected because it doesn't complete the migration

## Risks / Trade-offs

[Risk] Loss of document traceability during migration → Mitigation: Maintain clear mapping between original and migrated files in documentation
[Risk] Inconsistent organization making content harder to find → Mitigation: Follow OpenSpec conventions strictly and document the organization scheme
[Risk] Missing content during migration → Mitigation: Verify all original files are accounted for in the migrated structure
[Risk] Confusion between SpecKit and OpenSpec structures during transition → Mitigation: Clear documentation of migration completion and removal timeline for SpecKit files

## Migration Plan

1. Create proposal.md with problem statement and changes description
2. Create design.md with technical specifications from contracts and supporting documentation
3. Create tasks.md with implementation steps from original tasks.md and checklists
4. Verify all content is preserved and properly organized
5. Update documentation generation to use OpenSpec structure
6. Prepare for cleanup of SpecKit-specific files (to be done after verification)

## Open Questions

None - this is a straightforward migration preserving existing content.

## Technical Specifications (Contracts)

### Configuration Schema Contract

This document defines the JSON schema for the `unentropy.json` configuration file. This contract ensures backward compatibility and provides validation rules for user configurations.

#### Schema Definition

##### Root Configuration Object

```typescript
interface UnentropyConfig {
  metrics: Record<string, MetricConfig>;
}
```

##### MetricConfig

Defines a single metric to be tracked. The object key serves as the unique metric identifier.

```typescript
interface MetricConfig {
  name?: string;
  type: "numeric" | "label";
  description?: string;
  command: string;
  unit?: string;
}
```

**Field Specifications**:

| Field         | Type   | Required | Constraints                                   | Description                                                                                             |
| ------------- | ------ | -------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| _(key)_       | string | Yes      | Pattern: `^[a-z0-9-]+$`<br>Length: 1-64 chars | Object key serves as the unique metric identifier. Used in database, reports, and threshold references. |
| `name`        | string | No       | Max 256 characters                            | Optional display name for reports and charts. Defaults to the object key if omitted.                    |
| `type`        | enum   | Yes      | Either `'numeric'` or `'label'`               | Determines how values are stored and visualized.                                                        |
| `description` | string | No       | Max 256 characters                            | Human-readable explanation shown in reports.                                                            |
| `command`     | string | Yes      | Non-empty<br>Max 1024 characters              | Shell command to execute for collecting this metric.                                                    |
| `unit`        | string | No       | Max 10 characters                             | Display unit for numeric metrics (e.g., '%', 'ms', 'KB').                                               |

**Validation Rules**:

- Object keys must be lowercase alphanumeric with hyphens only
- Object keys are inherently unique (JSON requirement)
- `type` affects how `command` output is parsed:
  - `numeric`: Output parsed as float (supports scientific notation)
  - `label`: Output taken as-is (trimmed string)
- `command` is executed in shell environment with build context variables
- `unit` is only meaningful for `numeric` type (ignored for `label`)

#### JSON Schema (for validators)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["metrics"],
  "properties": {
    "metrics": {
      "type": "object",
      "minProperties": 1,
      "maxProperties": 50,
      "propertyNames": {
        "pattern": "^[a-z0-9-]+$",
        "minLength": 1,
        "maxLength": 64
      },
      "additionalProperties": {
        "type": "object",
        "required": ["type", "command"],
        "properties": {
          "name": {
            "type": "string",
            "maxLength": 256
          },
          "type": {
            "type": "string",
            "enum": ["numeric", "label"]
          },
          "description": {
            "type": "string",
            "maxLength": 256
          },
          "command": {
            "type": "string",
            "minLength": 1,
            "maxLength": 1024
          },
          "unit": {
            "type": "string",
            "maxLength": 10
          }
        }
      }
    }
  }
}
```

#### Example Configurations

##### Minimal Configuration

```json
{
  "metrics": {
    "test-coverage": {
      "type": "numeric",
      "command": "npm run test:coverage -- --json | jq -r '.total.lines.pct'"
    }
  }
}
```

##### Complete Configuration

```json
{
  "metrics": {
    "test-coverage": {
      "name": "Test Coverage",
      "type": "numeric",
      "description": "Percentage of code covered by tests",
      "command": "npm run test:coverage -- --json | jq -r '.total.lines.pct'",
      "unit": "%"
    },
    "size": {
      "name": "Bundle Size",
      "type": "numeric",
      "description": "Production bundle size in kilobytes",
      "command": "du -k dist/bundle.js | cut -f1",
      "unit": "KB"
    },
    "build-status": {
      "name": "Build Status",
      "type": "label",
      "description": "Overall build health status",
      "command": "npm run build && echo 'healthy' || echo 'failing'"
    }
  }
}
```

##### Multiple Projects Example

```json
{
  "metrics": {
    "api-test-coverage": {
      "type": "numeric",
      "command": "cd api && npm run test:coverage -- --json | jq -r '.total.lines.pct'",
      "unit": "%"
    },
    "frontend-size": {
      "type": "numeric",
      "command": "du -k frontend/dist/main.js | cut -f1",
      "unit": "KB"
    },
    "e2e-pass-rate": {
      "type": "numeric",
      "command": "npm run test:e2e -- --json | jq -r '(.numPassedTests / .numTotalTests * 100)'",
      "unit": "%"
    }
  }
}
```

#### Command Execution Context

When metrics commands are executed, the following environment variables are available:

| Variable                | Type   | Description                | Example           |
| ----------------------- | ------ | -------------------------- | ----------------- |
| `UNENTROPY_COMMIT_SHA`  | string | Current git commit SHA     | `a3f5c2b...`      |
| `UNENTROPY_BRANCH`      | string | Current git branch         | `main`            |
| `UNENTROPY_RUN_ID`      | string | GitHub Actions run ID      | `1234567890`      |
| `UNENTROPY_RUN_NUMBER`  | string | GitHub Actions run number  | `42`              |
| `UNENTROPY_ACTOR`       | string | User/bot who triggered run | `dependabot[bot]` |
| `UNENTROPY_METRIC_KEY`  | string | Key of current metric      | `test-coverage`   |
| `UNENTROPY_METRIC_TYPE` | string | Type of current metric     | `numeric`         |

**Command Execution Rules**:

- Commands run in repository root directory
- Standard shell environment (`/bin/sh` on Linux/macOS)
- 60-second timeout per command
- Exit code ignored (only stdout/stderr used)
- Stdout is captured and parsed based on metric type
- Stderr is logged but doesn't fail the metric

#### Validation Error Messages

The system provides clear error messages for common mistakes:

**Invalid metric key**:

```
Error: Invalid metric key "Test-Coverage"
Keys must be lowercase with hyphens only (pattern: ^[a-z0-9-]+$)
Example: test-coverage
```

**Invalid metric type**:

```
Error in metric "coverage": type must be either 'numeric' or 'label'
Found: 'percentage'
```

**Empty command**:

```
Error in metric "test-coverage": command cannot be empty
Provide a shell command that outputs the metric value
```

**Missing required fields**:

```
Error in metric "test-coverage": missing required fields
Required: type, command
Found: type
```

#### Versioning

**Version 2.0.0**:

- Changed `metrics` from array to object (key-based)
- Removed `name` as required field (key serves as identifier)
- Added optional `name` field for display purposes

**Future Versions**:

- New optional fields may be added without breaking existing configs
- Required fields will never be removed
- Type changes will be avoided (new fields added instead)

### Database Schema Contract

This document defines the database schema for storing metrics data.

#### Schema Definition

```sql
-- Tables for metrics tracking system
CREATE TABLE metric_definitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  name TEXT,
  type TEXT NOT NULL CHECK (type IN ('numeric', 'label')),
  description TEXT,
  unit TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE build_contexts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  commit_sha TEXT NOT NULL,
  branch TEXT NOT NULL,
  run_id TEXT NOT NULL,
  run_number TEXT NOT NULL,
  actor TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(commit_sha, run_id)
);

CREATE TABLE metric_values (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  build_context_id INTEGER NOT NULL,
  metric_definition_id INTEGER NOT NULL,
  value TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (build_context_id) REFERENCES build_contexts(id),
  FOREIGN KEY (metric_definition_id) REFERENCES metric_definitions(id)
);

CREATE TABLE schema_version (
  version INTEGER NOT NULL,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_metric_values_build_context ON metric_values(build_context_id);
CREATE INDEX idx_metric_values_metric_definition ON metric_values(metric_definition_id);
CREATE INDEX idx_build_contexts_timestamp ON build_contexts(timestamp);
```

#### Initial Schema Version

```sql
INSERT INTO schema_version (version) VALUES (1);
```

#### Migration Scripts

Future schema migrations should be added as SQL scripts that update the schema_version table.

### Storage Provider Interface Contract

This document defines the interface for storage providers in the Unentropy metrics tracking system.

#### Interface Definition

```typescript
interface StorageProvider {
  /** Initialize the storage provider */
  initialize(): Promise<void>;

  /** Persist any changes to storage */
  persist(): Promise<void>;

  /** Clean up resources */
  cleanup(): Promise<void>;

  /** Check if the provider is initialized */
  isInitialized(): boolean;

  /** Get the provider configuration */
  getConfig(): StorageProviderConfig;
}

interface StorageProviderConfig {
  /** Type of storage provider */
  type: "sqlite-local" | "sqlite-s3" | "postgres";

  /** Path to SQLite database file (for sqlite-local) */
  path?: string;

  /** S3 bucket name (for sqlite-s3) */
  s3Bucket?: string;

  /** S3 key/path (for sqlite-s3) */
  s3Key?: string;

  /** Connection string (for postgres) */
  connectionString?: string;
}
```

#### Provider Responsibilities

1. **StorageProvider** manages database lifecycle and storage location (WHERE to store)
   - Handles initialization, persistence, and cleanup
   - Abstracts storage location details from the rest of the application

2. **DatabaseAdapter** abstracts database query execution (WHAT queries to run)
   - Provides query methods independent of storage location
   - SQLite adapter provides SQL-based operations

3. **MetricsRepository** exposes domain-specific operations (WHY - business logic)
   - Business operations: `recordBuild()`, `getMetricComparison()`, `getMetricHistory()`
   - Uses adapter internally
   - Clean API for application code

4. **Storage** orchestrates provider, adapter, and repository
   - Coordinates provider, adapter, and repository
   - Provides unified API to rest of application

### HTML Report Template Contract

This document defines the HTML template structure for metrics reports.

#### Template Structure

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Unentropy Metrics Report</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-gray-50 min-h-screen">
    <div class="container mx-auto px-4 py-8">
      <header class="mb-8">
        <h1 class="text-3xl font-bold text-gray-800">Unentropy Metrics Report</h1>
        <div class="mt-2 text-sm text-gray-600">
          Repository: <span id="repo-name"></span><br />
          Generated: <span id="generation-timestamp"></span><br />
          Data Range: <span id="data-range"></span>
        </div>
      </header>

      <main>
        <!-- Metrics sections will be inserted here -->
      </main>
    </div>
  </body>
</html>
```

#### Metric Section Template

Each metric gets its own section with the following structure:

```html
<section class="mb-12">
  <h2 class="text-2xl font-semibold text-gray-700 mb-4">Metric Name</h2>
  <p class="text-gray-600 mb-6">Metric description</p>

  <!-- Chart container -->
  <div class="bg-white rounded-lg shadow-md p-6">
    <canvas id="metric-chart"></canvas>
  </div>

  <!-- Summary statistics -->
  <div class="mt-6 grid grid-cols-2 gap-4 text-sm text-gray-600">
    <div>Min: <span id="min-value"></span></div>
    <div>Max: <span id="max-value"></span></div>
    <div>Average: <span id="avg-value"></span></div>
    <div>Trend: <span id="trend-direction"></span></div>
  </div>
</section>
```

#### Visualization Requirements

- Charts MUST use Chart.js v4.x via CDN
- Reports MUST use Tailwind CSS v3.x via CDN for styling
- Generated reports MUST be self-contained single-file HTML documents
- Charts MUST clearly indicate time progression and metric values
- Reports MUST be responsive and render correctly on mobile, tablet, and desktop screens
- Charts MUST include interactive tooltips showing exact values and timestamps

### Visual Acceptance Criteria Contract

This document defines the visual acceptance criteria for HTML reports.

#### Layout and Structure

1. **Report Header**
   - Repository name clearly displayed
   - Generation timestamp visible
   - Date range of data shown

2. **Metric Sections**
   - Each metric displayed in its own section
   - Section includes metric name and description
   - Visualization chart prominent in section
   - Summary statistics displayed below chart

3. **Responsive Design**
   - Layout adapts to screen width:
     - Mobile (< 640px): Single column layout
     - Tablet (640px-1024px): Two column layout
     - Desktop (> 1024px): Three column layout
   - Readable on all device sizes
   - Touch-friendly interactive elements

4. **Chart Interactions**
   - Tooltips show exact values on hover/tap
   - Tooltips include timestamp and build context
   - Smooth hover/transition animations
   - Accessible chart elements (ARIA labels where applicable)

#### Content Requirements

1. **Data Representation**
   - All collected data points visible in charts
   - Time progression clearly indicated (left to right = older to newer)
   - Numeric metrics shown with appropriate scale
   - Label metrics shown as categorical data

2. **Summary Statistics**
   - Minimum value displayed
   - Maximum value displayed
   - Average/mean value calculated and displayed
   - Trend direction (increasing/decreasing/stable) indicated

3. **Edge Cases**
   - Single data point: Chart still renders correctly
   - Sparse data: Chart shows available data with visual indicators
   - No data: Informative message displayed instead of empty chart
   - Large datasets: Chart remains readable and performant

#### Styling and Accessibility

1. **Color and Contrast**
   - Sufficient color contrast for text and UI elements (WCAG 2.1 AA)
   - Meaning conveyed through multiple methods (not color alone)
   - Focus indicators visible for keyboard navigation

2. **Typography**
   - Readable font sizes across devices
   - Clear hierarchy (h1 > h2 > p)
   - Consistent spacing and alignment

3. **Accessibility Features**
   - Semantic HTML elements used appropriately
   - Alternative text for non-decorative elements
   - Keyboard navigable interface
   - Screen reader friendly structure

#### Performance Requirements

1. **Load Time**
   - Report generates in under 10 seconds for 100 data points
   - Initial display renders quickly
   - Charts render smoothly after data loads

2. **Resource Usage**
   - Reasonable memory usage for dataset size
   - Efficient Chart.js configuration
   - Optimized DOM updates

#### Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Reports functional in all major browsers
- Graceful degradation for older browsers
