import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { PetTable } from "./pet";

const table = sqliteTable;

export const ReservationTable = table("staff", {
  id: integer().primaryKey({
    autoIncrement: true,
  }),
  petId: integer().references(() => PetTable.id),
  createdAt: integer({ mode: "timestamp" }).$defaultFn(() => new Date()),
  date: integer({ mode: "timestamp" }).notNull(),
  status:text({enum:["reschedulled","canceled","oncoming","done"]})
});

export const CreateReservation = typeof ReservationTable.$inferInsert;
export const SelectReservation = typeof ReservationTable.$inferSelect;
