// Add this to your schemas/user.ts file

import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { UserTable } from "./user";

const table = sqliteTable;

export const MagicLinkTable = table("magic_link", {
  id: integer().primaryKey({ autoIncrement: true }),
  userId: integer()
    .notNull()
    .references(() => UserTable.id, { onDelete: "cascade" }),
  token: text().notNull().unique(),
  expiresAt: integer({ mode: "timestamp" }).notNull(),
  used: integer({ mode: "boolean" }).notNull().default(false),
  createdAt: integer({ mode: "timestamp" }).$defaultFn(() => new Date()),
});

export type SelectMagicLink = typeof MagicLinkTable.$inferSelect;
export type CreateMagicLink = typeof MagicLinkTable.$inferInsert;
