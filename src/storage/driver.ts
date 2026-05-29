/* eslint-disable @typescript-eslint/no-explicit-any */

export interface SqliteStatement {
  get(...params: any[]): Record<string, unknown> | undefined;
  all(...params: any[]): Record<string, unknown>[];
  run(...params: any[]): { changes: number; lastInsertRowid: number | bigint };
}

export interface SqliteDatabase {
  prepare(sql: string): SqliteStatement;
  exec(sql: string): void;
  close(): void;
  readonly $raw: any;
}

export type SqliteDatabaseConstructor = new (
  path: string,
  options?: { readonly?: boolean }
) => SqliteDatabase;

function isBun(): boolean {
  return typeof Bun !== "undefined" && typeof Bun.version === "string";
}

function wrapBunStatement(stmt: {
  get(...args: any[]): any;
  all(...args: any[]): any[];
  run(...args: any[]): { changes?: number; lastInsertRowid?: number | bigint };
}): SqliteStatement {
  return {
    get: (...params: any[]) => {
      const r = stmt.get(...params);
      return r === null ? undefined : r;
    },
    all: (...params: any[]) => stmt.all(...params) as any[],
    run: (...params: any[]) => {
      const r = stmt.run(...params);
      return { changes: r?.changes ?? 0, lastInsertRowid: r?.lastInsertRowid ?? 0 };
    },
  };
}

async function createBunDatabase(
  path: string,
  options?: { readonly?: boolean }
): Promise<SqliteDatabase> {
  const { Database } = await import("bun:sqlite");
  const raw = new Database(path, { create: true, readonly: options?.readonly ?? false });
  return {
    get $raw() {
      return raw;
    },
    prepare(sql: string) {
      return wrapBunStatement(raw.query(sql));
    },
    exec(sql: string) {
      raw.exec(sql);
    },
    close() {
      raw.close();
    },
  };
}

async function createNodeDatabase(
  path: string,
  options?: { readonly?: boolean }
): Promise<SqliteDatabase> {
  const { DatabaseSync } = await import("node:sqlite");
  const raw = new DatabaseSync(path, { readOnly: options?.readonly ?? false });
  return {
    get $raw() {
      return raw;
    },
    prepare(sql: string) {
      const stmt = raw.prepare(sql);
      return {
        get: (...params: any[]) => {
          const r = stmt.get(...params);
          return r === undefined ? undefined : r;
        },
        all: (...params: any[]) => stmt.all(...params) as any[],
        run: (...params: any[]) =>
          stmt.run(...params) as { changes: number; lastInsertRowid: number | bigint },
      };
    },
    exec(sql: string) {
      raw.exec(sql);
    },
    close() {
      raw.close();
    },
  };
}

export async function createDatabase(
  path: string,
  options?: { readonly?: boolean }
): Promise<SqliteDatabase> {
  if (isBun()) return createBunDatabase(path, options);
  return createNodeDatabase(path, options);
}

export async function createRawClient(
  path: string,
  options?: { readonly?: boolean }
): Promise<any> {
  if (isBun()) {
    const { Database } = await import("bun:sqlite");
    return new Database(path, { create: true, readonly: options?.readonly ?? false });
  }
  const { DatabaseSync } = await import("node:sqlite");
  return new DatabaseSync(path, { readOnly: options?.readonly ?? false });
}

export async function initDrizzle(client: any, schema: any): Promise<any> {
  if (isBun()) {
    const { drizzle } = await import("drizzle-orm/bun-sqlite");
    return drizzle({ client, schema });
  }
  const { drizzle } = await import("drizzle-orm/node-sqlite");
  return drizzle({ client, schema });
}
