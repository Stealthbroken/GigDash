import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const conversationsTable = pgTable("conversations", {
  id: serial("id").primaryKey(),
  participant1UserId: integer("participant1_user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  participant2UserId: integer("participant2_user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  closedByUserId: integer("closed_by_user_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => conversationsTable.id, { onDelete: "cascade" }),
  senderUserId: integer("sender_user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  body: text("body"),
  attachmentUrl: text("attachment_url"),
  attachmentType: text("attachment_type"), // "image" | "file"
  attachmentName: text("attachment_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});