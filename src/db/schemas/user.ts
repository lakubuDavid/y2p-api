import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const table = sqliteTable;

export const UserTable = table("user", {
  id: integer().primaryKey({
    autoIncrement: true,
  }),
  name: text().notNull(),
  surname: text().notNull().default(""),
  email: text().notNull().default(""),
  phoneNumber: text().notNull().default(""),
  passwordHash: text().notNull(),
  salt: text().notNull(),
  createdAt: integer({ mode: "timestamp" }).$defaultFn(() => new Date()),
  type: text({ enum: ["staff", "client", "anonymous"] }).default("anonymous"),
});

export type CreateUser = typeof UserTable.$inferInsert;
export type SelectUser = typeof UserTable.$inferSelect;
export type SelectUserData = Omit<SelectUser, "salt" | "passwordHash">;
