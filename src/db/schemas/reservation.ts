// src/db/schemas/reservation.ts
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { PetTable } from "./pet";
import { UserTable } from "./user";

import {ReservationDate} from "@/types"

const table = sqliteTable;

export const ReservationTable = table("reservation", {
  id: integer().primaryKey({
    autoIncrement: true,
  }),
  petId: integer().references(() => PetTable.id),
  userId: integer().references(() => UserTable.id),

  createdAt: integer({ mode: "timestamp" }).$defaultFn(() => new Date()),
  // date: integer({ mode: "timestamp" }).notNull(),
  date: text({mode:"json"}).$type<ReservationDate>().notNull(),
  timeFrom: text().notNull(),
  timeTo: text().notNull(),
  status: text({
    enum: ["rescheduled", "canceled", "oncoming", "done", "late"],
  }),
});

export type ReservationStatus =
  | "oncoming"
  | "done"
  | "late"
  | "rescheduled"
  | "canceled";
export type CreateReservation = typeof ReservationTable.$inferInsert;
export type SelectReservation = typeof ReservationTable.$inferSelect;
