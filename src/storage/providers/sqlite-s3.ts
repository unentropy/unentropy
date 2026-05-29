import { createDatabase } from "../driver";
import type { SqliteDatabase } from "../driver";
import { S3Client } from "bun";
import type { StorageProvider, SqliteS3Config } from "./interface";

export class SqliteS3StorageProvider implements StorageProvider {
  private db: SqliteDatabase | null = null;
  private initialized = false;
  private s3Client: S3Client | null = null;
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

      await Bun.file(this.tempDbPath).delete();

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

    this.s3Client = new S3Client({
      accessKeyId: this.config.accessKeyId,
      secretAccessKey: this.config.secretAccessKey,
      bucket: this.config.bucket,
      endpoint: this.config.endpoint,
      region: this.config.region,
    });
  }

  private async downloadOrCreateDatabase(): Promise<void> {
    const databaseKey = this.getDatabaseKey();

    try {
      if (!this.s3Client) {
        throw new Error("S3 client not initialized");
      }
      const s3File = this.s3Client.file(databaseKey);
      if (await s3File.exists()) {
        const databaseData = await s3File.arrayBuffer();
        await Bun.write(this.tempDbPath, databaseData);
        console.log(
          `Database downloaded from S3: ${databaseKey} and stored at ${this.tempDbPath}. Size: ${databaseData.byteLength} bytes`
        );
        return;
      }
    } catch (error) {
      console.log(`Database not found in S3, creating new database: ${error}`);
    }

    console.log("No existing database found, creating new database...");
    const newDb = await createDatabase(this.tempDbPath);
    newDb.close();
  }

  private async uploadDatabase(): Promise<void> {
    const databaseKey = this.getDatabaseKey();
    const databaseData = await Bun.file(this.tempDbPath).arrayBuffer();

    if (!this.s3Client) {
      throw new Error("S3 client not initialized");
    }
    const bytesWritten = await this.s3Client.write(databaseKey, databaseData);
    console.log(`Database uploaded successfully: ${bytesWritten} bytes written`);
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

  getS3Client() {
    return this.s3Client;
  }

  getTempDbPath(): string {
    return this.tempDbPath;
  }

  getDb(): SqliteDatabase {
    if (!this.db) throw new Error("Database not initialized");
    return this.db;
  }
}
