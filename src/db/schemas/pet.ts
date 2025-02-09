import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { UserTable } from "./user";

const table = sqliteTable;

export const PetTable = table("pet", {
  id: integer().primaryKey({
    autoIncrement: true,
  }).notNull(),
  name: text().notNull(),
  owner:integer().references(()=>UserTable.id).notNull(),
  createdAt: integer({ mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export type CreatePet = typeof PetTable.$inferInsert;
export type SelectPet = typeof PetTable.$inferSelect;
