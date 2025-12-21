import { Database } from "bun:sqlite";
import { S3Client } from "bun";
import type { StorageProvider, SqliteS3Config } from "./interface";

/**
 * S3-compatible storage provider for SQLite databases
 *
 * Downloads database from S3 on initialization, uploads on persist.
 * Uses temporary local storage for SQLite operations.
 */
export class SqliteS3StorageProvider implements StorageProvider {
  private db: Database | null = null;
  private initialized = false;
  private s3Client: S3Client | null = null;
  private tempDbPath: string;
  private config: SqliteS3Config;

  constructor(config: SqliteS3Config) {
    this.config = config;
    this.tempDbPath = `/tmp/unentropy-s3-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.db`;
  }

  async initialize(): Promise<Database> {
    console.log("Initializing SQLite S3 storage provider...");
    if (this.initialized && this.db) {
      return this.db;
    }

    // Generate fresh temp path for each initialization to avoid conflicts
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

    this.configureConnection();
  }

  async cleanup(): Promise<void> {
    try {
      if (this.db) {
        this.db.close();
        this.db = null;
      }

      await Bun.file(this.tempDbPath).delete();

      this.initialized = false;
    } catch {
      // Ignore cleanup errors
    }
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
      // Try to download existing database
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
      // Database doesn't exist or download failed, create new one
      console.log(`Database not found in S3, creating new database: ${error}`);
    }

    // Create new empty database
    console.log("No existing database found, creating new database...");
    const newDb = new Database(this.tempDbPath, { create: true });
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
    // Use a default database key or allow custom key via config
    return this.config.databaseKey || "unentropy.db";
  }

  private configureConnection(): Database {
    this.db = new Database(this.tempDbPath, { create: true });
    // Configure SQLite for single-file storage (no WAL files to manage)
    this.db.run("PRAGMA journal_mode = DELETE");
    this.db.run("PRAGMA synchronous = NORMAL");
    this.db.run("PRAGMA foreign_keys = ON");
    this.db.run("PRAGMA busy_timeout = 5000");
    this.db.run("PRAGMA cache_size = -2000");
    this.db.run("PRAGMA temp_store = MEMORY");

    return this.db;
  }

  /**
   * Get S3 client for testing purposes
   */
  getS3Client() {
    return this.s3Client;
  }

  /**
   * Get temporary database path for testing
   */
  getTempDbPath(): string {
    return this.tempDbPath;
  }

  getDb(): Database {
    if (!this.db) throw new Error("Database not initialized");
    return this.db;
  }
}
