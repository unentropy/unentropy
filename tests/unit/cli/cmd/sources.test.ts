import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";

async function createFixture() {
  const dir = await fs.mkdtemp(join(tmpdir(), "unentropy-sources-test-"));
  await fs.mkdir(join(dir, "src"));
  await fs.mkdir(join(dir, "src", "cli"));
  await fs.mkdir(join(dir, "src", "generated"));

  await fs.writeFile(join(dir, "src", "index.ts"), "export const foo = 1;\n");
  await fs.writeFile(join(dir, "src", "cli", "main.ts"), 'console.log("hello");\n');
  await fs.writeFile(join(dir, "src", "generated", "types.ts"), "// auto-generated\n");

  await fs.writeFile(
    join(dir, "unentropy.json"),
    JSON.stringify({
      metrics: {
        loc: { type: "numeric", command: "echo 42" },
      },
      sources: ["src", "!src/generated"],
    })
  );

  return dir;
}

async function capture<T>(fn: () => T): Promise<{ stdout: string[]; stderr: string[] }> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const origLog = console.log;
  const origErr = console.error;
  const origExit = process.exit;

  console.log = (...args: unknown[]) => stdout.push(args.join(" "));
  console.error = (...args: unknown[]) => stderr.push(args.join(" "));
  (process.exit as unknown) = ((_code?: number) => {
    throw new Error(`EXIT:${_code ?? 0}`);
  }) as never;

  try {
    await fn();
  } catch {
    // swallow process.exit
  }

  console.log = origLog;
  console.error = origErr;
  process.exit = origExit;

  return { stdout, stderr };
}

describe("SourcesCommand", () => {
  let fixtureDir: string;

  beforeAll(async () => {
    fixtureDir = await createFixture();
  });

  afterAll(async () => {
    try {
      await fs.rm(fixtureDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  async function callHandler(args: {
    config: string;
    absolute: boolean;
    loc: boolean;
    sort: string;
  }) {
    const { SourcesCommand } = await import("../../../../src/cli/cmd/sources");
    return capture(() =>
      (SourcesCommand.handler as (args: Record<string, unknown>) => void | Promise<void>)({
        _: [],
        $0: "",
        ...args,
      })
    );
  }

  it("should list files in sources scope", async () => {
    const { stdout, stderr } = await callHandler({
      config: join(fixtureDir, "unentropy.json"),
      absolute: false,
      loc: false,
      sort: "name",
    });

    expect(stderr).toEqual([]);
    expect(stdout).toHaveLength(2);
    expect(stdout[0]).toMatch(/^src\//);
    expect(stdout[1]).toMatch(/^src\//);
    expect(stdout.join("\n")).not.toContain("generated");
  });

  it("should exclude negated patterns", async () => {
    const { stdout } = await callHandler({
      config: join(fixtureDir, "unentropy.json"),
      absolute: false,
      loc: false,
      sort: "name",
    });

    for (const line of stdout) {
      expect(line).not.toMatch(/generated/);
    }
  });

  it("should show LOC with --loc flag", async () => {
    const { stdout, stderr } = await callHandler({
      config: join(fixtureDir, "unentropy.json"),
      absolute: false,
      loc: true,
      sort: "name",
    });

    expect(stderr).toEqual([]);
    expect(stdout[0]).toMatch(/^Path\s+LOC$/);
    expect(stdout[stdout.length - 1]).toMatch(/file\(s\).*LOC/);
  });

  it("should sort by LOC with --sort loc", async () => {
    const { stdout, stderr } = await callHandler({
      config: join(fixtureDir, "unentropy.json"),
      absolute: false,
      loc: true,
      sort: "loc",
    });

    expect(stderr).toEqual([]);
    expect(stdout[0]).toMatch(/^Path\s+LOC$/);
    expect(stdout[stdout.length - 1]).toMatch(/file\(s\).*LOC/);
    // Second line should have LOC <= third line LOC
    const locs = stdout
      .slice(1, -2)
      .map((line) => parseInt(line.trim().split(/\s+/).pop() ?? "0", 10));
    for (let i = 1; i < locs.length; i++) {
      const curr = locs[i];
      const prev = locs[i - 1];
      if (curr !== undefined && prev !== undefined) {
        expect(curr).toBeGreaterThanOrEqual(prev);
      }
    }
  });

  it("should error on --sort loc without --loc", async () => {
    const { stderr } = await callHandler({
      config: join(fixtureDir, "unentropy.json"),
      absolute: false,
      loc: false,
      sort: "loc",
    });

    expect(stderr.join("\n")).toContain("--sort loc requires --loc");
  });

  it("should print absolute paths with --absolute", async () => {
    const { stdout, stderr } = await callHandler({
      config: join(fixtureDir, "unentropy.json"),
      absolute: true,
      loc: false,
      sort: "name",
    });

    expect(stderr).toEqual([]);
    for (const line of stdout) {
      expect(line).toStartWith("/");
    }
  });

  it("should error when config file not found", async () => {
    const { stderr } = await callHandler({
      config: join(fixtureDir, "nonexistent.json"),
      absolute: false,
      loc: false,
      sort: "name",
    });

    expect(stderr.join("\n")).toContain("Config file not found");
  });

  it("should error when no sources configured", async () => {
    const noSourcesDir = await fs.mkdtemp(join(tmpdir(), "unentropy-no-sources-"));
    await fs.writeFile(
      join(noSourcesDir, "unentropy.json"),
      JSON.stringify({
        metrics: {
          loc: { type: "numeric", command: "echo 42" },
        },
      })
    );

    const { stderr } = await callHandler({
      config: join(noSourcesDir, "unentropy.json"),
      absolute: false,
      loc: false,
      sort: "name",
    });

    expect(stderr.join("\n")).toContain("No sources configured");

    await fs.rm(noSourcesDir, { recursive: true, force: true });
  });
});
