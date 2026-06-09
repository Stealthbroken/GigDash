import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.resolve(__dirname, "../../.env") });

const { pool } = await import("@workspace/db");

const TABLES = [
  "messages",
  "conversations",
  "ratings",
  "event_artist_outreach",
  "event_artists",
  "fan_follows",
  "fan_follows_venues",
  "artist_blocked_dates",
  "events",
  "artists",
  "venues",
  "fans",
  "users",
] as const;

async function countRows(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const table of TABLES) {
    const result = await pool.query(`SELECT COUNT(*)::int AS count FROM "${table}"`);
    counts[table] = Number(result.rows[0]?.count ?? 0);
  }
  return counts;
}

async function resetDb() {
  const confirmed =
    process.argv.includes("--confirm") || process.env.RESET_DB_CONFIRM === "yes";

  if (!confirmed) {
    console.error(
      "Refusing to wipe the database without confirmation.\n" +
        "Run: pnpm --filter @workspace/scripts run reset -- --confirm\n" +
        "Or set RESET_DB_CONFIRM=yes",
    );
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  console.log("🗑️  Resetting database (all app data will be deleted)…");

  const before = await countRows();
  const totalBefore = Object.values(before).reduce((sum, n) => sum + n, 0);
  console.log(`   Rows before: ${totalBefore} (${before.users ?? 0} users)`);

  await pool.query(
    `TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`,
  );

  const after = await countRows();
  const totalAfter = Object.values(after).reduce((sum, n) => sum + n, 0);

  console.log(`✅ Database cleared. Rows after: ${totalAfter}`);
  console.log("   Schema/tables are intact — ready for real signups.");
}

resetDb()
  .catch((err) => {
    console.error("Reset failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });