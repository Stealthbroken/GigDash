import { pgTable, serial, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { fansTable } from "./fans";
import { venuesTable } from "./venues";

export const fanFollowsVenuesTable = pgTable(
  "fan_follows_venues",
  {
    id: serial("id").primaryKey(),
    fanId: integer("fan_id")
      .notNull()
      .references(() => fansTable.id, { onDelete: "cascade" }),
    venueId: integer("venue_id")
      .notNull()
      .references(() => venuesTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("fan_venue_follow_idx").on(t.fanId, t.venueId)],
);