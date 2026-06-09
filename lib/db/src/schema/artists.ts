import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const artistsTable = pgTable("artists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  genres: text("genres").array().notNull().default([]),
  vibes: text("vibes").array().notNull().default([]),
  spotifyUrl: text("spotify_url"),
  youtubeUrl: text("youtube_url"),
  rateTier: integer("rate_tier").default(2), // 1=budget, 5=premium — for venue search filters
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertArtistSchema = createInsertSchema(artistsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertArtist = z.infer<typeof insertArtistSchema>;
export type Artist = typeof artistsTable.$inferSelect;
