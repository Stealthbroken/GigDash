import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.resolve(__dirname, "../../.env") });

// Use the exact same db setup as the running app (now with improved pool config)
import { pool, db } from "@workspace/db";

async function main() {
  console.log("=== DB Diagnostics ===");
  console.log("DATABASE_URL present:", !!process.env.DATABASE_URL);
  if (!process.env.DATABASE_URL) {
    console.error("No DATABASE_URL");
    process.exit(1);
  }

  try {
    const u = new URL(process.env.DATABASE_URL);
    console.log("Host:", u.hostname);
    console.log("DB name:", u.pathname.slice(1));
    console.log("sslmode:", u.searchParams.get("sslmode"));
    console.log("channel_binding:", u.searchParams.get("channel_binding"));
  } catch (e: any) {
    console.error("Failed to parse DATABASE_URL as URL:", e.message);
  }

  // Try a couple of times — Neon computes can be suspended and the first connection(s) may reset or take time.
  let connected = false;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`\n[Attempt ${attempt}/3] Connecting via improved pool...`);
      const start = Date.now();
      const r = await pool.query(`SELECT 1 as ok, current_database() as db, now() as server_time`);
      console.log("✅ SUCCESS in", Date.now() - start, "ms");
      console.log("Result:", r.rows[0]);
      connected = true;
      break;
    } catch (e: any) {
      console.warn(`  Attempt ${attempt} failed:`, e.message, `(code: ${e.code || "n/a"})`);
      if (attempt < 3) {
        const delay = 1500 * attempt;
        console.log(`  Waiting ${delay}ms before retry (Neon cold start)...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  if (connected) {
    try {
      // Check if users table exists
      console.log("\nChecking for 'users' table via information_schema...");
      const tables = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
      `);
      const usersExists = tables.rows.length > 0;
      console.log("users table exists?", usersExists);

      if (usersExists) {
        const count = await pool.query(`SELECT count(*)::int as count FROM users`);
        console.log("users row count:", count.rows[0].count);
      } else {
        console.log("→ Schema has not been pushed to this database yet.");
      }

      // Try the exact same query pattern as the failing login (drizzle)
      console.log("\nTrying drizzle-style users lookup (like /api/auth/login)...");
      const { usersTable } = await import("@workspace/db");
      const { eq } = await import("drizzle-orm");
      const drizzleStart = Date.now();
      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, "fan@email.com"))
        .limit(1);
      console.log("Drizzle users lookup completed in", Date.now() - drizzleStart, "ms. Found user?", !!user);
    } catch (e: any) {
      console.error("\n❌ ERROR during post-connect schema checks");
      console.error("Name:", e.name);
      console.error("Code:", e.code);
      console.error("Message:", e.message);
      if (e.detail) console.error("Detail:", e.detail);
      if (e.hint) console.error("Hint:", e.hint);
    }
  }

  await pool.end().catch(() => {});

  if (!connected) {
    console.log("\nTips:");
    console.log("- If you see repeated ECONNRESET, the Neon DB may be paused (free tier).");
    console.log("- Try the Neon dashboard 'wake' or just keep retrying a few times.");
    console.log("- Also run: pnpm --filter @workspace/db run push   (to create the tables)");
  }
}

main().catch(console.error);
