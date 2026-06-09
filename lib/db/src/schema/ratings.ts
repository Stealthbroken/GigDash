import { pgTable, serial, integer, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const ratingsTable = pgTable(
  "ratings",
  {
    id: serial("id").primaryKey(),
    raterUserId: integer("rater_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    raterRole: text("rater_role").notNull(), // "artist" | "venue" | "fan"
    targetType: text("target_type").notNull(), // "artist" | "venue"
    targetId: integer("target_id").notNull(),
    score: integer("score").notNull(), // 1-5
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("ratings_rater_target_idx").on(t.raterUserId, t.targetType, t.targetId)],
);