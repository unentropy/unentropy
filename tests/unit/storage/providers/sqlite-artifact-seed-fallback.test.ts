import { describe, test, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import { rm } from "fs/promises";
import { SqliteArtifactStorageProvider } from "../../../../src/storage/providers/sqlite-artifact";
import type { SqliteArtifactConfig } from "../../../../src/storage/providers/interface";

interface FakeArtifact {
  id: number;
  name: string;
  workflow_run: { id: number; head_branch: string };
}

const createMockFetch = (
  handler: (url: string, options?: RequestInit) => Promise<Response>
): typeof fetch => {
  const mockFn = mock(handler) as unknown as typeof fetch;
  return mockFn;
};

function fakeArtifactListResponse(artifacts: FakeArtifact[]): Response {
  return new Response(JSON.stringify({ artifacts }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("SqliteArtifactStorageProvider — seed fallback search", () => {
  const originalFetch = global.fetch;
  const dbPath = `/tmp/seed-fallback-${Date.now()}.db`;
  const config: SqliteArtifactConfig = {
    type: "sqlite-artifact",
    artifactName: "unentropy-metrics",
    branchFilter: "main",
    databasePath: dbPath,
    token: "test-token",
    repository: "owner/repo",
  };
  let provider: SqliteArtifactStorageProvider;
  let consoleLogSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    consoleLogSpy = spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(async () => {
    global.fetch = originalFetch;
    consoleLogSpy.mockRestore();
    if (provider) {
      try {
        await provider.cleanup();
      } catch {
        // ignore
      }
    }
    await rm(dbPath, { force: true });
  });

  test("no artifacts anywhere → first-run path (creates new DB, no fallback log)", async () => {
    global.fetch = createMockFetch(async (url: string) => {
      if (url.includes("/actions/artifacts")) {
        return fakeArtifactListResponse([]);
      }
      return new Response("Not found", { status: 404 });
    });

    provider = new SqliteArtifactStorageProvider(config);
    await provider.initialize();

    expect(provider.isFirstRun()).toBe(true);
    const logs = consoleLogSpy.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(logs.some((l: string) => l.includes("using seed from"))).toBe(false);
  });

  test("artifact only on a non-canonical branch → fallback fires and is logged", async () => {
    global.fetch = createMockFetch(async (url: string) => {
      if (url.includes("/actions/artifacts/12345/zip")) {
        return new Response("Not found", { status: 404 });
      }
      if (url.includes("/actions/artifacts")) {
        return fakeArtifactListResponse([
          {
            id: 12345,
            name: "unentropy-metrics",
            workflow_run: { id: 99, head_branch: "unentropy-import-20240515" },
          },
        ]);
      }
      return new Response("Not found", { status: 404 });
    });

    provider = new SqliteArtifactStorageProvider(config);
    await provider.initialize();

    const logs = consoleLogSpy.mock.calls.map((c: unknown[]) => String(c[0]));
    const fallbackLogged = logs.some(
      (l: string) =>
        l.includes("No 'unentropy-metrics' artifact on 'main'") &&
        l.includes("unentropy-import-20240515") &&
        l.includes("run 99")
    );
    expect(fallbackLogged).toBe(true);
  });

  test("canonical-branch artifact wins; older non-canonical seed ignored, no fallback log", async () => {
    global.fetch = createMockFetch(async (url: string) => {
      if (url.includes("/actions/artifacts/99999/zip")) {
        return new Response("Not found", { status: 404 });
      }
      if (url.includes("/actions/artifacts")) {
        return fakeArtifactListResponse([
          {
            id: 99999,
            name: "unentropy-metrics",
            workflow_run: { id: 7, head_branch: "main" },
          },
          {
            id: 12345,
            name: "unentropy-metrics",
            workflow_run: { id: 99, head_branch: "unentropy-import-20240515" },
          },
        ]);
      }
      return new Response("Not found", { status: 404 });
    });

    provider = new SqliteArtifactStorageProvider(config);
    await provider.initialize();

    const logs = consoleLogSpy.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(logs.some((l: string) => l.includes("using seed from"))).toBe(false);
  });
});
