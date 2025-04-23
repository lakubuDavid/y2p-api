import * as libsql from "@libsql/client";
import { LibSQLDatabase } from "drizzle-orm/libsql";
import { Context } from "hono";
import type { JwtVariables } from "hono/jwt";
import { z } from "zod";
import {
  ReservationDateSchema,
  ReservationInfoSchema,
  SelectReservation,
} from "./models/reservation";

const envSchema = z.object({});

export type Bindings = {
  EMAIL_SENDER: string;
  TURSO_DB_URL: string;
  TURSO_TOKEN: string;
  JWT_SECRET: string;
  URL: string;
  CLIENT_URL: string;
  RESEND_TOKEN: string;

  ENVIRONMENT: "development" | "production" | "test";
};
declare global {
  namespace NodeJS {
    interface ProcessEnv extends Bindings {
      NODE_ENV: "development" | "production";
      PORT?: string;
      PWD: string;
    }
  }
}
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

export const ValidDaySchema = z.union([
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

export const ValidMonthSchema = z.union([
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

export const UserInfoSchema = z
  .object({
    name: z.string(),
    surname: z.string(),
    email: z.string().email().optional().or(z.string()),
    phoneNumber: z.string().optional(),
    role: z.enum(["admin", "veterinary", "receptionist"]).optional(),
    type: z.enum(["staff", "client", "anonymous"]).optional(),
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

export type ReservationInfo = z.infer<typeof ReservationInfoSchema>;
/**
 * Converts reservation.date + reservation.time.to into a JS Date.
 * @param reservation ReservationType
 * @returns Date object representing the combined date and time
 */
export function dateFromReservationTo(reservation: ReservationInfo): Date {
  const { date, time } = reservation;
  const [hours, minutes] = time.to.split(":").map(Number);

  const result = new Date(date.day, date.month - 1, date.year);
  result.setUTCHours(hours, minutes, 0, 0);

  return result;
}
export function dateFromReservationFrom(reservation: ReservationInfo): Date {
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
  console.log(date.day, date.month, date.year);
  const result = new Date(date.year, date.month - 1, date.day);
  // result.setUTCHours(0, 0, 0);
  console.log(date, result);

  return result;
}
export function toReservationDate(date: Date): ReservationDate {
    let _date = {
        day: date.getUTCDate() as ValidDay,
        month: date.getUTCMonth() + 1 as ValidMonth,
        year: date.getUTCFullYear(),
    };
    return _date;
}
export function toDate(date: ReservationDate): Date {
  const _date = new Date(date.year, date.month - 1, date.day);

  return _date;
}

export const IdSchema = z.object({ id: z.number() });

export type TimePeriod = "AM" | "PM" | "";
export type TimeString = `${number}:${number} ${TimePeriod}`;

export type TimeSlot = {
  from: TimeString;
  to: TimeString;
};
export const AdminCreateUserSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    surname: z.string().min(1, "Surname is required"),
    email: z.string().email("Invalid email address"),
    phoneNumber: z
      .string()
      .min(7, "Phone number is too short")
      .optional()
      .or(z.literal("")),
    type: z.enum(["client", "staff"]),
    role: z.enum(["receptionist", "admin", "veterinary"]).optional(),
  })
  .refine((data) => {
    if (data.type == "staff") {
      if (!data.role) {
        return {
          message: "Staff member role missing",
          path: ["role"],
        };
      }
    }
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

export const isSameDay = (date_a: ReservationDate, date_b: ReservationDate) => {
  return (
    date_a.year === date_b.year &&
    date_a.month === date_b.month &&
    date_a.day === date_b.day
  );
};
