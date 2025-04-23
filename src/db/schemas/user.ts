import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createUpdateSchema } from "drizzle-zod";
import { z } from "zod";
import { Roles } from "./staff";

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
  verified: integer({ mode: "boolean" }).default(true),
});

export type CreateUser = typeof UserTable.$inferInsert;
export type SelectUser = typeof UserTable.$inferSelect;
export type SelectUserData = Omit<
  SelectUser,
  "salt" | "passwordHash" | "verified"
> & {role?:Roles | null};

export const UpdateUserSchema = createUpdateSchema(UserTable)
  .pick({
    name: true,
    surname: true,
    email: true,
    phoneNumber: true,
    type: true,
  })
  .extend({ role: z.enum(["admin","veterinary","receptionist"]).optional() });
export type UpdateUserParams = z.infer<typeof UpdateUserSchema>;
