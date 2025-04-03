import * as libsql from "@libsql/client";
import { LibSQLDatabase } from "drizzle-orm/libsql";
import { Context } from "hono";
import type { JwtVariables } from "hono/jwt";
import { z } from "zod";

export type Bindings = {
  TURSO_DB_URL: string;
  TURSO_TOKEN: string;
  JWT_SECRET: string;
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
export type PetInfoType = z.infer<typeof PetInfoSchema>

export const UserInfoSchema = z.object({
  name: z.string(),
  surname: z.string(),
  email: z.string().email().optional().or(z.string()),
  phoneNumber: z.string().optional(),
}).refine(
  data => (data.phoneNumber !== undefined && data.phoneNumber != "") || (data.email !== undefined && data.email != ""),
  {
    message: "Either phoneNumber or email must be provided",
    path: ["contactInfo"]
  })
;
export type UserInfoType = z.infer<typeof UserInfoSchema>

export const TimeSchema = z.object({
  from: z.string(),
  to: z.string(),
});
export type TimeType = z.infer<typeof TimeSchema>

export const CreateReservationSchema = z.object({
  date: z.date({ coerce: true }),
  time: TimeSchema,
});
export type CreateReservationType= z.infer<typeof CreateReservationSchema>
/**
 * Converts reservation.date + reservation.time.to into a JS Date.
 * @param reservation ReservationType
 * @returns Date object representing the combined date and time
 */
export function dateFromReservationTo(reservation: CreateReservationType): Date {
  const { date, time } = reservation;
  const [hours, minutes] = time.to.split(":").map(Number);

  const result = new Date(date);
  result.setUTCHours(hours, minutes, 0, 0);

  return result;
}
export function dateFromReservationFrom(reservation: CreateReservationType): Date {
  const { date, time } = reservation;
  const [hours, minutes] = time.from.split(":").map(Number);
  // console.log(date,hours,minutes)
  const result = new Date(date);
  result.setUTCHours(hours, minutes, 0, 0);
  // console.log(date,result)

  return result;
}
export const CreateReservationParams = z.object({
  userInfo: UserInfoSchema,
  reservationInfo: CreateReservationSchema,
  petInfo: PetInfoSchema,
});

export type TimePeriod = "AM" | "PM" | ""
export type TimeString = `${number}:${number} ${TimePeriod}`

export type TimeSlot = {
  from:TimeString,
  to:TimeString
}
