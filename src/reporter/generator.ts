import type { Storage } from "../storage/storage";
import { buildLineChartData, buildBarChartData } from "./charts";
import render from "preact-render-to-string";
import { h } from "preact";
import { HtmlDocument } from "./templates/default/components";
import type {
  TimeSeriesData,
  TimeSeriesDataPoint,
  NormalizedDataPoint,
  SummaryStats,
  ReportMetadata,
  MetricReportData,
  ReportData,
  GenerateReportOptions,
  ChartsData,
  LineChartData,
  BarChartData,
  MetadataPoint,
} from "./types";
import type { BuildContext } from "../storage/types";

export function getMetricTimeSeries(db: Storage, metricName: string): TimeSeriesData {
  const repository = db.getRepository();
  const metricDef = repository.getMetricDefinition(metricName);
  if (!metricDef) {
    throw new Error(`Metric '${metricName}' not found`);
  }

  const rows = repository.getMetricTimeSeries(metricName);

  const dataPoints: TimeSeriesDataPoint[] = rows.map((row) => ({
    timestamp: row.build_timestamp,
    valueNumeric: row.value_numeric,
    valueLabel: row.value_label,
    commitSha: row.commit_sha,
    branch: row.branch,
    runNumber: row.run_number,
  }));

  return {
    metricName: metricDef.name,
    metricType: metricDef.type,
    unit: metricDef.unit,
    description: metricDef.description,
    dataPoints,
  };
}

export function calculateSummaryStats(data: TimeSeriesData): SummaryStats {
  if (data.metricType !== "numeric" || data.dataPoints.length === 0) {
    return {
      latest: null,
      min: null,
      max: null,
      average: null,
      trendDirection: null,
      trendPercent: null,
    };
  }

  const numericValues = data.dataPoints
    .map((dp) => dp.valueNumeric)
    .filter((v): v is number => v !== null);

  if (numericValues.length === 0) {
    return {
      latest: null,
      min: null,
      max: null,
      average: null,
      trendDirection: null,
      trendPercent: null,
    };
  }

  const latest = numericValues[numericValues.length - 1] ?? null;
  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);
  const average = numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length;

  let trendDirection: "up" | "down" | "stable" | null = null;
  let trendPercent: number | null = null;

  if (numericValues.length >= 2) {
    const first = numericValues[0];
    const last = numericValues[numericValues.length - 1];
    if (first === undefined || last === undefined) {
      return {
        latest,
        min,
        max,
        average,
        trendDirection: null,
        trendPercent: null,
      };
    }
    const change = last - first;
    const percentChange = first !== 0 ? (change / Math.abs(first)) * 100 : 0;

    if (Math.abs(percentChange) < 0.01) {
      trendDirection = "stable";
    } else if (change > 0) {
      trendDirection = "up";
    } else {
      trendDirection = "down";
    }

    trendPercent = percentChange;
  }

  return {
    latest,
    min,
    max,
    average,
    trendDirection,
    trendPercent,
  };
}

export function normalizeMetricToBuilds(
  allBuilds: BuildContext[],
  timeSeries: TimeSeriesData
): NormalizedDataPoint[] {
  const dataPointMap = new Map<string, TimeSeriesDataPoint>();
  for (const dp of timeSeries.dataPoints) {
    dataPointMap.set(dp.timestamp, dp);
  }

  return allBuilds.map((build) => {
    const dp = dataPointMap.get(build.timestamp);
    if (dp) {
      return {
        timestamp: build.timestamp,
        value: dp.valueNumeric,
        commitSha: dp.commitSha,
        runNumber: dp.runNumber,
      };
    }
    return {
      timestamp: build.timestamp,
      value: null,
      commitSha: build.commit_sha,
      runNumber: build.run_number,
    };
  });
}

function getReportMetadata(db: Storage, repository: string): ReportMetadata {
  const allBuilds = db.getRepository().getAllBuildContexts({ onlyWithMetrics: true });

  if (allBuilds.length === 0) {
    const now = new Date().toISOString();
    return {
      repository,
      generatedAt: now,
      buildCount: 0,
      dateRange: {
        start: now,
        end: now,
      },
    };
  }

  const timestamps = allBuilds.map((b: { timestamp: string }) => b.timestamp).sort();
  const start = timestamps[0];
  const end = timestamps[timestamps.length - 1];

  if (!start || !end) {
    const now = new Date().toISOString();
    return {
      repository,
      generatedAt: now,
      buildCount: allBuilds.length,
      dateRange: {
        start: now,
        end: now,
      },
    };
  }

  return {
    repository,
    generatedAt: new Date().toISOString(),
    buildCount: allBuilds.length,
    dateRange: {
      start,
      end,
    },
  };
}

export function generateReport(db: Storage, options: GenerateReportOptions = {}): string {
  const repository = options.repository || "unknown/repository";

  const allMetrics = db.getRepository().getAllMetricDefinitions();
  const allBuilds = db.getRepository().getAllBuildContexts({ onlyWithMetrics: true });

  // If config is provided, only show metrics that are configured
  let metricNames: string[];
  if (options.config) {
    const configuredMetricNames = Object.keys(options.config.metrics);
    if (options.metricNames) {
      // Filter both by config and explicit metricNames
      metricNames = options.metricNames.filter((name) => configuredMetricNames.includes(name));
    } else {
      // Use only configured metrics
      metricNames = configuredMetricNames;
    }
  } else {
    // No config provided, use all metrics (backward compatibility)
    metricNames = options.metricNames || allMetrics.map((m) => m.name);
  }

  const metrics: MetricReportData[] = [];
  const lineCharts: LineChartData[] = [];
  const barCharts: BarChartData[] = [];

  // Extract shared timeline and metadata from all builds (once)
  const timeline = allBuilds.map((b) => b.timestamp);
  const sharedMetadata: (MetadataPoint | null)[] = allBuilds.map((b) => ({
    sha: b.commit_sha.substring(0, 7),
    run: b.run_number,
  }));

  for (const metricName of metricNames) {
    try {
      const timeSeries = getMetricTimeSeries(db, metricName);
      const stats = calculateSummaryStats(timeSeries);
      const metricId = metricName.replace(/[^a-zA-Z0-9-]/g, "-");

      // Build semantic chart data
      if (timeSeries.metricType === "numeric") {
        const normalizedData = normalizeMetricToBuilds(allBuilds, timeSeries);
        lineCharts.push(
          buildLineChartData(metricId, timeSeries.metricName, timeSeries.unit, normalizedData)
        );
      } else {
        barCharts.push(buildBarChartData(metricId, timeSeries.metricName, timeSeries));
      }

      // Sparse is based on actual data points, not normalized length
      const sparse = timeSeries.dataPoints.length < 10;

      metrics.push({
        id: metricId,
        name: timeSeries.metricName,
        description: timeSeries.description,
        unit: timeSeries.unit,
        stats,
        chartType: timeSeries.metricType === "numeric" ? "line" : "bar",
        sparse,
        dataPointCount: timeSeries.dataPoints.length,
      });
    } catch (error) {
      console.warn(`Failed to generate report for metric '${metricName}':`, error);
    }
  }

  const metadata = getReportMetadata(db, repository);

  const chartsData: ChartsData = {
    timeline,
    metadata: sharedMetadata,
    lineCharts,
    barCharts,
  };

  const reportData: ReportData = {
    metadata,
    metrics,
  };

  const jsx = h(HtmlDocument, { data: reportData, chartsData });
  return "<!DOCTYPE html>" + render(jsx);
}
