import type { Database } from "bun:sqlite";

export type StorageProviderType = "sqlite-local" | "sqlite-artifact" | "sqlite-s3" | "postgres";

export interface BaseStorageProviderConfig {
  type: StorageProviderType;
}

export interface SqliteLocalConfig extends BaseStorageProviderConfig {
  type: "sqlite-local";
  path: string;
  readonly?: boolean;
  timeout?: number;
}

export interface SqliteArtifactConfig extends BaseStorageProviderConfig {
  type: "sqlite-artifact";
  artifactName?: string;
  branchFilter?: string;
  databasePath?: string;
  token: string;
  repository: string;
}

export interface SqliteS3Config extends BaseStorageProviderConfig {
  type: "sqlite-s3";
  endpoint?: string;
  bucket?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  databaseKey?: string;
}

export type StorageProviderConfig = SqliteLocalConfig | SqliteArtifactConfig | SqliteS3Config;

export interface StorageProvider {
  initialize(): Promise<Database>;
  persist(): Promise<void>;
  cleanup(): Promise<void>;
  isInitialized(): boolean;
  getDb(): Database;
}
