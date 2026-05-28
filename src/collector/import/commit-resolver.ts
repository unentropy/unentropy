import { spawnSync } from "child_process";

export interface CommitResolverOptions {
  trendBranch: string;
  cwd?: string;
}

export class ShallowCloneError extends Error {
  constructor() {
    super(
      "nearest-commit resolution requires full git history\n" +
        "       run `git fetch --unshallow` locally, or set `fetch-depth: 0` in your CI checkout step"
    );
    this.name = "ShallowCloneError";
  }
}

export class CommitResolver {
  private shallowChecked = false;
  private shallowError: ShallowCloneError | null = null;
  private branchValidated = false;
  private branchError: Error | null = null;

  constructor(private options: CommitResolverOptions) {}

  resolveDirect(sha: string): string {
    return sha.toLowerCase();
  }

  resolveByTimestamp(isoTimestamp: string): string | null {
    this.ensureNotShallow();
    this.ensureBranchExists();

    const result = spawnSync(
      "git",
      ["log", "-1", "--format=%H", `--before=${isoTimestamp}`, this.options.trendBranch],
      {
        cwd: this.options.cwd,
        encoding: "utf-8",
      }
    );

    if (result.status !== 0) {
      throw new Error(`git log failed: ${result.stderr?.trim() || "non-zero exit"}`);
    }

    const sha = result.stdout.trim();
    return sha === "" ? null : sha;
  }

  private ensureNotShallow(): void {
    if (this.shallowChecked) {
      if (this.shallowError) throw this.shallowError;
      return;
    }
    this.shallowChecked = true;

    const result = spawnSync("git", ["rev-parse", "--is-shallow-repository"], {
      cwd: this.options.cwd,
      encoding: "utf-8",
    });

    if (result.status === 0 && result.stdout.trim() === "true") {
      this.shallowError = new ShallowCloneError();
      throw this.shallowError;
    }
  }

  private ensureBranchExists(): void {
    if (this.branchValidated) {
      if (this.branchError) throw this.branchError;
      return;
    }
    this.branchValidated = true;

    const result = spawnSync(
      "git",
      ["rev-parse", "--verify", `${this.options.trendBranch}^{commit}`],
      { cwd: this.options.cwd, encoding: "utf-8" }
    );

    if (result.status !== 0) {
      this.branchError = new Error(
        `trend branch not found in repository: ${this.options.trendBranch}`
      );
      throw this.branchError;
    }
  }
}
