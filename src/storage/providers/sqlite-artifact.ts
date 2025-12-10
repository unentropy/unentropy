import { Database } from "bun:sqlite";
import { promises as fs } from "fs";
import { dirname } from "path";
import { spawnSync } from "child_process";
import type { StorageProvider, SqliteArtifactConfig } from "./interface";

interface Artifact {
  id: number;
  name: string;
  size_in_bytes?: number;
  created_at?: string;
  workflow_run?: {
    id: number;
    head_branch: string;
  };
}

export class SqliteArtifactStorageProvider implements StorageProvider {
  private db: Database | null = null;
  private initialized = false;
  private artifactName: string;
  private branchFilter: string;
  private databasePath: string;
  private sourceRunId: number | undefined;
  private firstRun = false;

  constructor(config: SqliteArtifactConfig) {
    this.artifactName = config.artifactName ?? "unentropy-metrics";
    this.branchFilter = config.branchFilter ?? process.env.GITHUB_REF_NAME ?? "main";
    this.databasePath = config.databasePath ?? "./unentropy-metrics.db";
  }

  async initialize(): Promise<Database> {
    if (this.initialized && this.db) {
      return this.db;
    }

    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPOSITORY;

    if (!token) {
      throw new Error("GITHUB_TOKEN environment variable is required");
    }

    if (!repo) {
      throw new Error("GITHUB_REPOSITORY environment variable is required");
    }

    if (!/^[^/]+\/[^/]+$/.test(repo)) {
      throw new Error(`Invalid GITHUB_REPOSITORY format: expected 'owner/repo', got: ${repo}`);
    }

    console.log(`Searching for database artifact: ${this.artifactName}`);
    console.log(`Target branch: ${this.branchFilter}`);
    console.log(`Database path: ${this.databasePath}`);

    const downloaded = await this.tryDownloadLatestArtifact(token, repo);

    if (!downloaded) {
      console.log("No previous artifact found, creating new database...");
      this.firstRun = true;
      await this.createNewDatabase();
    } else {
      this.firstRun = false;
    }

    this.configureConnection();
    this.initialized = true;

    if (!this.db) {
      throw new Error("Database initialization failed");
    }
    return this.db;
  }

  async persist(): Promise<void> {
    if (!this.initialized || !this.db) {
      throw new Error("Storage provider not initialized");
    }

    this.db.close();
    this.db = null;

    await this.uploadArtifact();

    this.configureConnection();
  }

  async cleanup(): Promise<void> {
    try {
      if (this.db) {
        this.db.close();
        this.db = null;
      }
      this.initialized = false;
    } catch {
      // Ignore cleanup errors
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getDb(): Database {
    if (!this.db) throw new Error("Database not initialized");
    return this.db;
  }

  getArtifactName(): string {
    return this.artifactName;
  }

  getBranchFilter(): string {
    return this.branchFilter;
  }

  getDatabasePath(): string {
    return this.databasePath;
  }

  getSourceRunId(): number | undefined {
    return this.sourceRunId;
  }

  isFirstRun(): boolean {
    return this.firstRun;
  }

  private async tryDownloadLatestArtifact(token: string, repo: string): Promise<boolean> {
    const artifact = await this.findLatestArtifactByName(token, repo);

    if (!artifact) {
      console.log(`No '${this.artifactName}' artifact found for branch '${this.branchFilter}'`);
      return false;
    }

    console.log(`Found artifact: ${artifact.id} (from run ${artifact.workflow_run?.id})`);

    const downloadSuccess = await this.downloadArtifact(token, repo, artifact.id);

    if (downloadSuccess) {
      this.sourceRunId = artifact.workflow_run?.id;
      console.log(`Successfully downloaded database to: ${this.databasePath}`);
      return true;
    }

    return false;
  }

  private async findLatestArtifactByName(token: string, repo: string): Promise<Artifact | null> {
    try {
      const [owner, repoName] = repo.split("/");

      if (!owner || !repoName) {
        throw new Error(`Invalid repository format: ${repo}`);
      }

      // Search artifacts directly by name - this works across all workflows
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/actions/artifacts?name=${encodeURIComponent(this.artifactName)}&per_page=100`,
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to list artifacts: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as { artifacts: Artifact[] };
      const artifacts = data.artifacts || [];

      // Filter by branch if specified, then return the most recent (first in list)
      const matchingArtifacts = artifacts.filter(
        (artifact) => artifact.workflow_run?.head_branch === this.branchFilter
      );

      if (matchingArtifacts.length === 0) {
        return null;
      }

      // Artifacts are returned sorted by created_at desc, so first match is most recent
      return matchingArtifacts[0] ?? null;
    } catch (error) {
      console.warn(`Error finding artifacts: ${error}`);
      return null;
    }
  }

  private async downloadArtifact(
    token: string,
    repo: string,
    artifactId: number
  ): Promise<boolean> {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${repo}/actions/artifacts/${artifactId}/zip`,
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to download artifact: ${response.status} ${response.statusText}`);
      }

      const zipBuffer = await response.arrayBuffer();
      const tempZipPath = `${this.databasePath}.tmp.zip`;

      await fs.writeFile(tempZipPath, new Uint8Array(zipBuffer));

      const dbDir = dirname(this.databasePath);

      await fs.mkdir(dbDir, { recursive: true });

      try {
        const result = spawnSync("unzip", ["-o", tempZipPath, "-d", dbDir], {
          stdio: "pipe",
        });

        if (result.status !== 0) {
          throw new Error(
            `Unzip failed: ${result.stderr?.toString() || result.error?.message || "unknown error"}`
          );
        }

        await fs.access(this.databasePath);

        await fs.unlink(tempZipPath);

        return true;
      } catch (extractError) {
        console.warn(`Failed to extract zip: ${extractError}`);
        try {
          await fs.unlink(tempZipPath);
        } catch {
          // Ignore cleanup errors
        }
        return false;
      }
    } catch (error) {
      console.warn(`Error downloading artifact: ${error}`);
      return false;
    }
  }

  private async uploadArtifact(): Promise<void> {
    // Verify the database file exists before the workflow step uploads it
    const dbFile = Bun.file(this.databasePath);
    if (!(await dbFile.exists())) {
      throw new Error(`Database file not found: ${this.databasePath}`);
    }

    // Note: GitHub's REST API does not support direct artifact uploads.
    // Artifact upload must be done via @actions/artifact package or actions/upload-artifact action.
    // The workflow is configured to use actions/upload-artifact after this action completes.
    // See: .github/workflows/metrics.yml and .github/workflows/test-artifact-storage.yml
    console.log(`Database prepared for artifact upload at: ${this.databasePath}`);
  }

  private async createNewDatabase(): Promise<void> {
    const dbDir = dirname(this.databasePath);
    await fs.mkdir(dbDir, { recursive: true });

    const db = new Database(this.databasePath, { create: true });
    db.close();
  }

  private configureConnection(): void {
    this.db = new Database(this.databasePath, { create: true });
    this.db.run("PRAGMA journal_mode = WAL");
    this.db.run("PRAGMA synchronous = NORMAL");
    this.db.run("PRAGMA foreign_keys = ON");
    this.db.run("PRAGMA busy_timeout = 5000");
    this.db.run("PRAGMA cache_size = -2000");
    this.db.run("PRAGMA temp_store = MEMORY");
  }
}
