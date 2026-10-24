import { dirname } from "path";
import { DefaultArtifactClient, ArtifactNotFoundError } from "@actions/artifact";

export interface ArtifactUploader {
  deleteArtifact(name: string): Promise<unknown>;
  uploadArtifact(
    name: string,
    files: string[],
    rootDirectory: string
  ): Promise<{ id?: number; size?: number }>;
}

export async function uploadDatabaseArtifact(
  name: string,
  databasePath: string,
  client: ArtifactUploader = new DefaultArtifactClient()
): Promise<{ id?: number; size?: number }> {
  try {
    await client.deleteArtifact(name);
  } catch (error) {
    if (!(error instanceof ArtifactNotFoundError)) {
      throw error;
    }
  }

  const { id, size } = await client.uploadArtifact(name, [databasePath], dirname(databasePath));
  return { id, size };
}
