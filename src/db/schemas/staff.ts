import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { UserTable } from "./user";

const table = sqliteTable;

export const StaffTable = table("staff", {
  id: integer().primaryKey({
    autoIncrement: true,
  }),
  role: text({ enum: ["admin", "veterinary", "receptionist"] }).notNull(),
  userId: integer().references(() => UserTable.id).notNull(),
  createdAt: integer({ mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export type CreateStaff = typeof StaffTable.$inferInsert;
export type SelectStaff = typeof StaffTable.$inferSelect;

export type Roles = CreateStaff["role"]
