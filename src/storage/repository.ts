import type { DatabaseAdapter } from "./adapters/interface";
import type {
  BuildContext,
  InsertBuildContext,
  InsertMetricDefinition,
  InsertMetricValue,
  MetricDefinition,
  MetricValue,
} from "./types";

/**
 * MetricsRepository provides domain-specific operations (WHY - business logic).
 *
 * This layer exposes a clean API for application code without coupling to SQL
 * or database implementation details. It uses DatabaseAdapter internally to
 * execute queries.
 */
export class MetricsRepository {
  constructor(private adapter: DatabaseAdapter) {}

  async recordBuild(
    buildContext: InsertBuildContext,
    metrics: {
      definition: InsertMetricDefinition;
      value_numeric?: number;
      value_label?: string;
      collected_at: string;
      collection_duration_ms?: number;
    }[]
  ): Promise<number> {
    // Insert build context
    const buildId = this.adapter.insertBuildContext(buildContext);

    // Insert each metric definition and value
    for (const metric of metrics) {
      const metricDef = this.adapter.upsertMetricDefinition(metric.definition);

      const valueData: InsertMetricValue = {
        metric_id: metricDef.id,
        build_id: buildId,
        value_numeric: metric.value_numeric,
        value_label: metric.value_label,
        collected_at: metric.collected_at,
        collection_duration_ms: metric.collection_duration_ms,
      };

      this.adapter.insertMetricValue(valueData);
    }

    return buildId;
  }

  getAllMetricDefinitions(): MetricDefinition[] {
    return this.adapter.getAllMetricDefinitions();
  }

  getAllBuildContexts(options?: { onlyWithMetrics?: boolean }): BuildContext[] {
    return this.adapter.getAllBuildContexts(options);
  }

  getAllMetricValues(): (MetricValue & { metric_name: string })[] {
    return this.adapter.getAllMetricValues();
  }

  getMetricDefinition(name: string): MetricDefinition | undefined {
    return this.adapter.getMetricDefinition(name);
  }

  getMetricValuesByBuildId(buildId: number): (MetricValue & { metric_name: string })[] {
    return this.adapter.getMetricValuesByBuildId(buildId);
  }

  getMetricTimeSeries(metricName: string): (MetricValue & {
    metric_name: string;
    commit_sha: string;
    branch: string;
    run_number: number;
    build_timestamp: string;
  })[] {
    return this.adapter.getMetricTimeSeries(metricName);
  }

  getBaselineMetricValues(
    metricName: string,
    referenceBranch: string,
    maxBuilds?: number,
    maxAgeDays?: number
  ): { value_numeric: number }[] {
    return this.adapter.getBaselineMetricValues(metricName, referenceBranch, maxBuilds, maxAgeDays);
  }
}
