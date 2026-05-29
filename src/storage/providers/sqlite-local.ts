import { createDatabase } from "../driver";
import type { SqliteDatabase } from "../driver";
import type { StorageProvider, SqliteLocalConfig } from "./interface";

export class SqliteLocalStorageProvider implements StorageProvider {
  private db: SqliteDatabase | null = null;

  constructor(private config: SqliteLocalConfig) {}

  async initialize(): Promise<SqliteDatabase> {
    if (this.db) return this.db;

    this.db = await createDatabase(this.config.path, {
      readonly: this.config.readonly ?? false,
    });

    this.configureConnection();

    return this.db;
  }

  private configureConnection(): void {
    if (!this.db) throw new Error("Database not initialized");

    this.db.exec("PRAGMA journal_mode = DELETE");
    this.db.exec("PRAGMA synchronous = NORMAL");
    this.db.exec("PRAGMA foreign_keys = ON");
    this.db.exec("PRAGMA busy_timeout = 5000");
    this.db.exec("PRAGMA cache_size = -2000");
    this.db.exec("PRAGMA temp_store = MEMORY");
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

  getDb(): SqliteDatabase {
    if (!this.db) throw new Error("Database not initialized");
    return this.db;
  }
}
