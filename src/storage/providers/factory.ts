import type { StorageProvider, StorageProviderConfig } from "./interface";
import { SqliteLocalStorageProvider } from "./sqlite-local";
import { SqliteS3StorageProvider } from "./sqlite-s3";
import { SqliteArtifactStorageProvider } from "./sqlite-artifact";

export function createStorageProvider(config: StorageProviderConfig): StorageProvider {
  const { type } = config;

  if (type === "sqlite-local") {
    const finalConfig = {
      ...config,
      path: config.path ?? "unentropy.db",
      readonly: config.readonly ?? false,
      timeout: config.timeout ?? 30000,
    };
    return new SqliteLocalStorageProvider(finalConfig);
  }

  if (type === "sqlite-artifact") {
    return new SqliteArtifactStorageProvider(config);
  }

  if (type === "sqlite-s3") {
    return new SqliteS3StorageProvider(config);
  }

  throw new Error(
    `Storage provider type '${type}' is not yet implemented. ` +
      `Currently supported: 'sqlite-local', 'sqlite-artifact', 'sqlite-s3'`
  );
}
