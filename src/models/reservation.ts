import { z } from "zod";
import { SelectPet } from "../db/schemas/pet";
import { SelectUser } from "../db/schemas/user";
import {
  IdSchema,
  PetInfoSchema,
  ReservationDate,
  TimeSchema,
  TimeSlot,
  UserInfoSchema,
  ValidDay,
  ValidDaySchema,
  ValidMonth,
  ValidMonthSchema,
} from "@/types";
import { ReservationTable } from "@/models/reservation";
import { DateTime } from "luxon";

export interface ReservationRecord {
  pet: Omit<SelectPet, "owner" | "createdAt">;
  user: Omit<SelectUser, "passwordHash" | "salt" | "createdAt">;
  reservation: Omit<
    SelectReservation,
    "timeFrom" | "timeTo" | "userId" | "petId"
  > & {
    time: TimeSlot;
  };
}

// Create the reservation date schema
export const ReservationDateSchema = z.union([z
  .object({
    day: ValidDaySchema,
    month: ValidMonthSchema,
    year: z.number().int().positive(),
  }),z.string().date()])
.transform((data)=>{
  if(typeof data === "string"){
    const date = DateTime.fromISO(data)
    return {
      day:date.day as ValidDay,
      month:date.month as ValidMonth,
      year:date.year
    }
  }else{
    return data
  }
})
  .refine(
    (data) => {
      // Validate that the day is valid for the given month and year
      const date = new Date(data.year, data.month - 1, data.day);
      return (
        date.getFullYear() === data.year &&
        date.getMonth() === data.month - 1 &&
        date.getDate() === data.day
      );
    },
    {
      message:
        "Invalid date - the day does not exist for the specified month and year",
      path: ["day"],
    },
  );

export const ReservationInfoSchema = z.object({
  date: ReservationDateSchema,
  time: TimeSchema,
  service: z.enum(["grooming", "vaccination", "consultation"]),
});
export const CreateReservationSchema = z.object({
  userInfo: z.union([IdSchema, UserInfoSchema]),
  reservationInfo: ReservationInfoSchema,
  petInfo: z.union([IdSchema, PetInfoSchema]),
});
// Type inference from the schema
export type ReservationDateParam = z.infer<typeof ReservationDateSchema>;
export type ReservationStatus =
  | "oncoming"
  | "done"
  | "late"
  | "rescheduled"
  | "canceled";
export type CreateReservation = typeof ReservationTable.$inferInsert;
export type SelectReservation = typeof ReservationTable.$inferSelect;

export interface ReservationHistoryRow {
  date: ReservationDate;
  time: { from: string; to: string };
  status: "oncoming" | "done" | "late" | "rescheduled" | "canceled";
  createdAt: Date | null;
  reservationId: number;
  reservationNumber: string;
}
