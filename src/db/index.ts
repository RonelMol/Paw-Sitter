import { drizzle } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "./schema.ts";
import path from "path";
import fs from "fs";

// Ensure persistent storage directory exists
const dataDir = path.resolve(process.cwd(), "data/postgres");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Clean up any stale postmaster.pid from an ungraceful crash or container restart
const pidFile = path.join(dataDir, "postmaster.pid");
if (fs.existsSync(pidFile)) {
  try {
    fs.unlinkSync(pidFile);
  } catch {}
}

declare global {
  var _pgliteInstance: PGlite | undefined;
  var _postgresPoolAdapter: PoolAdapter | undefined;
}

export const getPgLiteInstance = (): PGlite => {
  if (!global._pgliteInstance) {
    global._pgliteInstance = new PGlite(dataDir);
  }
  return global._pgliteInstance;
};

export const pglite = getPgLiteInstance();

export interface QueryResult<T = any> {
  rows: T[];
  fields: Array<{ name: string; dataTypeID: number }>;
  rowCount: number;
  affectedRows?: number;
  command: string;
}

export interface PoolClient {
  query<T = any>(textOrConfig: any, params?: any, callback?: any): Promise<QueryResult<T>>;
  release(): void;
  on?: (event: string, handler: any) => void;
}

export interface PoolAdapter {
  query<T = any>(textOrConfig: any, params?: any, callback?: any): Promise<QueryResult<T>>;
  connect(): Promise<PoolClient>;
  on(event: string, handler: (...args: any[]) => void): PoolAdapter;
  end(): Promise<void>;
  totalCount: number;
  idleCount: number;
  waitingCount: number;
}

/**
 * Robust drop-in Pool adapter that matches node-postgres (pg.Pool) API
 * and proxies directly to the persistent PGlite PostgreSQL WASM engine.
 * Seamlessly handles single queries, parameterized queries, and multi-statement DDL scripts.
 */
export const createPool = (): PoolAdapter => {
  if (!global._postgresPoolAdapter) {
    const pg = pglite;

    const queryFn = async <T = any>(textOrConfig: any, params?: any, callback?: any): Promise<QueryResult<T>> => {
      let sqlText: string;
      let values: any[] | undefined;
      const cb = typeof params === "function" ? params : callback;

      if (typeof textOrConfig === "string") {
        sqlText = textOrConfig;
        values = Array.isArray(params) ? params : undefined;
      } else if (textOrConfig && typeof textOrConfig.text === "string") {
        sqlText = textOrConfig.text;
        values = textOrConfig.values;
      } else {
        sqlText = String(textOrConfig);
      }

      // Intercept Cloud SQL role-switching commands
      const trimmed = sqlText.trim().toUpperCase();
      if (trimmed.startsWith("SET ROLE") || trimmed.startsWith("RESET ROLE")) {
        const dummyRes: QueryResult<T> = {
          rows: [],
          fields: [],
          rowCount: 0,
          affectedRows: 0,
          command: "SET"
        };
        if (cb) cb(null, dummyRes);
        return dummyRes;
      }

      // If query contains multiple statements and no parameters, use pg.exec
      if (!values || values.length === 0) {
        const statements = sqlText.trim().split(";").filter(s => s.trim().length > 0);
        if (statements.length > 1) {
          try {
            const execRes = await pg.exec(sqlText);
            const lastRes = execRes && execRes.length > 0 ? execRes[execRes.length - 1] : { rows: [], fields: [], rowCount: 0, command: "EXEC" };
            const normalizedRes: QueryResult<T> = {
              rows: (lastRes.rows as unknown as T[]) || [],
              fields: (lastRes.fields as any[]) || [],
              rowCount: (lastRes as any).affectedRows ?? (lastRes.rows ? lastRes.rows.length : 0),
              affectedRows: (lastRes as any).affectedRows ?? 0,
              command: (lastRes as any).command || "EXEC"
            };
            if (cb) cb(null, normalizedRes);
            return normalizedRes;
          } catch (err: any) {
            if (cb) {
              cb(err);
              return { rows: [], fields: [], rowCount: 0, command: "ERROR" };
            }
            throw err;
          }
        }
      }

      try {
        const res = await pg.query<T>(sqlText, values);
        const normalizedRes: QueryResult<T> = {
          rows: (res.rows || []) as T[],
          fields: (res.fields as any[]) || [],
          rowCount: res.affectedRows ?? (res.rows ? res.rows.length : 0),
          affectedRows: res.affectedRows ?? 0,
          command: (res as any).command || "SELECT"
        };
        if (cb) cb(null, normalizedRes);
        return normalizedRes;
      } catch (err: any) {
        // Fallback for multi-statement queries that weren't caught by the split
        if (err?.message?.includes("cannot insert multiple commands into a prepared statement") && (!values || values.length === 0)) {
          try {
            const execRes = await pg.exec(sqlText);
            const lastRes = execRes && execRes.length > 0 ? execRes[execRes.length - 1] : { rows: [], fields: [], rowCount: 0, command: "EXEC" };
            const normalizedRes: QueryResult<T> = {
              rows: (lastRes.rows as unknown as T[]) || [],
              fields: (lastRes.fields as any[]) || [],
              rowCount: (lastRes as any).affectedRows ?? (lastRes.rows ? lastRes.rows.length : 0),
              affectedRows: (lastRes as any).affectedRows ?? 0,
              command: (lastRes as any).command || "EXEC"
            };
            if (cb) cb(null, normalizedRes);
            return normalizedRes;
          } catch (execErr: any) {
            if (cb) {
              cb(execErr);
              return { rows: [], fields: [], rowCount: 0, command: "ERROR" };
            }
            throw execErr;
          }
        }

        if (cb) {
          cb(err);
          return { rows: [], fields: [], rowCount: 0, command: "ERROR" };
        }
        throw err;
      }
    };

    const poolAdapter: PoolAdapter = {
      query: queryFn,
      connect: async () => ({
        query: queryFn,
        release: () => {},
      }),
      on: (_event: string, _handler: (...args: any[]) => void) => poolAdapter,
      end: async () => {},
      totalCount: 1,
      idleCount: 1,
      waitingCount: 0,
    };

    global._postgresPoolAdapter = poolAdapter;
  }
  return global._postgresPoolAdapter;
};

export const pool: PoolAdapter = createPool();
export const db = drizzle(pglite, { schema });
