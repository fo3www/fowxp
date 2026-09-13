import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required. For Neon, use the pooled PostgreSQL connection string from Dashboard → Connect.",
  );
}

function isNeonConnection(connectionString: string) {
  try {
    return new URL(connectionString).hostname.endsWith(".neon.tech");
  } catch {
    return false;
  }
}

export const databaseProvider = isNeonConnection(databaseUrl) ? "neon" : "postgresql";

const globalForDb = globalThis as typeof globalThis & {
  __fowwwPostgresqlPool?: Pool;
};

const configuredPoolSize = Number(process.env.DATABASE_POOL_MAX);
const poolMax = Number.isInteger(configuredPoolSize) && configuredPoolSize > 0
  ? Math.min(configuredPoolSize, 10)
  : databaseProvider === "neon"
    ? 3
    : 10;

export const pool =
  globalForDb.__fowwwPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
    max: poolMax,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    allowExitOnIdle: process.env.NODE_ENV !== "production",
    ssl: databaseProvider === "neon" ? { rejectUnauthorized: true } : undefined,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__fowwwPostgresqlPool = pool;
}

export const db = drizzle(pool, { schema });
