/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { rm } from "fs/promises";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { spawnSync } from "child_process";
import { Storage } from "../../../../src/storage/storage";
import { ingest, IMPORT_EVENT_NAME, parseJsonl } from "../../../../src/collector/import/ingester";

function run(cmd: string, args: string[], cwd: string): string {
  const r = spawnSync(cmd, args, { cwd, encoding: "utf-8" });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed: ${r.stderr}`);
  return r.stdout.trim();
}

function makeRepo(): { dir: string; sha: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "unentropy-ingester-"));
  run("git", ["init", "-q", "-b", "main"], dir);
  run("git", ["config", "user.email", "test@example.com"], dir);
  run("git", ["config", "user.name", "Test"], dir);
  run("git", ["config", "commit.gpgsign", "false"], dir);

  const date = "2024-01-01T00:00:00Z";
  Bun.write(join(dir, "f.txt"), "hello");
  run("git", ["add", "."], dir);
  spawnSync("git", ["commit", "-q", "-m", "init", "--date", date], {
    cwd: dir,
    env: { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date },
  });
  const sha = run("git", ["rev-parse", "HEAD"], dir);

  return { dir, sha, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

describe("parseJsonl", () => {
  it("parses valid records and reports invalid lines", () => {
    const jsonl = [
      '{"metric_id":"coverage","timestamp":"2024-01-01T00:00:00Z","value_numeric":80}',
      "not-json",
      '{"metric_id":"BAD","timestamp":"2024-01-01T00:00:00Z","value_numeric":1}',
      '{"metric_id":"coverage","timestamp":"2024-01-02T00:00:00Z","value_numeric":81,"value_label":"a"}',
      "",
      '{"metric_id":"bugs","timestamp":"2024-01-03T00:00:00Z","value_numeric":3}',
    ].join("\n");

    const { records, errors } = parseJsonl(jsonl);

    expect(records.length).toBe(2);
    expect(errors.length).toBe(3);
    expect(errors[0]!.line).toBe(2);
    expect(errors[1]!.line).toBe(3);
    expect(errors[2]!.line).toBe(4);
  });
});

describe("ingest", () => {
  let repo: ReturnType<typeof makeRepo>;
  const dbPath = "./test-import.db";
  let storage: Storage;

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

  it("inserts valid records with event_name='import' and inferred metric_definitions", () => {
    const jsonl = [
      `{"metric_id":"coverage","timestamp":"2024-01-01T00:00:00Z","value_numeric":80,"commit_sha":"${repo.sha}","source":"sonarqube"}`,
      `{"metric_id":"reliability","timestamp":"2024-01-01T00:00:00Z","value_label":"B","commit_sha":"${repo.sha}","source":"sonarqube"}`,
    ].join("\n");

    const summary = ingest(storage, jsonl, { trendBranch: "main", cwd: repo.dir });

    expect(summary.validRecords).toBe(2);
    expect(summary.invalidRecords).toBe(0);
    expect(summary.inserted).toBe(2);
    expect(summary.tierCounts["source-provided"]).toBe(2);

    const db = storage.getConnection();
    const builds = db
      .query<
        { event_name: string; run_id: string },
        []
      >("SELECT event_name, run_id FROM build_contexts")
      .all();
    expect(builds.length).toBe(1);
    expect(builds[0]!.event_name).toBe(IMPORT_EVENT_NAME);
    expect(builds[0]!.run_id).toBe(`import:sonarqube:${repo.sha}`);

    const defs = db
      .query<{ id: string; type: string }, []>("SELECT id, type FROM metric_definitions")
      .all();
    expect(defs).toContainEqual({ id: "coverage", type: "numeric" });
    expect(defs).toContainEqual({ id: "reliability", type: "label" });
  });

  it("skips malformed records and continues without --strict", () => {
    const jsonl = [
      `{"metric_id":"coverage","timestamp":"2024-01-01T00:00:00Z","value_numeric":80,"commit_sha":"${repo.sha}"}`,
      "not-json",
      `{"metric_id":"bugs","timestamp":"2024-01-01T00:00:00Z","value_numeric":3,"commit_sha":"${repo.sha}"}`,
    ].join("\n");

    const summary = ingest(storage, jsonl, { trendBranch: "main", cwd: repo.dir });

    expect(summary.validRecords).toBe(2);
    expect(summary.invalidRecords).toBe(1);
    expect(summary.inserted).toBe(2);
  });

  it("aborts writes in --strict when any record is invalid", () => {
    const jsonl = [
      `{"metric_id":"coverage","timestamp":"2024-01-01T00:00:00Z","value_numeric":80,"commit_sha":"${repo.sha}"}`,
      "not-json",
    ].join("\n");

    const summary = ingest(storage, jsonl, {
      trendBranch: "main",
      strict: true,
      cwd: repo.dir,
    });

    expect(summary.invalidRecords).toBe(1);
    expect(summary.inserted).toBe(0);

    const db = storage.getConnection();
    const builds = db.query<{ n: number }, []>("SELECT COUNT(*) AS n FROM build_contexts").get();
    expect(builds!.n).toBe(0);
  });

  it("is idempotent on re-import via (commit_sha, run_id) uniqueness", () => {
    const jsonl = `{"metric_id":"coverage","timestamp":"2024-01-01T00:00:00Z","value_numeric":80,"commit_sha":"${repo.sha}","source":"sonarqube"}`;
    ingest(storage, jsonl, { trendBranch: "main", cwd: repo.dir });
    const second = ingest(storage, jsonl, { trendBranch: "main", cwd: repo.dir });

    expect(second.inserted).toBe(1);

    const db = storage.getConnection();
    const builds = db.query<{ n: number }, []>("SELECT COUNT(*) AS n FROM build_contexts").get();
    expect(builds!.n).toBe(1);

    const values = db.query<{ n: number }, []>("SELECT COUNT(*) AS n FROM metric_values").get();
    expect(values!.n).toBe(1);
  });

  it("resolves nearest-by-timestamp when commit_sha is absent", () => {
    const jsonl = `{"metric_id":"coverage","timestamp":"2024-06-01T00:00:00Z","value_numeric":80}`;
    const summary = ingest(storage, jsonl, { trendBranch: "main", cwd: repo.dir });

    expect(summary.tierCounts["nearest-timestamp"]).toBe(1);
    expect(summary.inserted).toBe(1);

    const db = storage.getConnection();
    const row = db.query<{ commit_sha: string }, []>("SELECT commit_sha FROM build_contexts").get();
    expect(row!.commit_sha).toBe(repo.sha);
  });

  it("skips records whose timestamp predates repo history", () => {
    const jsonl = `{"metric_id":"coverage","timestamp":"2020-01-01T00:00:00Z","value_numeric":80}`;
    const summary = ingest(storage, jsonl, { trendBranch: "main", cwd: repo.dir });

    expect(summary.tierCounts.skipped).toBe(1);
    expect(summary.inserted).toBe(0);
    expect(summary.resolutionWarnings.length).toBe(1);
  });

  it("flags metric ids that are not declared in config", () => {
    const jsonl = `{"metric_id":"new-metric","timestamp":"2024-01-01T00:00:00Z","value_numeric":1,"commit_sha":"${repo.sha}"}`;
    const summary = ingest(storage, jsonl, {
      trendBranch: "main",
      cwd: repo.dir,
      declaredMetricIds: new Set(["other-metric"]),
    });
    expect(summary.undeclaredMetricIds).toEqual(["new-metric"]);
  });
});
