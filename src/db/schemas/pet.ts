// src/db/schemas/pet.ts
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { UserTable } from "./user";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod";

const table = sqliteTable;

export const PetTable = table("pet", {
  id: integer()
    .primaryKey({
      autoIncrement: true,
    })
    .notNull(),
  name: text().notNull(),
  ownerId: integer()
    .references(() => UserTable.id, { onDelete: "cascade" })
    .notNull(),
  specie: text().notNull().default("unknown"),
  createdAt: integer({ mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  metadata: text({ mode: "json" })
    .$type<Record<string, any>>()
    .notNull()
    .default({}),
});

export type CreatePet = typeof PetTable.$inferInsert;
export type SelectPet = typeof PetTable.$inferSelect;

export const UpdatePetSchema = createUpdateSchema(PetTable).omit({
  id: true,
  specie: true,
  createdAt: true,
});
export const InsertPetSchema = createInsertSchema(PetTable).omit({
  id: true,
  createdAt: true,
}).required()
export type UpdatePetParams = z.infer<typeof UpdatePetSchema>;
