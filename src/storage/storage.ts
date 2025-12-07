import type { Database } from "bun:sqlite";
import type { StorageProvider, StorageProviderConfig } from "./providers/interface";
import { createStorageProvider } from "./providers/factory";
import { SqliteDatabaseAdapter } from "./adapters/sqlite";
import { MetricsRepository } from "./repository";
import { initializeSchema } from "./migrations";

export class Storage {
  private readonly provider: StorageProvider;
  private readonly initPromise: Promise<void>;
  private adapter: SqliteDatabaseAdapter | null = null;
  private repository: MetricsRepository | null = null;

  constructor(private config: StorageProviderConfig) {
    this.provider = createStorageProvider(this.config);
    this.initPromise = this.initialize();
  }

  async initialize(): Promise<void> {
    await this.provider.initialize();
    initializeSchema(this);

    // Create adapter and repository (three-layer architecture)
    this.adapter = new SqliteDatabaseAdapter(this.provider.getDb());
    this.repository = new MetricsRepository(this.adapter);
  }

  async ready(): Promise<void> {
    await this.initPromise;
  }

  getConnection(): Database {
    return this.provider?.getDb();
  }

  /**
   * Get the repository for domain operations.
   * This is the recommended API for application code.
   */
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

  /**
   * Get the storage provider for provider-specific operations.
   */
  getProvider(): StorageProvider {
    return this.provider;
  }

  /**
   * Get the storage configuration.
   */
  getConfig(): StorageProviderConfig {
    return this.config;
  }
}
