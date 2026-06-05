import { pgTable, serial, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { fansTable } from "./fans";
import { artistsTable } from "./artists";

export const fanFollowsTable = pgTable(
  "fan_follows",
  {
    id: serial("id").primaryKey(),
    fanId: integer("fan_id")
      .notNull()
      .references(() => fansTable.id, { onDelete: "cascade" }),
    artistId: integer("artist_id")
      .notNull()
      .references(() => artistsTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("fan_follows_fan_artist_idx").on(table.fanId, table.artistId)],
);

export type FanFollow = typeof fanFollowsTable.$inferSelect;