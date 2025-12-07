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
    }[]
  ): Promise<number> {
    const buildId = this.adapter.insertBuildContext(buildContext);

    for (const metric of metrics) {
      const metricDef = this.adapter.upsertMetricDefinition(metric.definition);

      const valueData: InsertMetricValue = {
        metric_id: metricDef.id,
        build_id: buildId,
        value_numeric: metric.value_numeric,
        value_label: metric.value_label,
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

  getBaselineMetricValue(
    metricName: string,
    referenceBranch: string,
    maxAgeDays?: number
  ): number | undefined {
    return this.adapter.getBaselineMetricValue(metricName, referenceBranch, maxAgeDays);
  }
}
