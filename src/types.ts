import { SelectReservation } from "@/models/reservation";
import * as libsql from "@libsql/client";
import { LibSQLDatabase } from "drizzle-orm/libsql";
import { Context } from "hono";
import type { JwtVariables } from "hono/jwt";
import { z } from "zod";

export type Bindings = {
  TURSO_DB_URL: string;
  TURSO_TOKEN: string;
  JWT_SECRET: string;
  URL: string;
  CLIENT_URL: string;
  RESEND_TOKEN: string;
};
export type Variables = {
  dbClient: libsql.Client;
  db: LibSQLDatabase;
} & JwtVariables;

export type AppContext = Context<{ Bindings: Bindings; Variables: Variables }>;

export const PetInfoSchema = z.object({
  name: z.string(),
  specie: z.string(),
});
export type PetInfoType = z.infer<typeof PetInfoSchema>;

const ValidDaySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
  z.literal(8),
  z.literal(9),
  z.literal(10),
  z.literal(11),
  z.literal(12),
  z.literal(13),
  z.literal(14),
  z.literal(15),
  z.literal(16),
  z.literal(17),
  z.literal(18),
  z.literal(19),
  z.literal(20),
  z.literal(21),
  z.literal(22),
  z.literal(23),
  z.literal(24),
  z.literal(25),
  z.literal(26),
  z.literal(27),
  z.literal(28),
  z.literal(29),
  z.literal(30),
  z.literal(31),
]);

const ValidMonthSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
  z.literal(8),
  z.literal(9),
  z.literal(10),
  z.literal(11),
  z.literal(12),
]);

// Create the reservation date schema
export const ReservationDateSchema = z
  .object({
    day: ValidDaySchema,
    month: ValidMonthSchema,
    year: z.number().int().positive(),
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

// Type inference from the schema
export type ValidatedReservationDate = z.infer<typeof ReservationDateSchema>;
export const UserInfoSchema = z
  .object({
    name: z.string(),
    surname: z.string(),
    email: z.string().email().optional().or(z.string()),
    phoneNumber: z.string().optional(),
  })
  .refine(
    (data) =>
      (data.phoneNumber !== undefined && data.phoneNumber != "") ||
      (data.email !== undefined && data.email != ""),
    {
      message: "Either phoneNumber or email must be provided",
      path: ["contactInfo"],
    },
  );
export type UserInfoType = z.infer<typeof UserInfoSchema>;

export const TimeSchema = z.object({
  from: z.string(),
  to: z.string(),
});
export type TimeType = z.infer<typeof TimeSchema>;

export const CreateReservationSchema = z.object({
  date: ReservationDateSchema,
  time: TimeSchema,
});
export type CreateReservationType = z.infer<typeof CreateReservationSchema>;
/**
 * Converts reservation.date + reservation.time.to into a JS Date.
 * @param reservation ReservationType
 * @returns Date object representing the combined date and time
 */
export function dateFromReservationTo(
  reservation: CreateReservationType,
): Date {
  const { date, time } = reservation;
  const [hours, minutes] = time.to.split(":").map(Number);

  const result = new Date(date.day, date.month - 1, date.year);
  result.setUTCHours(hours, minutes, 0, 0);

  return result;
}
export function dateFromReservationFrom(
  reservation: CreateReservationType,
): Date {
  const { date, time } = reservation;
  const [hours, minutes] = time.from.split(":").map(Number);
  // console.log(date,hours,minutes)
  const result = new Date(date.day, date.month - 1, date.year);
  result.setUTCHours(hours, minutes, 0, 0);
  // console.log(date,result)

  return result;
}
export function dateFromReservation(
  reservation: Pick<SelectReservation, "date">,
): Date {
  const { date } = reservation;
  // console.log(date,hours,minutes)
  const result = new Date(date.day, date.month - 1, date.year);
  result.setUTCHours(0, 0, 0);
  // console.log(date,result)

  return result;
}
export const reservationDateFromDate  = (date: Date) : ReservationDate => {
  let _date = {
    day: date.getUTCDate() as ValidDay,
    month: date.getUTCMonth() as ValidMonth,
    year: date.getUTCFullYear(),
  };
  return _date
};
export function dateFromReservationDate(date: ReservationDate): Date {
  // console.log(date,hours,minutes)
  const result = new Date(date.day, date.month - 1, date.year);
  result.setUTCHours(0, 0, 0);
  // console.log(date,result)

  return result;
}
export const CreateReservationParams = z.object({
  userInfo: UserInfoSchema,
  reservationInfo: CreateReservationSchema,
  petInfo: PetInfoSchema,
});

export type TimePeriod = "AM" | "PM" | "";
export type TimeString = `${number}:${number} ${TimePeriod}`;

export type TimeSlot = {
  from: TimeString;
  to: TimeString;
};
export const CreateUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  surname: z.string().min(1, "Surname is required"),
  email: z.string().email("Invalid email address"),
  phoneNumber: z
    .string()
    .min(7, "Phone number is too short")
    .optional()
    .or(z.literal("")),
});

export interface MagicLinkData {
  userId: number;
  token: string;
  used: boolean;
}

export type ValidDay =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23
  | 24
  | 25
  | 26
  | 27
  | 28
  | 29
  | 30
  | 31;
export type ValidMonth = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type ReservationDate = {
  day: ValidDay;
  month: ValidMonth;
  year: number;
}; // Define base schemas
