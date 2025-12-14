import type { Database } from "bun:sqlite";
import { drizzle, type BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import type { StorageProvider, StorageProviderConfig } from "./providers/interface";
import { createStorageProvider } from "./providers/factory";
import { MetricsRepository } from "./repository";
import { initializeSchema } from "./migrations";
import * as schema from "./schema";

export class Storage {
  private readonly provider: StorageProvider;
  private readonly initPromise: Promise<void>;
  private drizzleDb: BunSQLiteDatabase<typeof schema> | null = null;
  private repository: MetricsRepository | null = null;

  constructor(private config: StorageProviderConfig) {
    this.provider = createStorageProvider(this.config);
    this.initPromise = this.initialize();
  }

  async initialize(): Promise<void> {
    await this.provider.initialize();
    initializeSchema(this);

    const rawDb = this.provider.getDb();
    this.drizzleDb = drizzle(rawDb, { schema });
    this.repository = new MetricsRepository(this.drizzleDb);
  }

  async ready(): Promise<void> {
    await this.initPromise;
  }

  getConnection(): Database {
    return this.provider?.getDb();
  }

  getDrizzle(): BunSQLiteDatabase<typeof schema> {
    if (!this.drizzleDb) throw new Error("Database not initialized");
    return this.drizzleDb;
  }

  getRepository(): MetricsRepository {
    if (!this.repository) throw new Error("Database not initialized");
    return this.repository;
  }

  async persist(): Promise<void> {
    await this.provider.persist();
  }

  async close(): Promise<void> {
    await this.provider.cleanup();
  }

  getProvider(): StorageProvider {
    return this.provider;
  }

  getConfig(): StorageProviderConfig {
    return this.config;
  }
}
