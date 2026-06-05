import { pgTable, serial, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { venuesTable } from "./venues";
import { artistsTable } from "./artists";

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id").notNull().references(() => venuesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  artistRequirements: text("artist_requirements"),
  imageUrls: text("image_urls").array().notNull().default([]),
  genres: text("genres").array().notNull().default([]),
  isPaid: boolean("is_paid").notNull().default(false),
  payAmount: text("pay_amount"),
  isCompetition: boolean("is_competition").notNull().default(false),
  competitionLevel: integer("competition_level"),
  eventDate: timestamp("event_date", { withTimezone: true }).notNull(),
  durationMinutes: integer("duration_minutes"),
  status: text("status").notNull().default("upcoming"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const eventArtistsTable = pgTable("event_artists", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => eventsTable.id, { onDelete: "cascade" }),
  artistId: integer("artist_id").notNull().references(() => artistsTable.id, { onDelete: "cascade" }),
  bio: text("bio"),
});

export const insertEventSchema = createInsertSchema(eventsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;
