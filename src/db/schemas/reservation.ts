// src/db/schemas/reservation.ts
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { PetTable } from "./pet";
import { UserTable } from "./user";

import { ReservationDate } from "@/types";
import { ReservationService } from "@/services/reservation";

const table = sqliteTable;

export const ReservationTable = table("reservation", {
  id: integer().primaryKey({
    autoIncrement: true,
  }),
  reservationNumber: text()
    .notNull()
    .unique()
    .$defaultFn(() => {
      return ReservationService.generateRerservationNumber();
    }),
  petId: integer()
    .references(() => PetTable.id)
    .notNull(),
  userId: integer()
    .references(() => UserTable.id)
    .notNull(),

  createdAt: integer({ mode: "timestamp" }).$defaultFn(() => new Date()),
  // date: integer({ mode: "timestamp" }).notNull(),
  date: text({ mode: "json" }).$type<ReservationDate>().notNull(),
  timeFrom: text().notNull(),
  timeTo: text().notNull(),
  status: text({
    enum: ["rescheduled", "canceled", "oncoming", "done", "late"],
  }).notNull(),
});

export type ReservationStatus =
  | "oncoming"
  | "done"
  | "late"
  | "rescheduled"
  | "canceled";
export type CreateReservation = typeof ReservationTable.$inferInsert;
export type SelectReservation = typeof ReservationTable.$inferSelect;
