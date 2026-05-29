import { initDrizzle } from "./driver";
import type { SqliteDatabase } from "./driver";
import type { StorageProvider } from "./providers/interface";
import { MetricsRepository } from "./repository";
import { initializeSchema } from "./migrations";
import * as schema from "./schema";

export class Storage {
  private readonly provider: StorageProvider;
  private readonly initPromise: Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private drizzleDb: any = null;
  private repository: MetricsRepository | null = null;

  constructor(provider: StorageProvider) {
    this.provider = provider;
    this.initPromise = this.initialize();
  }

  async initialize(): Promise<void> {
    await this.provider.initialize();
    initializeSchema(this);

    const rawDb = this.provider.getDb();
    this.drizzleDb = await initDrizzle(rawDb.$raw, schema);
    this.repository = new MetricsRepository(this.drizzleDb);
  }

  async ready(): Promise<void> {
    await this.initPromise;
  }

  getConnection(): SqliteDatabase {
    return this.provider?.getDb();
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
}
