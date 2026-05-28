/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, test, beforeEach, afterEach, expect } from "bun:test";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { Database } from "bun:sqlite";

const PROJECT_ROOT = new URL("../..", import.meta.url).pathname;
const CLI = join(PROJECT_ROOT, "src/index.ts");

const MINIMAL_CONFIG = JSON.stringify({
  metrics: {
    coverage: { type: "numeric", command: "echo 0", unit: "percent" },
  },
});

function initRepo(dir: string): { sha: string } {
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
  return { sha };
}

function runImport(cwd: string, args: string[]): { code: number; stdout: string; stderr: string } {
  const r = spawnSync("bun", [CLI, "import", ...args], { cwd, encoding: "utf-8" });
  return {
    code: r.status ?? -1,
    stdout: typeof r.stdout === "string" ? r.stdout : "",
    stderr: typeof r.stderr === "string" ? r.stderr : "",
  };
}

describe("unentropy import (integration)", () => {
  let tempDir: string;
  let sha: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "unentropy-import-"));
    sha = initRepo(tempDir).sha;
    writeFileSync(join(tempDir, "unentropy.json"), MINIMAL_CONFIG);
  });

  afterEach(() => {
    if (existsSync(tempDir)) rmSync(tempDir, { recursive: true, force: true });
  });

  test("imports valid JSONL into a new database with event_name='import'", () => {
    const jsonlPath = join(tempDir, "import.jsonl");
    writeFileSync(
      jsonlPath,
      [
        `{"metric_id":"coverage","timestamp":"2024-01-01T00:00:00Z","value_numeric":80,"commit_sha":"${sha}","source":"sonarqube"}`,
        `{"metric_id":"bugs","timestamp":"2024-01-01T00:00:00Z","value_numeric":3,"commit_sha":"${sha}","source":"sonarqube"}`,
      ].join("\n")
    );

    const dbPath = join(tempDir, "scratch.db");
    const r = runImport(tempDir, [jsonlPath, "--output", dbPath]);

    expect(r.code).toBe(0);
    expect(r.stdout).toContain("imported 2 records");
    expect(existsSync(dbPath)).toBe(true);

    const db = new Database(dbPath, { readonly: true });
    const builds = db
      .query<
        { event_name: string; commit_sha: string; run_id: string },
        []
      >("SELECT event_name, commit_sha, run_id FROM build_contexts")
      .all();
    expect(builds.length).toBe(1);
    expect(builds[0]!.event_name).toBe("import");
    expect(builds[0]!.commit_sha).toBe(sha);
    expect(builds[0]!.run_id).toBe(`import:sonarqube:${sha}`);
    const values = db
      .query<
        { metric_id: string; value_numeric: number },
        []
      >("SELECT metric_id, value_numeric FROM metric_values ORDER BY metric_id")
      .all();
    expect(values).toEqual([
      { metric_id: "bugs", value_numeric: 3 },
      { metric_id: "coverage", value_numeric: 80 },
    ]);
    db.close();
  });

  test("imports into an existing DB without touching pre-existing rows", () => {
    const dbPath = join(tempDir, "scratch.db");

    const pre = new Database(dbPath);
    pre.exec(`
      CREATE TABLE schema_version (version TEXT PRIMARY KEY, applied_at DATETIME, description TEXT);
      CREATE TABLE metric_definitions (id TEXT PRIMARY KEY CHECK(id GLOB '[a-z0-9-]*'), type TEXT NOT NULL CHECK(type IN ('numeric','label')), unit TEXT, description TEXT);
      CREATE TABLE build_contexts (id INTEGER PRIMARY KEY AUTOINCREMENT, commit_sha TEXT NOT NULL, branch TEXT NOT NULL, run_id TEXT NOT NULL, run_number INTEGER NOT NULL, event_name TEXT, timestamp DATETIME NOT NULL, UNIQUE(commit_sha, run_id));
      CREATE TABLE metric_values (id INTEGER PRIMARY KEY AUTOINCREMENT, metric_id TEXT NOT NULL, build_id INTEGER NOT NULL, value_numeric REAL, value_label TEXT, FOREIGN KEY (metric_id) REFERENCES metric_definitions(id), FOREIGN KEY (build_id) REFERENCES build_contexts(id), UNIQUE(metric_id, build_id), CHECK((value_numeric IS NOT NULL AND value_label IS NULL) OR (value_numeric IS NULL AND value_label IS NOT NULL)));
      INSERT INTO schema_version (version, description) VALUES ('2.0.0', 'init');
      INSERT INTO metric_definitions (id, type, unit) VALUES ('coverage', 'numeric', 'percent');
      INSERT INTO build_contexts (commit_sha, branch, run_id, run_number, event_name, timestamp) VALUES ('${sha}', 'main', '999', 1, 'push', '2024-06-01T00:00:00Z');
      INSERT INTO metric_values (metric_id, build_id, value_numeric) VALUES ('coverage', 1, 99);
    `);
    pre.close();

    const jsonlPath = join(tempDir, "import.jsonl");
    writeFileSync(
      jsonlPath,
      `{"metric_id":"coverage","timestamp":"2024-01-01T00:00:00Z","value_numeric":80,"commit_sha":"${sha}","source":"sonarqube"}`
    );

    const r = runImport(tempDir, [jsonlPath, "--output", dbPath]);
    expect(r.code).toBe(0);

    const db = new Database(dbPath, { readonly: true });
    const pushBuild = db
      .query<{ value_numeric: number; event_name: string }, []>(
        `SELECT bc.event_name, mv.value_numeric FROM build_contexts bc
           JOIN metric_values mv ON mv.build_id = bc.id
           WHERE bc.run_id = '999'`
      )
      .get();
    expect(pushBuild?.value_numeric).toBe(99);
    expect(pushBuild?.event_name).toBe("push");

    const counts = db
      .query<
        { n: number },
        []
      >("SELECT COUNT(*) AS n FROM build_contexts WHERE event_name = 'import'")
      .get();
    expect(counts?.n).toBe(1);
    db.close();
  });

  test("reports missing JSONL file with exit 1", () => {
    const r = runImport(tempDir, [
      join(tempDir, "missing.jsonl"),
      "--output",
      join(tempDir, "x.db"),
    ]);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("JSONL file not found");
  });

  test("reports missing config with exit 1", () => {
    rmSync(join(tempDir, "unentropy.json"));
    const jsonlPath = join(tempDir, "data.jsonl");
    writeFileSync(jsonlPath, "");
    const r = runImport(tempDir, [jsonlPath, "--output", join(tempDir, "x.db")]);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("Config file not found");
  });

  test("--strict exits 1 and writes nothing when any record is invalid", () => {
    const jsonlPath = join(tempDir, "bad.jsonl");
    writeFileSync(
      jsonlPath,
      [
        `{"metric_id":"coverage","timestamp":"2024-01-01T00:00:00Z","value_numeric":80,"commit_sha":"${sha}"}`,
        "not-json",
      ].join("\n")
    );

    const dbPath = join(tempDir, "scratch.db");
    const r = runImport(tempDir, [jsonlPath, "--output", dbPath, "--strict"]);

    expect(r.code).toBe(1);
    expect(r.stderr).toContain("invalid JSON");

    if (existsSync(dbPath)) {
      const db = new Database(dbPath, { readonly: true });
      const n = db.query<{ n: number }, []>("SELECT COUNT(*) AS n FROM build_contexts").get();
      expect(n!.n).toBe(0);
      db.close();
    }
  });

  test("non-strict mode skips bad records and reports them on stderr", () => {
    const jsonlPath = join(tempDir, "mixed.jsonl");
    writeFileSync(
      jsonlPath,
      [
        `{"metric_id":"coverage","timestamp":"2024-01-01T00:00:00Z","value_numeric":80,"commit_sha":"${sha}"}`,
        "not-json",
      ].join("\n")
    );

    const r = runImport(tempDir, [jsonlPath, "--output", join(tempDir, "scratch.db")]);
    expect(r.code).toBe(0);
    expect(r.stderr).toContain("warning:");
    expect(r.stderr).toContain("invalid JSON");
    expect(r.stdout).toContain("imported 1 records");
  });

  test("--dry-run does not write and exits 0 on clean input", () => {
    const jsonlPath = join(tempDir, "data.jsonl");
    writeFileSync(
      jsonlPath,
      `{"metric_id":"coverage","timestamp":"2024-01-01T00:00:00Z","value_numeric":80,"commit_sha":"${sha}"}`
    );
    const dbPath = join(tempDir, "scratch.db");
    const r = runImport(tempDir, [jsonlPath, "--output", dbPath, "--dry-run"]);

    expect(r.code).toBe(0);
    expect(r.stdout).toContain("dry-run summary");
    expect(r.stdout).toContain("no database writes performed");
    expect(existsSync(dbPath)).toBe(false);
  });

  test("--dry-run flags undeclared metric ids in the summary", () => {
    const jsonlPath = join(tempDir, "data.jsonl");
    writeFileSync(
      jsonlPath,
      `{"metric_id":"bugs","timestamp":"2024-01-01T00:00:00Z","value_numeric":1,"commit_sha":"${sha}"}`
    );

    const r = runImport(tempDir, [jsonlPath, "--output", join(tempDir, "scratch.db"), "--dry-run"]);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("bugs (undeclared)");
  });

  test("--dry-run lists invalid records but still reports the summary", () => {
    const jsonlPath = join(tempDir, "mixed.jsonl");
    writeFileSync(
      jsonlPath,
      [
        `{"metric_id":"coverage","timestamp":"2024-01-01T00:00:00Z","value_numeric":80,"commit_sha":"${sha}"}`,
        "not-json",
      ].join("\n")
    );

    const r = runImport(tempDir, [jsonlPath, "--output", join(tempDir, "x.db"), "--dry-run"]);
    expect(r.code).toBe(0);
    expect(r.stderr).toContain("invalid JSON");
    expect(r.stdout).toContain("dry-run summary");
    expect(r.stdout).toContain("(1 valid, 1 invalid)");
  });

  test("--dry-run does not require --output to be a writable path", () => {
    const jsonlPath = join(tempDir, "data.jsonl");
    writeFileSync(
      jsonlPath,
      `{"metric_id":"coverage","timestamp":"2024-01-01T00:00:00Z","value_numeric":80,"commit_sha":"${sha}"}`
    );

    const r = runImport(tempDir, [
      jsonlPath,
      "--output",
      "/nonexistent-dir/never-created.db",
      "--dry-run",
    ]);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("dry-run summary");
  });
});
