import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const fansTable = pgTable("fans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  location: text("location"),
  genres: text("genres").array().notNull().default([]),
  spotifyUrl: text("spotify_url"),
  appleMusicUrl: text("apple_music_url"),
  tidalUrl: text("tidal_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFanSchema = createInsertSchema(fansTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFan = z.infer<typeof insertFanSchema>;
export type Fan = typeof fansTable.$inferSelect;
