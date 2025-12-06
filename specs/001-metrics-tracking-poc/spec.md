# Feature Specification: Metrics Tracking PoC

**Feature Branch**: `001-metrics-tracking-poc`  
**Created**: Thu Oct 16 2025  
**Status**: Implemented  
**Type**: Foundation (referenced by other specs)

## Overview

This specification establishes the foundational proof-of-concept for the Unentropy metrics tracking system. It defines the core capabilities that subsequent specs build upon: configuration management, metric persistence, and report generation.

**Note**: The original 3-action architecture (collect-metrics, generate-report, find-database) has been superseded by the unified `track-metrics` action defined in spec 003. This spec remains as the foundational reference for core platform contracts including configuration schema, database schema, storage architecture, and report generation.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Define Custom Metrics via Configuration (Priority: P1)

As an Unentropy user, I want to define what code metrics I want to track through a simple configuration file, so I can customize Unentropy to monitor metrics relevant to my project without modifying code.

**Why this priority**: This is the foundation of the system - without the ability to define custom metrics, the system cannot be used. This enables the core value proposition of flexible, user-defined metric tracking.

**Independent Test**: Can be fully tested by creating a configuration file with metric definitions and verifying the system correctly reads and validates the configuration, delivering immediate value by showing users how to customize their tracking setup.

**Acceptance Scenarios**:

1. **Given** I have a project using Unentropy, **When** I create an `unentropy.json` configuration file with metric definitions, **Then** the system reads and validates my configuration
2. **Given** I have defined metrics in my configuration, **When** I specify metric names, types, and labels, **Then** the system accepts valid configurations and rejects invalid ones with clear error messages
3. **Given** I want to track multiple metrics, **When** I add multiple metric definitions to the configuration file, **Then** the system supports tracking all defined metrics

---

### User Story 2 - Validate Configuration Locally (Priority: P1.5)

As an Unentropy user, I want to validate my unentropy.json configuration file locally before committing it, so I can catch configuration errors early and avoid CI pipeline failures.

**Why this priority**: Configuration validation is critical for user experience and prevents wasted CI cycles. This sits between defining metrics and collecting data, serving as a quality gate before pipeline execution.

**Independent Test**: Can be fully tested by running the CLI verify command against various configuration files (valid, invalid, malformed) and verifying appropriate success/error responses, delivering value by providing immediate feedback on configuration correctness.

**Acceptance Scenarios**:

1. **Given** I have created an unentropy.json configuration file, **When** I run `unentropy verify`, **Then** the system validates the configuration and reports success or specific error messages
2. **Given** I want to validate a configuration file in a different location, **When** I run `unentropy verify path/to/config.json`, **Then** the system validates the specified file
3. **Given** my configuration has syntax errors, **When** I run the verify command, **Then** the system exits with error code 1 and displays clear, actionable error messages
4. **Given** my configuration is valid, **When** I run the verify command, **Then** the system exits with success code 0 and displays a confirmation message

---

### User Story 3 - Persist Metrics Reliably (Priority: P2)

As an Unentropy user, I want my metrics stored reliably across CI runs, so I never lose historical data and can track trends over time.

**Why this priority**: Reliable persistence is essential for the core value proposition - tracking metrics over time. Without reliable storage, the entire system loses its purpose.

**Independent Test**: Can be fully tested by collecting metrics across multiple CI runs and verifying that all historical data remains accessible and queryable for report generation.

**Acceptance Scenarios**:

1. **Given** I have metrics defined in my configuration, **When** the CI pipeline runs and collects metrics, **Then** the system stores all metric values with timestamps and build metadata
2. **Given** multiple pipeline runs have occurred, **When** metrics are collected, **Then** each run's data is stored independently with proper chronological ordering
3. **Given** the database schema needs to evolve, **When** a new version is deployed, **Then** existing data is preserved and migrated safely
4. **Given** I want to query historical data, **When** I generate a report, **Then** all previously collected metrics are available

---

### User Story 4 - View Metric Trends in HTML Reports (Priority: P3)

As an Unentropy user, I want to view my metrics over time in a simple HTML report, so I can identify trends and make data-driven decisions about code quality without complex tooling.

**Why this priority**: Visualization is the final piece that delivers insights, but requires both configuration and data collection to be working first. This is the user-facing output that justifies the system's existence.

**Independent Test**: Can be fully tested by generating an HTML report from **fixture data** (predefined unentropy.json configurations with dummy SQLite databases), verifying charts and trends display correctly through **manual visual review** against acceptance criteria, delivering value by providing actionable insights from collected data.

**Acceptance Scenarios**:

1. **Given** I have collected metric data over multiple builds, **When** I generate an HTML report, **Then** the system creates a report showing metrics trends over time with visual charts
2. **Given** I have multiple metrics configured, **When** viewing the report, **Then** each metric is displayed in its own section with appropriate visualizations
3. **Given** I want to share results with my team, **When** the report is generated, **Then** it is a self-contained HTML file that can be viewed in any browser without external dependencies
4. **Given** I have sparse data (few data points), **When** generating the report, **Then** the system still produces a valid report with available data and indicates where more data would improve insights
5. **Given** I view the report on different devices, **When** the report is opened on mobile, tablet, or desktop, **Then** the layout adapts appropriately and remains readable
6. **Given** I hover over data points on a chart, **When** interacting with the visualization, **Then** I see tooltips with exact values, timestamps, and relevant context

---

### Edge Cases

- What happens when the configuration file is missing or malformed?
- What happens when running verify command on a non-existent configuration file?
- What happens when running verify command on a file with invalid JSON syntax?
- What happens when running verify command without any arguments (default behavior)?
- What happens when configuration file has permission issues preventing reading?
- What happens when metric collection fails for some but not all metrics?
- What happens when the database file doesn't exist yet (first run)?
- What happens when generating a report with no collected data?
- What happens when the database file is corrupted or locked?
- What happens when attempting to collect metrics with invalid configuration?
- What happens when running multiple pipeline jobs concurrently that write to the same database?
- What happens when viewing the report on a mobile device with small screen?
- What happens when CDN resources (Tailwind CSS, Chart.js) fail to load?
- What happens when metric names contain special characters or XSS payloads?
- What happens when viewing the report in print mode or exporting to PDF?

## Requirements *(mandatory)*

### Functional Requirements

#### Configuration Management

- **FR-001**: System MUST read metric definitions from a configuration file named `unentropy.json` in the project root
- **FR-002**: System MUST support defining custom metrics with user-specified names
- **FR-003**: System MUST support metric types including numeric values and categorical labels
- **FR-004**: System MUST validate configuration file structure and provide clear error messages for invalid configurations
- **FR-004.1**: System MUST provide a CLI command `unentropy verify [config]` to validate configuration files
- **FR-004.2**: Verify command MUST accept optional config file path, defaulting to `unentropy.json`
- **FR-004.3**: Verify command MUST exit with code 0 for valid configurations and code 1 for invalid ones
- **FR-004.4**: Verify command MUST provide specific, actionable error messages for different validation failure types
- **FR-005**: Configuration MUST allow users to define multiple metrics in a single file

#### Data Persistence

- **FR-006**: System MUST store collected metrics with timestamps indicating when they were captured
- **FR-007**: System MUST associate collected metrics with commit SHA and build metadata
- **FR-008**: System MUST store metric data in a SQLite database file
- **FR-009**: System MUST handle partial failures gracefully (continue collecting other metrics if one fails)
- **FR-010**: System MUST persist data across multiple pipeline runs without data loss
- **FR-011**: System MUST support concurrent pipeline executions without database corruption

#### Report Generation

- **FR-012**: System MUST generate HTML reports displaying metric trends over time
- **FR-013**: System MUST create visual charts showing how metrics change across builds
- **FR-014**: Generated reports MUST be self-contained single-file HTML documents
- **FR-015**: Reports MUST display each configured metric in a separate section
- **FR-016**: System MUST generate valid reports even with limited data (minimum 1 data point)
- **FR-017**: Charts MUST clearly indicate time progression and metric values
- **FR-018**: Reports MUST be responsive and render correctly on mobile, tablet, and desktop screens
- **FR-019**: Reports MUST include summary statistics (min, max, average, trend direction) for each metric
- **FR-020**: Charts MUST include interactive tooltips showing exact values and timestamps
- **FR-021**: Reports MUST be accessible (WCAG 2.1 AA compliance for color contrast and semantic HTML)
- **FR-022**: Reports MUST handle missing/sparse data with clear visual indicators and informative messages
- **FR-023**: Reports MUST use Tailwind CSS from CDN for styling (no custom CSS compilation required)
- **FR-024**: Reports MUST include metadata section showing repository name, generation timestamp, and data range

### Key Entities

- **Metric Definition**: Represents a user-defined metric to track, including name, type (numeric/categorical), description, and collection method reference
- **Metric Data Point**: Represents a single collected metric value, including metric identifier, value, timestamp, commit SHA, and build metadata
- **Build Context**: Represents the CI/CD execution context, including commit SHA, branch name, build number, and timestamp
- **Report**: Represents generated HTML output, including all metrics, time range, and visualization data

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can define custom metrics through configuration in under 5 minutes without reading detailed documentation
- **SC-002**: Metric collection completes within standard CI pipeline execution time (adds less than 30 seconds overhead)
- **SC-003**: Reports generate from 100 data points in under 10 seconds
- **SC-004**: System handles 50+ concurrent pipeline executions without data corruption or loss
- **SC-005**: 95% of users successfully generate their first report within 15 minutes of initial setup
- **SC-006**: Generated reports are viewable in all major browsers without requiring internet connectivity (after initial CDN resource load)
- **SC-007**: Configuration errors are resolved within 3 attempts due to clear, actionable error messages
- **SC-007.1**: CLI verify command completes validation in under 2 seconds for typical configuration files
- **SC-007.2**: 95% of users successfully validate their configuration on first attempt using the verify command
- **SC-008**: Reports render correctly on screens from 320px (mobile) to 2560px (desktop) width
- **SC-009**: Chart interactions (tooltips, hover states) respond within 100ms on standard hardware

## Assumptions *(mandatory)*

- Projects using Unentropy already have GitHub Actions configured for CI/CD
- Users have basic familiarity with JSON configuration file format
- SQLite database file is stored in a persistent storage location accessible across pipeline runs
- GitHub Actions environment has write permissions to the database location
- Report generation occurs after data collection, either as part of the same pipeline or a separate scheduled job
- Metric collection scripts/commands are provided by the user and referenced in configuration (system invokes them but doesn't define them)
- All pipeline runs occur on a single repository (no multi-repository aggregation in PoC)

## Dependencies *(mandatory)*

- GitHub Actions infrastructure for workflow execution
- Bun runtime for both local development and GitHub Actions
- SQLite support via `bun:sqlite` (native to Bun runtime)
- Yargs v18.x for command-line argument parsing and help generation
- @types/yargs for TypeScript support in CLI development
- Chart.js v4.x via CDN (jsDelivr) for interactive visualizations
- Tailwind CSS v3.x via CDN for responsive styling
- Modern browser support (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Project must use GitHub for version control and CI/CD

## Scope Boundaries *(mandatory)*

### In Scope (PoC)

- Configuration file parsing and validation
- CLI verification command for local configuration validation
- Command-line interface with yargs for argument parsing
- Local file system access for configuration file reading
- SQLite database creation and metric storage (local file system)
- Storage provider pattern architecture (extensible: sqlite-local, sqlite-s3, postgres)
- SQLite local storage provider implementation (file-based SQLite)
- Basic HTML report generation with time-series charts
- Single repository tracking
- Commit-level granularity for metrics

### Out of Scope (Future Specs)

- GitHub Actions integration (see spec 003 for unified track-metrics action)
- Remote storage backends (sqlite-s3 for S3 - see spec 003)
- Quality gate evaluation and PR comments (see spec 004)
- Built-in metric collectors (see spec 005)
- Advanced report customization (see spec 006)
- Multi-repository metric aggregation
- Advanced analytics (anomaly detection, trend forecasting)
- Real-time metric streaming
- Metric alerting and notifications
- Custom visualization plugins

## Foundational Contracts

This spec establishes contracts that are referenced by subsequent specs:

| Contract | Location | Referenced By |
|----------|----------|---------------|
| Configuration Schema | `contracts/config-schema.md` | All specs |
| Database Schema | `contracts/database-schema.md` | 003, 004, 005, 006 |
| Storage Provider Interface | `contracts/storage-provider-interface.md` | 003 |
| HTML Report Template | `contracts/html-report-template.md` | 006 |
| Visual Acceptance Criteria | `contracts/visual-acceptance-criteria.md` | 006 |
