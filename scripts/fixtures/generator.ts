import { Storage } from "../../src/storage/storage";
import type { ResolvedUnentropyConfig } from "../../src/config/loader";
import type { FixtureConfig, MetricGenerator, MetricInput } from "./definitions";

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

  const db = new Storage({
    type: "sqlite-local",
    path: dbPath,
  });
  await db.ready();

  const repo = db.getRepository();
  const dayInMs = 24 * 60 * 60 * 1000;
  const baseTimestamp = calculateBaseTimestamp(config);
  const buildInterval = config.buildCount > 10 ? 1 : 1;

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

    await repo.recordBuild(
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

  return db;
}

export function createReportConfig(metricGenerators: MetricGenerator[]): ResolvedUnentropyConfig {
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
  };
}
