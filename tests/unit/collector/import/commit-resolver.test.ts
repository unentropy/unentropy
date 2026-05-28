/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { spawnSync } from "child_process";
import {
  CommitResolver,
  ShallowCloneError,
} from "../../../../src/collector/import/commit-resolver";

function run(cmd: string, args: string[], cwd: string): string {
  const r = spawnSync(cmd, args, { cwd, encoding: "utf-8" });
  if (r.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} failed in ${cwd}: ${r.stderr || r.stdout}`);
  }
  return r.stdout.trim();
}

function makeRepo(): {
  dir: string;
  cleanup: () => void;
  commits: { sha: string; date: string }[];
} {
  const dir = mkdtempSync(join(tmpdir(), "unentropy-resolver-"));
  run("git", ["init", "-q", "-b", "main"], dir);
  run("git", ["config", "user.email", "test@example.com"], dir);
  run("git", ["config", "user.name", "Test"], dir);
  run("git", ["config", "commit.gpgsign", "false"], dir);

  const commits: { sha: string; date: string }[] = [];
  const dates = ["2024-01-01T00:00:00Z", "2024-02-01T00:00:00Z", "2024-03-01T00:00:00Z"];
  for (const date of dates) {
    Bun.write(join(dir, "f.txt"), `content for ${date}`);
    run("git", ["add", "."], dir);
    spawnSync("git", ["commit", "-q", "-m", `commit at ${date}`, "--date", date], {
      cwd: dir,
      env: {
        ...process.env,
        GIT_AUTHOR_DATE: date,
        GIT_COMMITTER_DATE: date,
      },
    });
    const sha = run("git", ["rev-parse", "HEAD"], dir);
    commits.push({ sha, date });
  }

  return {
    dir,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
    commits,
  };
}

describe("CommitResolver", () => {
  describe("resolveDirect", () => {
    it("returns the SHA as-is, normalized to lowercase", () => {
      const r = new CommitResolver({ trendBranch: "main", cwd: "/" });
      expect(r.resolveDirect("ABCDEF0123456789ABCDEF0123456789ABCDEF01")).toBe(
        "abcdef0123456789abcdef0123456789abcdef01"
      );
    });

    it("does not consult git", () => {
      const r = new CommitResolver({ trendBranch: "main", cwd: "/nonexistent-path" });
      expect(() => r.resolveDirect("a".repeat(40))).not.toThrow();
    });
  });

  describe("resolveByTimestamp", () => {
    let repo: ReturnType<typeof makeRepo>;

    beforeAll(() => {
      repo = makeRepo();
    });

    afterAll(() => {
      repo.cleanup();
    });

    it("picks the most recent commit on or before the timestamp", () => {
      const r = new CommitResolver({ trendBranch: "main", cwd: repo.dir });
      const sha = r.resolveByTimestamp("2024-02-15T00:00:00Z");
      expect(sha).toBe(repo.commits[1]!.sha);
    });

    it("returns null when the timestamp predates the first commit", () => {
      const r = new CommitResolver({ trendBranch: "main", cwd: repo.dir });
      const sha = r.resolveByTimestamp("2020-01-01T00:00:00Z");
      expect(sha).toBeNull();
    });

    it("returns the HEAD commit for a timestamp after the last commit", () => {
      const r = new CommitResolver({ trendBranch: "main", cwd: repo.dir });
      const sha = r.resolveByTimestamp("2030-01-01T00:00:00Z");
      expect(sha).toBe(repo.commits[2]!.sha);
    });

    it("throws ShallowCloneError when the repository is shallow", () => {
      const shallowDir = mkdtempSync(join(tmpdir(), "unentropy-resolver-shallow-"));
      try {
        run("git", ["clone", "--depth", "1", `file://${repo.dir}`, "shallow"], shallowDir);
        const shallowRepo = join(shallowDir, "shallow");

        const r = new CommitResolver({ trendBranch: "main", cwd: shallowRepo });
        expect(() => r.resolveByTimestamp("2024-02-15T00:00:00Z")).toThrow(ShallowCloneError);
      } finally {
        rmSync(shallowDir, { recursive: true, force: true });
      }
    });

    it("throws a descriptive error when the trend branch does not exist", () => {
      const r = new CommitResolver({ trendBranch: "no-such-branch", cwd: repo.dir });
      expect(() => r.resolveByTimestamp("2024-02-15T00:00:00Z")).toThrow(/trend branch not found/);
    });
  });
});
