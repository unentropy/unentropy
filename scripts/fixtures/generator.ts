import { Storage } from "../../src/storage/storage";
import { createStorageProvider } from "../../src/storage/providers/factory";
import type { ResolvedUnentropyConfig } from "../../src/config/loader";
import type { FixtureConfig, MetricGenerator, MetricInput } from "./definitions";
import type { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { metricDefinitions } from "../../src/storage/schema";

export function calculateBaseTimestamp(config: FixtureConfig): number {
  const hourInMs = 60 * 60 * 1000;
  const dayInMs = 24 * 60 * 60 * 1000;

  const endDate = new Date(Date.now() - hourInMs);

  if (config.timestampGenerator) {
    if (config.name === "huge-report") {
      const estimatedDays = Math.ceil(config.buildCount / 4);
      return endDate.getTime() - estimatedDays * dayInMs;
    }
    return endDate.getTime() - config.buildCount * dayInMs;
  }

  return endDate.getTime() - (config.buildCount - 1) * dayInMs;
}

function setPragma(conn: Database, name: string, value: string): string | undefined {
  const row = conn.query(`PRAGMA ${name}`).get() as Record<string, string> | undefined;
  conn.run(`PRAGMA ${name} = ${value}`);
  return row?.[name];
}

export async function generateFixtureDatabase(
  config: FixtureConfig,
  dbPath: string
): Promise<Storage> {
  const fs = await import("fs/promises");
  const path = await import("path");

  const dbDir = path.dirname(dbPath);
  await fs.mkdir(dbDir, { recursive: true });

  try {
    await fs.unlink(dbPath);
  } catch {}

  const db = new Storage(
    createStorageProvider({
      type: "sqlite-local",
      path: dbPath,
    })
  );
  await db.ready();

  const conn = db.getConnection();
  const origSync = setPragma(conn, "synchronous", "OFF");
  const origJournal = setPragma(conn, "journal_mode", "MEMORY");

  // Pre-insert metric definitions once so onConflictDoUpdate is a no-op in the loop
  const repo = db.getRepository();
  const seenDefs = new Set<string>();
  for (const metricGen of config.metricGenerators) {
    if (seenDefs.has(metricGen.id)) continue;
    seenDefs.add(metricGen.id);
    const drizzleDb = drizzle(conn, { schema: { metricDefinitions } });
    drizzleDb
      .insert(metricDefinitions)
      .values({
        id: metricGen.id,
        type: metricGen.type,
        unit: metricGen.unit ?? null,
        description: metricGen.description ?? null,
      })
      .onConflictDoNothing()
      .run();
  }

  const dayInMs = 24 * 60 * 60 * 1000;
  const baseTimestamp = calculateBaseTimestamp(config);
  const buildInterval = 1;

  const tx = conn.transaction(() => {
    for (let i = 0; i < config.buildCount; i++) {
      const buildDate = config.timestampGenerator
        ? config.timestampGenerator(i, baseTimestamp)
        : new Date(baseTimestamp + i * buildInterval * dayInMs);
      const buildTimestamp = buildDate.toISOString();
      const commitSha = `abc${i.toString().padStart(4, "0")}def0123456789012345678901234`;

      const metrics: MetricInput[] = [];

      for (const metricGen of config.metricGenerators) {
        const value = metricGen.valueGenerator(i);
        if (value === null) continue;

        metrics.push({
          definition: {
            id: metricGen.id,
            type: metricGen.type,
            description: metricGen.description,
            unit: metricGen.unit || undefined,
          },
          value_numeric: metricGen.type === "numeric" ? Number(value) : undefined,
          value_label: metricGen.type === "label" ? String(value) : undefined,
        });
      }

      repo.recordBuild(
        {
          commit_sha: commitSha,
          branch: "main",
          run_id: `run-${i + 1000}`,
          run_number: i + 1,
          event_name: "push",
          timestamp: buildTimestamp,
        },
        metrics
      );
    }
  });
  tx();

  // Restore original PRAGMAs
  if (origSync) conn.run(`PRAGMA synchronous = ${origSync}`);
  if (origJournal) conn.run(`PRAGMA journal_mode = ${origJournal}`);

  return db;
}

export function createReportConfig(
  metricGenerators: MetricGenerator[],
  report?: import("./definitions").FixtureConfig["report"]
): ResolvedUnentropyConfig {
  return {
    metrics: Object.fromEntries(
      metricGenerators.map((mg) => [
        mg.id,
        {
          id: mg.id,
          name: mg.name || mg.id,
          type: mg.type,
          description: mg.description,
          unit: mg.unit,
          command: "echo 0",
        },
      ])
    ),
    storage: {
      type: "sqlite-local",
    },
    report,
  };
}
