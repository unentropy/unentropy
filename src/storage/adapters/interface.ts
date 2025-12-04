import type {
  BuildContext,
  InsertBuildContext,
  InsertMetricDefinition,
  InsertMetricValue,
  MetricDefinition,
  MetricValue,
} from "../types";

/**
 * DatabaseAdapter abstracts database query execution (WHAT queries to run).
 *
 * Implementations provide database-specific SQL queries while maintaining
 * a consistent interface. This enables future support for different database
 * engines (e.g., PostgreSQL) without changing business logic.
 */
export interface DatabaseAdapter {
  // Write operations
  insertBuildContext(data: InsertBuildContext): number;
  upsertMetricDefinition(data: InsertMetricDefinition): MetricDefinition;
  insertMetricValue(data: InsertMetricValue): number;

  // Read operations - single record
  getBuildContext(id: number): BuildContext | undefined;
  getMetricDefinition(name: string): MetricDefinition | undefined;
  getMetricValues(metricId: number, buildId: number): MetricValue | undefined;

  // Read operations - collections
  getMetricValuesByBuildId(buildId: number): (MetricValue & { metric_name: string })[];
  getAllMetricDefinitions(): MetricDefinition[];
  getAllMetricValues(): (MetricValue & { metric_name: string })[];
  getAllBuildContexts(options?: { onlyWithMetrics?: boolean }): BuildContext[];

  // Time series queries
  getMetricTimeSeries(metricName: string): (MetricValue & {
    metric_name: string;
    commit_sha: string;
    branch: string;
    run_number: number;
    build_timestamp: string;
  })[];

  // Quality gate queries
  getBaselineMetricValue(
    metricName: string,
    referenceBranch: string,
    maxAgeDays?: number
  ): number | undefined;

  getPullRequestMetricValue(
    metricName: string,
    pullRequestBuildId: number
  ): { value_numeric: number } | undefined;
}
