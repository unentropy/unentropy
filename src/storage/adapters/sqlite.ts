import type { Database } from "bun:sqlite";
import type { DatabaseAdapter } from "./interface";
import type {
  BuildContext,
  InsertBuildContext,
  InsertMetricDefinition,
  InsertMetricValue,
  MetricDefinition,
  MetricValue,
} from "../types";

/**
 * SqliteDatabaseAdapter implements DatabaseAdapter using SQLite-specific SQL queries.
 *
 * This adapter uses bun:sqlite prepared statements for efficient query execution.
 * All queries are SQLite-specific; a PostgreSQL adapter would use different SQL dialects.
 */
export class SqliteDatabaseAdapter implements DatabaseAdapter {
  constructor(private db: Database) {}

  insertBuildContext(data: InsertBuildContext): number {
    const stmt = this.db.query<
      { id: number },
      [
        string,
        string,
        string,
        number,
        string | null,
        string | null,
        string,
        number | null,
        string | null,
        string | null,
      ]
    >(`
      INSERT INTO build_contexts (
        commit_sha, branch, run_id, run_number, actor, event_name, timestamp,
        pull_request_number, pull_request_base, pull_request_head
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `);

    const result = stmt.get(
      data.commit_sha,
      data.branch,
      data.run_id,
      data.run_number,
      data.actor ?? null,
      data.event_name ?? null,
      data.timestamp,
      data.pull_request_number ?? null,
      data.pull_request_base ?? null,
      data.pull_request_head ?? null
    );

    if (!result) throw new Error("Failed to insert build context");
    return result.id;
  }

  upsertMetricDefinition(data: InsertMetricDefinition): MetricDefinition {
    const stmt = this.db.query<MetricDefinition, [string, string, string | null, string | null]>(`
      INSERT INTO metric_definitions (name, type, unit, description)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET
        unit = excluded.unit,
        description = excluded.description
      RETURNING id, name, type, unit, description, created_at
    `);

    const result = stmt.get(data.name, data.type, data.unit ?? null, data.description ?? null);

    if (!result) throw new Error("Failed to upsert metric definition");
    return result;
  }

  insertMetricValue(data: InsertMetricValue): number {
    const stmt = this.db.query<
      { id: number },
      [number, number, number | null, string | null, string, number | null]
    >(`
      INSERT INTO metric_values (
        metric_id, build_id, value_numeric, value_label, collected_at, collection_duration_ms
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(metric_id, build_id) DO UPDATE SET
        value_numeric = excluded.value_numeric,
        value_label = excluded.value_label,
        collected_at = excluded.collected_at,
        collection_duration_ms = excluded.collection_duration_ms
      RETURNING id
    `);

    const result = stmt.get(
      data.metric_id,
      data.build_id,
      data.value_numeric ?? null,
      data.value_label ?? null,
      data.collected_at,
      data.collection_duration_ms ?? null
    );

    if (!result) throw new Error("Failed to insert metric value");
    return result.id;
  }

  getBuildContext(id: number): BuildContext | undefined {
    const stmt = this.db.query<BuildContext, [number]>("SELECT * FROM build_contexts WHERE id = ?");
    return stmt.get(id) ?? undefined;
  }

  getMetricDefinition(name: string): MetricDefinition | undefined {
    const stmt = this.db.query<MetricDefinition, [string]>(
      "SELECT * FROM metric_definitions WHERE name = ?"
    );
    return stmt.get(name) ?? undefined;
  }

  getMetricValues(metricId: number, buildId: number): MetricValue | undefined {
    const stmt = this.db.query<MetricValue, [number, number]>(
      "SELECT * FROM metric_values WHERE metric_id = ? AND build_id = ?"
    );
    return stmt.get(metricId, buildId) ?? undefined;
  }

  getMetricValuesByBuildId(buildId: number): (MetricValue & { metric_name: string })[] {
    const stmt = this.db.query<MetricValue & { metric_name: string }, [number]>(`
      SELECT mv.*, md.name as metric_name
      FROM metric_values mv
      JOIN metric_definitions md ON mv.metric_id = md.id
      WHERE mv.build_id = ?
      ORDER BY md.name
    `);
    return stmt.all(buildId);
  }

  getAllMetricDefinitions(): MetricDefinition[] {
    const stmt = this.db.query<MetricDefinition, []>(
      "SELECT * FROM metric_definitions ORDER BY name"
    );
    return stmt.all();
  }

  getAllMetricValues(): (MetricValue & { metric_name: string })[] {
    const stmt = this.db.query<MetricValue & { metric_name: string }, []>(`
      SELECT mv.*, md.name as metric_name
      FROM metric_values mv
      JOIN metric_definitions md ON mv.metric_id = md.id
      ORDER BY mv.build_id, md.name
    `);
    return stmt.all();
  }

  getMetricTimeSeries(metricName: string): (MetricValue & {
    metric_name: string;
    commit_sha: string;
    branch: string;
    run_number: number;
    build_timestamp: string;
  })[] {
    const stmt = this.db.query<
      MetricValue & {
        metric_name: string;
        commit_sha: string;
        branch: string;
        run_number: number;
        build_timestamp: string;
      },
      [string]
    >(`
      SELECT 
        mv.*,
        md.name as metric_name,
        bc.commit_sha,
        bc.branch,
        bc.run_number,
        bc.timestamp as build_timestamp
      FROM metric_values mv
      JOIN metric_definitions md ON mv.metric_id = md.id
      JOIN build_contexts bc ON mv.build_id = bc.id
      WHERE md.name = ? AND bc.event_name = 'push'
      ORDER BY bc.timestamp ASC
    `);
    return stmt.all(metricName);
  }

  getAllBuildContexts(options?: { onlyWithMetrics?: boolean }): BuildContext[] {
    if (options?.onlyWithMetrics) {
      const stmt = this.db.query<BuildContext, []>(`
        SELECT bc.* FROM build_contexts bc
        WHERE EXISTS (SELECT 1 FROM metric_values mv WHERE mv.build_id = bc.id)
        ORDER BY bc.timestamp
      `);
      return stmt.all();
    }
    const stmt = this.db.query<BuildContext, []>("SELECT * FROM build_contexts ORDER BY timestamp");
    return stmt.all();
  }

  getBaselineMetricValues(
    metricName: string,
    referenceBranch: string,
    maxBuilds = 20,
    maxAgeDays = 90
  ): { value_numeric: number }[] {
    const stmt = this.db.query<{ value_numeric: number }, [string, string, number, number]>(`
      SELECT mv.value_numeric
      FROM metric_values mv
      JOIN metric_definitions md ON mv.metric_id = md.id
      JOIN build_contexts bc ON mv.build_id = bc.id
      WHERE md.name = ? 
        AND bc.branch = ?
        AND bc.event_name = 'push'
        AND bc.timestamp >= datetime('now', '-' || ? || ' days')
        AND mv.value_numeric IS NOT NULL
      ORDER BY bc.timestamp DESC
      LIMIT ?
    `);

    return stmt.all(metricName, referenceBranch, maxAgeDays, maxBuilds);
  }

  getPullRequestMetricValue(
    metricName: string,
    pullRequestBuildId: number
  ): { value_numeric: number } | undefined {
    const stmt = this.db.query<{ value_numeric: number }, [string, number]>(`
      SELECT mv.value_numeric
      FROM metric_values mv
      JOIN metric_definitions md ON mv.metric_id = md.id
      WHERE md.name = ? 
        AND mv.build_id = ?
        AND mv.value_numeric IS NOT NULL
    `);

    return stmt.get(metricName, pullRequestBuildId) ?? undefined;
  }
}
