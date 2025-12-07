import { Database } from "bun:sqlite";
import type { StorageProvider, SqliteLocalConfig } from "./interface";

export class SqliteLocalStorageProvider implements StorageProvider {
  private db: Database | null = null;

  constructor(private config: SqliteLocalConfig) {}

  async initialize(): Promise<Database> {
    if (this.db) return this.db;

    this.db = new Database(this.config.path, {
      readonly: this.config.readonly ?? false,
      create: true,
    });

    this.configureConnection();

    return this.db;
  }

  private configureConnection(): void {
    if (!this.db) throw new Error("Database not initialized");

    // Configure SQLite using PRAGMA statements
    this.db.run("PRAGMA journal_mode = WAL");
    this.db.run("PRAGMA synchronous = NORMAL");
    this.db.run("PRAGMA foreign_keys = ON");
    this.db.run("PRAGMA busy_timeout = 5000");
    this.db.run("PRAGMA cache_size = -2000");
    this.db.run("PRAGMA temp_store = MEMORY");
  }

  async persist(): Promise<void> {
    // No-op for local storage (writes are immediate to disk)
  }

  async cleanup(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  isInitialized(): boolean {
    return this.db !== null;
  }

  getDb(): Database {
    if (!this.db) throw new Error("Database not initialized");
    return this.db;
  }

  getDatabasePath(): string {
    return this.config.path;
  }
}
