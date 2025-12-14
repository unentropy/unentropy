import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";

export const schemaVersion = sqliteTable("schema_version", {
  version: text("version").primaryKey(),
  appliedAt: text("applied_at").notNull(),
  description: text("description"),
});

export const metricDefinitions = sqliteTable("metric_definitions", {
  id: text("id").primaryKey(),
  type: text("type", { enum: ["numeric", "label"] }).notNull(),
  unit: text("unit"),
  description: text("description"),
});

export const buildContexts = sqliteTable(
  "build_contexts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    commitSha: text("commit_sha").notNull(),
    branch: text("branch").notNull(),
    runId: text("run_id").notNull(),
    runNumber: integer("run_number").notNull(),
    eventName: text("event_name"),
    timestamp: text("timestamp").notNull(),
  },
  (table) => [
    index("idx_build_timestamp").on(table.timestamp),
    index("idx_build_branch").on(table.branch),
    index("idx_build_commit").on(table.commitSha),
    index("idx_build_event_timestamp").on(table.eventName, table.timestamp),
    uniqueIndex("unique_commit_run").on(table.commitSha, table.runId),
  ]
);

export const metricValues = sqliteTable(
  "metric_values",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    metricId: text("metric_id")
      .notNull()
      .references(() => metricDefinitions.id),
    buildId: integer("build_id")
      .notNull()
      .references(() => buildContexts.id),
    valueNumeric: real("value_numeric"),
    valueLabel: text("value_label"),
  },
  (table) => [
    uniqueIndex("unique_metric_build").on(table.metricId, table.buildId),
    index("idx_metric_value_build").on(table.buildId),
  ]
);
