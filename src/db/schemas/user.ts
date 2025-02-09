import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const table = sqliteTable;

export const UserTable = table("user", {
  id: integer().primaryKey({
    autoIncrement: true,
  }),
  name: text().notNull(),
  email: text().notNull(),
  passwordHash: text().notNull(),
  salt: text().notNull(),
  createdAt: integer({ mode: "timestamp" }).$defaultFn(() => new Date()),
  type: text({ enum: ["staff", "client", "anonymous"] }).default("client"),
});

export const CreateUser = typeof UserTable.$inferInsert;
export const SelectUser = typeof UserTable.$inferSelect;
