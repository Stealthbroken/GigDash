import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from workspace root (three levels up from this file: src -> db -> lib -> root)
config({ path: resolve(__dirname, "../../../.env") });

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Neon (and many cloud Postgres) often work better with explicit ssl + small pool size.
// The original URL may contain channel_binding=require which has been known to cause
// ECONNRESET with node-postgres in some configurations.
const rawUrl = process.env.DATABASE_URL;
let connectionString = rawUrl;
try {
  const u = new URL(rawUrl);
  // Drop channel_binding for compatibility with pg driver + Neon pooler in some cases.
  if (u.searchParams.has("channel_binding")) {
    u.searchParams.delete("channel_binding");
    connectionString = u.toString();
  }
} catch {
  // leave as-is if not a valid URL
}

export const pool = new Pool({
  connectionString,
  // Small pool is important for serverless Postgres (Neon free tier etc.)
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 20_000,
  // For hosted DBs that use self-signed or managed certs, rejectUnauthorized: false is common in dev.
  // If you need strict verification in prod, set via env or remove this.
  ssl: rawUrl.includes("sslmode=require") || rawUrl.includes("sslmode=prefer")
    ? { rejectUnauthorized: false }
    : undefined,
});

// Log pool-level errors (prevents unhandled crashes and surfaces real issues)
pool.on("error", (err) => {
  console.error("[db] Unexpected pool error:", err);
});

export const db = drizzle(pool, { schema });

export * from "./schema";
