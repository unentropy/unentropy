/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { rm } from "fs/promises";
import { Storage } from "../../src/storage/storage";
import { ingest } from "../../src/collector/import/ingester";
import type { ResolvedUnentropyConfig } from "../../src/config/loader";
import { spawnSync } from "child_process";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const dbPath = "/tmp/test-reporting-imports.db";

function makeRepo(): { dir: string; sha: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "unentropy-report-import-"));
  const run = (cmd: string, args: string[]) =>
    spawnSync(cmd, args, { cwd: dir, encoding: "utf-8" });
  run("git", ["init", "-q", "-b", "main"]);
  run("git", ["config", "user.email", "test@example.com"]);
  run("git", ["config", "user.name", "Test"]);
  run("git", ["config", "commit.gpgsign", "false"]);

  const date = "2024-01-01T00:00:00Z";
  writeFileSync(join(dir, "f.txt"), "hello");
  run("git", ["add", "."]);
  spawnSync("git", ["commit", "-q", "-m", "init", "--date", date], {
    cwd: dir,
    env: { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date },
  });
  const sha = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: dir,
    encoding: "utf-8",
  }).stdout.trim();
  return { dir, sha, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

const testConfig: ResolvedUnentropyConfig = {
  metrics: {
    coverage: {
      id: "coverage",
      name: "Coverage",
      type: "numeric",
      unit: "percent",
      command: "echo 0",
    },
  },
  storage: { type: "sqlite-local" },
};

describe("Reporter includes event_name='import' rows", () => {
  let storage: Storage;
  let repo: ReturnType<typeof makeRepo>;

  beforeEach(async () => {
    repo = makeRepo();
    storage = new Storage({ type: "sqlite-local", path: dbPath });
    await storage.ready();
  });

  afterEach(async () => {
    await storage.close();
    await rm(dbPath, { force: true });
    repo.cleanup();
  });

  test("an import-only DB produces a non-empty time series for the metric", async () => {
    const jsonl = `{"metric_id":"coverage","timestamp":"2024-01-01T00:00:00Z","value_numeric":80,"commit_sha":"${repo.sha}","source":"sonarqube"}`;
    ingest(storage, jsonl, { trendBranch: "main", cwd: repo.dir });

    const repository = storage.getRepository();
    const series = repository.getMetricTimeSeries("coverage");

    expect(series.length).toBe(1);
    expect(series[0]!.value_numeric).toBe(80);
    expect(series[0]!.commit_sha).toBe(repo.sha);
  });

  test("getAllBuildContexts includes imported builds when filtered by event onlyWithMetrics", async () => {
    const jsonl = `{"metric_id":"coverage","timestamp":"2024-01-01T00:00:00Z","value_numeric":80,"commit_sha":"${repo.sha}","source":"sonarqube"}`;
    ingest(storage, jsonl, { trendBranch: "main", cwd: repo.dir });

    const repository = storage.getRepository();
    const builds = repository.getAllBuildContexts({ onlyWithMetrics: true });

    expect(builds.length).toBe(1);
    expect(builds[0]!.event_name).toBe("import");
  });

  test("mixed push and import rows render in chronological order with no silent drops", async () => {
    const db = storage.getConnection();

    db.exec(`
      INSERT INTO build_contexts (commit_sha, branch, run_id, run_number, event_name, timestamp)
      VALUES ('${repo.sha}', 'main', 'push-1', 1, 'push', '2024-06-01T00:00:00Z');
      INSERT INTO metric_definitions (id, type) VALUES ('coverage', 'numeric');
      INSERT INTO metric_values (metric_id, build_id, value_numeric)
      VALUES ('coverage', (SELECT id FROM build_contexts WHERE run_id='push-1'), 90);
    `);

    const jsonl = `{"metric_id":"coverage","timestamp":"2024-01-01T00:00:00Z","value_numeric":80,"commit_sha":"${repo.sha}","source":"sonarqube"}`;
    ingest(storage, jsonl, { trendBranch: "main", cwd: repo.dir });

    const series = storage.getRepository().getMetricTimeSeries("coverage");
    expect(series.length).toBe(2);
    expect(series.map((s) => s.value_numeric)).toEqual([80, 90]);
    expect(series.map((s) => s.build_timestamp).sort()).toEqual([
      "2024-01-01T00:00:00Z",
      "2024-06-01T00:00:00Z",
    ]);
  });

  test("a CI-only DB still produces the expected trend (regression guard)", async () => {
    const db = storage.getConnection();

    db.exec(`
      INSERT INTO build_contexts (commit_sha, branch, run_id, run_number, event_name, timestamp)
      VALUES ('${repo.sha}', 'main', 'push-1', 1, 'push', '2024-06-01T00:00:00Z');
      INSERT INTO metric_definitions (id, type) VALUES ('coverage', 'numeric');
      INSERT INTO metric_values (metric_id, build_id, value_numeric)
      VALUES ('coverage', (SELECT id FROM build_contexts WHERE run_id='push-1'), 90);
    `);

    const series = storage.getRepository().getMetricTimeSeries("coverage");
    expect(series.length).toBe(1);
    expect(series[0]!.value_numeric).toBe(90);
  });

  void testConfig;
});
