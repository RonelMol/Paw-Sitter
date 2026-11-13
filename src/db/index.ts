import { drizzle as drizzleNodePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { PoolConfig } from "pg";
import * as schema from "./schema.ts";
import path from "path";
import fs from "fs";
import { createRequire } from "module";

const requireModule = createRequire(import.meta.url);

declare global {
  var _postgresPool: Pool | undefined;
  var _pgliteInstance: any;
  var _postgresPoolAdapter: PoolAdapter | undefined;
}

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
export const QueryResult = {};
export const PoolClient = {};
export const PoolAdapter = {};

const getConnectionString = () => {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    (process.env.POSTGRES_HOST
      ? `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DATABASE || "postgres"}`
      : undefined)
  );
};

const connStr = getConnectionString();
const isRemoteDb = Boolean(connStr);

// --- Remote PostgreSQL (Supabase / Cloud SQL) Support ---
export const createRemotePool = (): Pool => {
  if (!global._postgresPool) {
    const config: PoolConfig = {
      connectionString: getConnectionString(),
      ssl: { rejectUnauthorized: false },
      max: 10,
      connectionTimeoutMillis: 15000,
    };
    global._postgresPool = new Pool(config);
    global._postgresPool.on("error", (err) => {
      console.error("Unexpected error on idle remote SQL client:", err);
    });
  }
  return global._postgresPool;
};

// --- Local PGlite WASM Support (dynamic imported for local dev only) ---
const dataDir = path.resolve(process.cwd(), "data/postgres");

const initPgLiteFilesystem = () => {
  const confFile = path.join(dataDir, "postgresql.conf");
  if (fs.existsSync(dataDir)) {
    try {
      const files = fs.readdirSync(dataDir);
      if (files.length > 0 && !fs.existsSync(confFile)) {
        console.warn("Corrupted PGlite directory detected without postgresql.conf. Resetting data directory...");
        fs.rmSync(dataDir, { recursive: true, force: true });
      }
    } catch {}
  }

  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch {}
  }

  const pidFile = path.join(dataDir, "postmaster.pid");
  if (fs.existsSync(pidFile)) {
    try {
      fs.unlinkSync(pidFile);
    } catch {}
  }
};

const getPgLiteInstance = (PGliteClass: any): any => {
  if (!global._pgliteInstance) {
    if (process.env.VERCEL) {
      global._pgliteInstance = new PGliteClass();
    } else {
      initPgLiteFilesystem();
      try {
        global._pgliteInstance = new PGliteClass(dataDir);
      } catch (initErr) {
        console.warn("Primary PGlite persistent directory initialization error, auto-recovering:", initErr);
        try {
          fs.rmSync(dataDir, { recursive: true, force: true });
          fs.mkdirSync(dataDir, { recursive: true });
          global._pgliteInstance = new PGliteClass(dataDir);
        } catch (fallbackErr) {
          console.warn("Falling back to in-memory PGlite instance:", fallbackErr);
          global._pgliteInstance = new PGliteClass();
        }
      }
    }
  }
  return global._pgliteInstance;
};

const createPgLitePoolAdapter = (pg: any): PoolAdapter => {
  if (!global._postgresPoolAdapter) {
    const queryFn = async <T = any>(textOrConfig: any, params?: any, callback?: any): Promise<QueryResult<T>> => {
      try {
        await pg.waitReady;
      } catch (waitErr) {
        console.warn("PGlite waitReady note:", waitErr);
      }

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
        const res = await (pg as any).query(sqlText, values);
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

let poolInstance: any;
let dbInstance: any;
let pgliteInstance: any;

if (isRemoteDb) {
  poolInstance = createRemotePool();
  dbInstance = drizzleNodePg(poolInstance, { schema });
  pgliteInstance = undefined;
} else {
  // Only loaded in local development without remote DATABASE_URL
  const { PGlite } = requireModule("@electric-sql/pglite");
  const { drizzle } = requireModule("drizzle-orm/pglite");
  pgliteInstance = getPgLiteInstance(PGlite);
  poolInstance = createPgLitePoolAdapter(pgliteInstance);
  dbInstance = drizzle(pgliteInstance, { schema });
}

export const pool: any = poolInstance;
export const pglite: any = pgliteInstance;
export const db: any = dbInstance;
