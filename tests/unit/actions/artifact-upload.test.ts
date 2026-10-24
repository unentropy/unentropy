import { describe, it, expect, vi } from "vitest";
import { ArtifactNotFoundError } from "@actions/artifact";
import {
  uploadDatabaseArtifact,
  type ArtifactUploader,
} from "../../../src/actions/artifact-upload";

function createClient(overrides: Partial<ArtifactUploader> = {}) {
  return {
    deleteArtifact: vi.fn<ArtifactUploader["deleteArtifact"]>().mockResolvedValue({ id: 1 }),
    uploadArtifact: vi
      .fn<ArtifactUploader["uploadArtifact"]>()
      .mockResolvedValue({ id: 42, size: 1024 }),
    ...overrides,
  };
}

describe("uploadDatabaseArtifact", () => {
  const databasePath = "/tmp/workspace/data/unentropy-metrics.db";

  it("deletes the existing artifact, then uploads the database from its directory", async () => {
    const client = createClient();

    const result = await uploadDatabaseArtifact("unentropy-metrics", databasePath, client);

    expect(client.deleteArtifact).toHaveBeenCalledWith("unentropy-metrics");
    expect(client.uploadArtifact).toHaveBeenCalledWith(
      "unentropy-metrics",
      [databasePath],
      "/tmp/workspace/data"
    );
    const [deleteOrder] = vi.mocked(client.deleteArtifact).mock.invocationCallOrder;
    const [uploadOrder] = vi.mocked(client.uploadArtifact).mock.invocationCallOrder;
    expect(deleteOrder).toBeLessThan(uploadOrder ?? 0);
    expect(result).toEqual({ id: 42, size: 1024 });
  });

  it("continues to upload when the artifact does not exist yet", async () => {
    const client = createClient({
      deleteArtifact: vi
        .fn<ArtifactUploader["deleteArtifact"]>()
        .mockRejectedValue(new ArtifactNotFoundError("Artifact not found for name: x")),
    });

    const result = await uploadDatabaseArtifact("unentropy-metrics", databasePath, client);

    expect(client.uploadArtifact).toHaveBeenCalledTimes(1);
    expect(result.id).toBe(42);
  });

  it("rethrows other delete errors without uploading", async () => {
    const client = createClient({
      deleteArtifact: vi
        .fn<ArtifactUploader["deleteArtifact"]>()
        .mockRejectedValue(new Error("Invalid response from GitHub API: 500")),
    });

    await expect(uploadDatabaseArtifact("unentropy-metrics", databasePath, client)).rejects.toThrow(
      "Invalid response from GitHub API: 500"
    );
    expect(client.uploadArtifact).not.toHaveBeenCalled();
  });

  it("rethrows upload errors", async () => {
    const client = createClient({
      uploadArtifact: vi
        .fn<ArtifactUploader["uploadArtifact"]>()
        .mockRejectedValue(new Error("Unable to get the ACTIONS_RUNTIME_TOKEN env variable")),
    });

    await expect(uploadDatabaseArtifact("unentropy-metrics", databasePath, client)).rejects.toThrow(
      "Unable to get the ACTIONS_RUNTIME_TOKEN env variable"
    );
  });

  it("returns an undefined id when the upload response has none", async () => {
    const client = createClient({
      uploadArtifact: vi.fn<ArtifactUploader["uploadArtifact"]>().mockResolvedValue({}),
    });

    const result = await uploadDatabaseArtifact("unentropy-metrics", databasePath, client);

    expect(result.id).toBeUndefined();
  });
});
