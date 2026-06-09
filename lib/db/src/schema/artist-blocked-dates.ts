import { pgTable, serial, integer, date, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { artistsTable } from "./artists";

export const artistBlockedDatesTable = pgTable(
  "artist_blocked_dates",
  {
    id: serial("id").primaryKey(),
    artistId: integer("artist_id")
      .notNull()
      .references(() => artistsTable.id, { onDelete: "cascade" }),
    blockedDate: date("blocked_date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("artist_blocked_date_idx").on(t.artistId, t.blockedDate)],
);