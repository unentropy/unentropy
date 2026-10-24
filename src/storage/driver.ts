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
  return createNodeDatabase(path, options);
}

export async function createRawClient(
  path: string,
  options?: { readonly?: boolean }
): Promise<any> {
  const { DatabaseSync } = await import("node:sqlite");
  return new DatabaseSync(path, { readOnly: options?.readonly ?? false });
}

export async function initDrizzle(client: any, schema: any): Promise<any> {
  const { drizzle } = await import("drizzle-orm/node-sqlite");
  return drizzle({ client, schema });
}
