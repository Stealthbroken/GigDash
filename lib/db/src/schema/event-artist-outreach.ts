import { pgTable, serial, integer, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { eventsTable } from "./events";
import { artistsTable } from "./artists";

export const eventArtistOutreachTable = pgTable(
  "event_artist_outreach",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id")
      .notNull()
      .references(() => eventsTable.id, { onDelete: "cascade" }),
    artistId: integer("artist_id")
      .notNull()
      .references(() => artistsTable.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("contacted"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("event_artist_outreach_idx").on(t.eventId, t.artistId)],
);