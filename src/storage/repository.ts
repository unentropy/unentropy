import { eq, and, desc, asc, sql, isNotNull, gte, exists } from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";
import type {
  BuildContext,
  InsertBuildContext,
  InsertMetricDefinition,
  MetricValue,
} from "./types";

export class MetricsRepository {
  constructor(private db: BunSQLiteDatabase<typeof schema>) {}

  async recordBuild(
    buildContext: InsertBuildContext,
    metrics: {
      definition: InsertMetricDefinition;
      value_numeric?: number;
      value_label?: string;
    }[]
  ): Promise<number> {
    const result = this.db
      .insert(schema.buildContexts)
      .values({
        commitSha: buildContext.commit_sha,
        branch: buildContext.branch,
        runId: buildContext.run_id,
        runNumber: buildContext.run_number,
        eventName: buildContext.event_name ?? null,
        timestamp: buildContext.timestamp,
      })
      .returning({ id: schema.buildContexts.id })
      .get();

    if (!result) throw new Error("Failed to insert build context");
    const buildId = result.id;

    for (const metric of metrics) {
      this.db
        .insert(schema.metricDefinitions)
        .values({
          id: metric.definition.id,
          type: metric.definition.type,
          unit: metric.definition.unit ?? null,
          description: metric.definition.description ?? null,
        })
        .onConflictDoUpdate({
          target: schema.metricDefinitions.id,
          set: {
            unit: sql`COALESCE(excluded.unit, ${schema.metricDefinitions.unit})`,
            description: sql`COALESCE(excluded.description, ${schema.metricDefinitions.description})`,
          },
        })
        .run();

      this.db
        .insert(schema.metricValues)
        .values({
          metricId: metric.definition.id,
          buildId: buildId,
          valueNumeric: metric.value_numeric ?? null,
          valueLabel: metric.value_label ?? null,
        })
        .onConflictDoUpdate({
          target: [schema.metricValues.metricId, schema.metricValues.buildId],
          set: {
            valueNumeric: sql`excluded.value_numeric`,
            valueLabel: sql`excluded.value_label`,
          },
        })
        .run();
    }

    return buildId;
  }

  getAllBuildContexts(options?: { onlyWithMetrics?: boolean }): BuildContext[] {
    if (options?.onlyWithMetrics) {
      const results = this.db
        .select({
          id: schema.buildContexts.id,
          commit_sha: schema.buildContexts.commitSha,
          branch: schema.buildContexts.branch,
          run_id: schema.buildContexts.runId,
          run_number: schema.buildContexts.runNumber,
          event_name: schema.buildContexts.eventName,
          timestamp: schema.buildContexts.timestamp,
        })
        .from(schema.buildContexts)
        .where(
          and(
            eq(schema.buildContexts.eventName, "push"),
            exists(
              this.db
                .select({ x: sql`1` })
                .from(schema.metricValues)
                .where(eq(schema.metricValues.buildId, schema.buildContexts.id))
            )
          )
        )
        .orderBy(asc(schema.buildContexts.timestamp))
        .all();

      return results;
    }

    const results = this.db
      .select({
        id: schema.buildContexts.id,
        commit_sha: schema.buildContexts.commitSha,
        branch: schema.buildContexts.branch,
        run_id: schema.buildContexts.runId,
        run_number: schema.buildContexts.runNumber,
        event_name: schema.buildContexts.eventName,
        timestamp: schema.buildContexts.timestamp,
      })
      .from(schema.buildContexts)
      .orderBy(asc(schema.buildContexts.timestamp))
      .all();

    return results;
  }

  getMetricTimeSeries(metricName: string): (MetricValue & {
    commit_sha: string;
    branch: string;
    run_number: number;
    build_timestamp: string;
  })[] {
    const results = this.db
      .select({
        id: schema.metricValues.id,
        metric_id: schema.metricValues.metricId,
        build_id: schema.metricValues.buildId,
        value_numeric: schema.metricValues.valueNumeric,
        value_label: schema.metricValues.valueLabel,
        commit_sha: schema.buildContexts.commitSha,
        branch: schema.buildContexts.branch,
        run_number: schema.buildContexts.runNumber,
        build_timestamp: schema.buildContexts.timestamp,
      })
      .from(schema.metricValues)
      .innerJoin(schema.buildContexts, eq(schema.metricValues.buildId, schema.buildContexts.id))
      .where(
        and(
          eq(schema.metricValues.metricId, metricName),
          eq(schema.buildContexts.eventName, "push")
        )
      )
      .orderBy(asc(schema.buildContexts.timestamp))
      .all();

    return results;
  }

  getBaselineMetricValue(
    metricId: string,
    referenceBranch: string,
    maxAgeDays = 90
  ): number | undefined {
    const result = this.db
      .select({ value_numeric: schema.metricValues.valueNumeric })
      .from(schema.metricValues)
      .innerJoin(schema.buildContexts, eq(schema.metricValues.buildId, schema.buildContexts.id))
      .where(
        and(
          eq(schema.metricValues.metricId, metricId),
          eq(schema.buildContexts.branch, referenceBranch),
          eq(schema.buildContexts.eventName, "push"),
          gte(
            schema.buildContexts.timestamp,
            sql`datetime('now', '-' || ${maxAgeDays} || ' days')`
          ),
          isNotNull(schema.metricValues.valueNumeric)
        )
      )
      .orderBy(desc(schema.buildContexts.timestamp))
      .limit(1)
      .get();

    return result?.value_numeric ?? undefined;
  }
}
