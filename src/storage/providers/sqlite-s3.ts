import { AwsClient } from "aws4fetch";
import { readFile, writeFile, rm } from "node:fs/promises";
import { createDatabase } from "../driver";
import type { SqliteDatabase } from "../driver";
import type { StorageProvider, SqliteS3Config } from "./interface";

export class S3RequestError extends Error {
  constructor(
    readonly operation: "GET" | "PUT" | "HEAD",
    readonly status: number | undefined,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "S3RequestError";
  }
}

export class SqliteS3StorageProvider implements StorageProvider {
  private db: SqliteDatabase | null = null;
  private initialized = false;
  private client: AwsClient | null = null;
  private tempDbPath: string;
  private config: SqliteS3Config;

  constructor(config: SqliteS3Config) {
    this.config = config;
    this.tempDbPath = `/tmp/unentropy-s3-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.db`;
  }

  async initialize(): Promise<SqliteDatabase> {
    console.log("Initializing SQLite S3 storage provider...");
    if (this.initialized && this.db) {
      return this.db;
    }

    console.log("Generating temp path:", this.tempDbPath);
    this.tempDbPath = `/tmp/unentropy-s3-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.db`;
    await this.initializeS3Client();
    await this.downloadOrCreateDatabase();

    const db = this.configureConnection();

    this.initialized = true;
    return db;
  }

  async persist(): Promise<void> {
    if (!this.initialized || !this.db) {
      throw new Error("Storage provider not initialized");
    }

    this.db.close();

    await this.uploadDatabase();

    await this.configureConnection();
  }

  async cleanup(): Promise<void> {
    try {
      if (this.db) {
        this.db.close();
        this.db = null;
      }

      await rm(this.tempDbPath, { force: true });

      this.initialized = false;
    } catch {}
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  private async initializeS3Client(): Promise<void> {
    if (!this.config.endpoint || !this.config.accessKeyId || !this.config.secretAccessKey) {
      throw new Error(
        "S3 configuration is incomplete: endpoint, accessKeyId, and secretAccessKey are required"
      );
    }

    if (!this.config.bucket) {
      throw new Error("S3 configuration is incomplete: bucket is required");
    }

    this.client = new AwsClient({
      accessKeyId: this.config.accessKeyId,
      secretAccessKey: this.config.secretAccessKey,
      service: "s3",
      region: this.config.region || undefined,
      retries: 2,
    });
  }

  private objectUrl(key: string): string {
    const endpoint = (this.config.endpoint ?? "").replace(/\/+$/, "");
    const encodedKey = key.split("/").map(encodeURIComponent).join("/");
    return `${endpoint}/${this.config.bucket}/${encodedKey}`;
  }

  private getClient(): AwsClient {
    if (!this.client) {
      throw new Error("S3 client not initialized");
    }
    return this.client;
  }

  private async request(
    operation: S3RequestError["operation"],
    key: string,
    init: RequestInit = {}
  ): Promise<Response> {
    const client = this.getClient();
    try {
      return await client.fetch(this.objectUrl(key), { ...init, method: operation });
    } catch (error) {
      throw new S3RequestError(
        operation,
        undefined,
        `S3 ${operation} request failed for ${key}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error }
      );
    }
  }

  async objectExists(key: string): Promise<boolean> {
    const res = await this.request("HEAD", key);
    if (res.status === 200) {
      return true;
    }
    if (res.status === 404) {
      return false;
    }
    throw new S3RequestError("HEAD", res.status, `S3 HEAD failed for ${key}: ${res.status}`);
  }

  private async downloadOrCreateDatabase(): Promise<void> {
    const databaseKey = this.getDatabaseKey();

    const res = await this.request("GET", databaseKey);

    if (res.ok) {
      const databaseData = new Uint8Array(await res.arrayBuffer());
      await writeFile(this.tempDbPath, databaseData);
      console.log(
        `Database downloaded from S3: ${databaseKey} and stored at ${this.tempDbPath}. Size: ${databaseData.byteLength} bytes`
      );
      return;
    }

    if (res.status !== 404) {
      await res.body?.cancel();
      throw new S3RequestError(
        "GET",
        res.status,
        `S3 download failed for ${databaseKey}: ${res.status}`
      );
    }

    await res.body?.cancel();
    console.log("No existing database found, creating new database...");
    const newDb = await createDatabase(this.tempDbPath);
    newDb.close();
  }

  private async uploadDatabase(): Promise<void> {
    const databaseKey = this.getDatabaseKey();
    const body = await readFile(this.tempDbPath);

    const res = await this.request("PUT", databaseKey, { body });
    if (!res.ok) {
      await res.body?.cancel();
      throw new S3RequestError("PUT", res.status, `S3 upload failed: ${res.status}`);
    }
    console.log(`Database uploaded successfully: ${body.byteLength} bytes written`);
  }

  getDatabaseKey(): string {
    return this.config.databaseKey || "unentropy.db";
  }

  private async configureConnection(): Promise<SqliteDatabase> {
    this.db = await createDatabase(this.tempDbPath);
    this.db.exec("PRAGMA journal_mode = DELETE");
    this.db.exec("PRAGMA synchronous = NORMAL");
    this.db.exec("PRAGMA foreign_keys = ON");
    this.db.exec("PRAGMA busy_timeout = 5000");
    this.db.exec("PRAGMA cache_size = -2000");
    this.db.exec("PRAGMA temp_store = MEMORY");

    return this.db;
  }

  getTempDbPath(): string {
    return this.tempDbPath;
  }

  getDb(): SqliteDatabase {
    if (!this.db) throw new Error("Database not initialized");
    return this.db;
  }
}
