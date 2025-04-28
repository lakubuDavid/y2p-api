// src/services/reservation.ts
import { eq, and, gte, lte, inArray, or, lt } from "drizzle-orm";
import { LibSQLDatabase } from "drizzle-orm/libsql";
import {
  CreateReservation,
  SelectReservation,
  ReservationStatus,
  ReservationRecord,
  ReservationHistoryRow,
} from "../models/reservation";
import { PetTable } from "../db/schemas/pet";
import { BaseService } from "./service";
import { SelectUser, UserTable } from "../db/schemas/user";
import {
  AsyncResult,
  ErrorCodes,
  Fail,
  MatchErrorCode,
  Ok,
  Result,
} from "../../lib/error";

import {
  dateFromReservation,
  toDate,
  dateFromReservationFrom,
  ReservationDate,
  toReservationDate,
  TimePeriod,
  TimeString,
  isSameDay,
} from "@/types";
import { DateTime } from "luxon";
import { ReservationTable } from "@/models/reservation";
import { isDeepStrictEqual } from "util";
import { deepEqual } from "assert";
import { StaffTable } from "@/models/staff";

interface TimeSlot {
  from: string;
  to: string;
}

interface GenerateTimeSlotsOptions {
  date: Date;
  startHour?: number; // Default business hour start
  endHour?: number; // Default business hour end
  durationMinutes?: number; // Duration of each slot
  excludeReservations?: boolean; // Whether to exclude already reserved slots
}

export interface QueryReservationFilter {
  // status?: string;
  status?: ReservationStatus[];
  userId?: number;
  petId?: number;
  date?: ReservationDate;
}
// interface QueryReservationFilter{
//   status? : `${ReservationStatus}`
// }

const ReservationHistoryJoinColumns = {
  date: ReservationTable.date,
  time: {
    from: ReservationTable.timeFrom,
    to: ReservationTable.timeTo,
  },
  status: ReservationTable.status,
  createdAt: ReservationTable.createdAt,
  reservationId: ReservationTable.id,
  reservationNumber: ReservationTable.reservationNumber,
};

export const ReservationJoinColumns = {
  pet: {
    id: PetTable.id,
    name: PetTable.name,
    specie: PetTable.specie,
    ownerId: PetTable.ownerId,
    createdAt: PetTable.createdAt,
    metadata: PetTable.metadata,
  },
  user: {
    id: UserTable.id,
    name: UserTable.name,
    surname: UserTable.surname,
    email: UserTable.email,
    phoneNumber: UserTable.phoneNumber,
    type: UserTable.type,
    verified: UserTable.verified,
  },
  reservation: {
    date: ReservationTable.date,
    timeFrom: ReservationTable.timeFrom,
    timeTo: ReservationTable.timeTo,
    status: ReservationTable.status,
    createdAt: ReservationTable.createdAt,
    id: ReservationTable.id,
    reservationNumber: ReservationTable.reservationNumber,
    service: ReservationTable.service,
    assigneeId: ReservationTable.assigneeId,
  },
};
export class ReservationService extends BaseService {
  constructor(db: LibSQLDatabase, jwtSecret: string) {
    super(db, jwtSecret);
  }
  public static generateRerservationNumber() {
    // Generate a unique reservation number (e.g., VET-YYYY-MMDD-XXXX)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    const reservationNumber = `VET-${dateStr}-${randomStr}`;
    return reservationNumber;
  }
  public async cancel(id: number): Promise<Result<SelectReservation>> {
    try {
      const [reservation] = await this.db
        .update(ReservationTable)
        .set({
          status: "canceled",
        })
        .where(eq(ReservationTable.id, id))
        .returning();
      return Ok(reservation);
    } catch (error) {
      return Fail(
        `Failed to update reservation: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        MatchErrorCode(error as Error),
        error as Error,
      );
    }
  }
  public async delete(id: number): Promise<Result<SelectReservation>> {
    try {
      const [reservation] = await this.db
        .delete(ReservationTable)
        .where(eq(ReservationTable.id, id))
        .returning();
      if (!reservation)
        return Fail("Reservation not found!", ErrorCodes.NOT_FOUND);
      return Ok(reservation);
    } catch (error) {
      return Fail(
        `Failed to update reservation: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        MatchErrorCode(error as Error),
        error as Error,
      );
    }
  }
  public async update(
    id: number,
    value: Partial<
      Omit<SelectReservation, "id" | "createdAt" | "petId" | "userId">
    >,
  ): Promise<Result<SelectReservation>> {
    try {
      let status = value.status;
      if (value.date) {
        if (status !== "canceled" && status !== "done")
          if (toDate(value.date).getTime() > Date.now()) {
            status = "rescheduled";
          } else {
            status = "late";
          }
      }
      const [updatedReservation] = await this.db
        .update(ReservationTable)
        .set({ ...value, status })
        .where(eq(ReservationTable.id, id))
        .returning();
      return Ok(updatedReservation);
    } catch (error) {
      return Fail(
        `Failed to update reservation: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        MatchErrorCode(error as Error),
        error as Error,
      );
    }
  }
  public async getById(id: number): AsyncResult<ReservationRecord> {
    try {
      const [result] = await this.db
        .select(ReservationJoinColumns)
        .from(ReservationTable)
        .innerJoin(PetTable, eq(ReservationTable.petId, PetTable.id))
        .innerJoin(UserTable, eq(ReservationTable.userId, UserTable.id))
        .where(eq(ReservationTable.id, id));
      if (!result) return Fail("Rservation not found", ErrorCodes.NOT_FOUND);
      const assignee = result.reservation.assigneeId
        ? (
            await this.db
              .select({
                name: UserTable.name,
                id: UserTable.id,
                surname: UserTable.surname,
                email: UserTable.email,
                phoneNumber: UserTable.phoneNumber,
                type: UserTable.type,
                createdAt: UserTable.createdAt,
                role: StaffTable.role,
                staffId: StaffTable.id,
              })
              .from(UserTable)
              .innerJoin(StaffTable, eq(UserTable.id, StaffTable.userId))
              .where(eq(StaffTable.id, result.reservation.assigneeId))
          )[0]
        : undefined;

      const reservation = {
        ...result,
        reservation: {
          ...result.reservation,
          time: {
            from: result.reservation.timeFrom as TimeString,
            to: result.reservation.timeTo as TimeString,
          },
          timeFrom: undefined,
          timeTo: undefined,
        },
        assignee,
      };

      return Ok(reservation);
    } catch (err) {
      return Fail(
        err instanceof Error ? err.message : "Database error",
        ErrorCodes.DATABASE_ERROR,
        err as Error,
      );
    }
  }

  // In /apps/api/src/services/reservation.ts
  public async getByNumber(
    reservationNumber: string,
  ): Promise<Result<ReservationRecord>> {
    try {
      const result = await this.db
        .select(ReservationJoinColumns)
        .from(ReservationTable)
        .innerJoin(PetTable, eq(ReservationTable.petId, PetTable.id))
        .innerJoin(UserTable, eq(ReservationTable.userId, UserTable.id))
        .where(eq(ReservationTable.reservationNumber, reservationNumber))
        .get();

      if (!result) {
        return Fail("Reservation not found", ErrorCodes.NOT_FOUND);
      }

      const assignee = result.reservation.assigneeId
        ? (
            await this.db
              .select({
                name: UserTable.name,
                id: UserTable.id,
                surname: UserTable.surname,
                email: UserTable.email,
                phoneNumber: UserTable.phoneNumber,
                type: UserTable.type,
                createdAt: UserTable.createdAt,
                role: StaffTable.role,
                staffId: StaffTable.id,
              })
              .from(UserTable)
              .innerJoin(StaffTable, eq(UserTable.id, StaffTable.userId))
              .where(eq(StaffTable.id, result.reservation.assigneeId))
          )[0]
        : undefined;
      const reservation = {
        ...result,
        reservation: {
          ...result.reservation,
          time: {
            from: result.reservation.timeFrom as TimeString,
            to: result.reservation.timeTo as TimeString,
          },
          timeFrom: undefined,
          timeTo: undefined,
        },
        assignee,
      };

      if (!reservation) {
        return Fail(
          `Reservation with number ${reservationNumber} not found`,
          ErrorCodes.NOT_FOUND,
        );
      }

      return Ok(reservation);
    } catch (error) {
      return Fail(
        `Failed to fetch reservation: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        MatchErrorCode(error as Error),
        error as Error,
      );
    }
  }

  // export interface QueryReservationFilter {
  //   status?: string;
  //   userId?: number;
  //   petId?: number;
  //   date?: Date;
  // }

  public async all(
    filter?: QueryReservationFilter,
  ): Promise<Result<ReservationRecord[]>> {
    try {
      const reservations = await this.db.transaction(async (tx) => {
        let query = tx
          .select(ReservationJoinColumns)
          .from(ReservationTable)
          .innerJoin(PetTable, eq(ReservationTable.petId, PetTable.id))
          .innerJoin(UserTable, eq(ReservationTable.userId, UserTable.id));
        // Apply filters dynamically
        let dynamicQuery = query.$dynamic();
        if (filter) {
          if (filter.status)
            dynamicQuery = dynamicQuery.where(
              inArray(ReservationTable.status, filter.status),
            );
          if (filter.userId)
            dynamicQuery = dynamicQuery.where(
              eq(ReservationTable.userId, filter.userId),
            );
          if (filter.petId)
            dynamicQuery = dynamicQuery.where(
              eq(ReservationTable.petId, filter.petId),
            );
          if (filter.date) {
            console.log(filter.date);
            dynamicQuery = dynamicQuery.where(
              eq(ReservationTable.date, filter.date),
            );
          }
        }
        let _allReservations = await dynamicQuery.execute();
        const allReservations = await Promise.all(
          _allReservations.map(async (res) => {
            const assignee = res.reservation.assigneeId
              ? (
                  await this.db
                    .select({
                      name: UserTable.name,
                      id: UserTable.id,
                      surname: UserTable.surname,
                      email: UserTable.email,
                      phoneNumber: UserTable.phoneNumber,
                      type: UserTable.type,
                      createdAt: UserTable.createdAt,
                      role: StaffTable.role,
                      staffId: StaffTable.id,
                    })
                    .from(UserTable)
                    .innerJoin(StaffTable, eq(UserTable.id, StaffTable.userId))
                    .where(eq(StaffTable.id, res.reservation.assigneeId))
                )[0]
              : undefined;

            return {
              ...res,
              reservation: {
                ...res.reservation,
                time: {
                  from: res.reservation.timeFrom as TimeString,
                  to: res.reservation.timeTo as TimeString,
                },
                timeFrom: undefined,
                timeTo: undefined,
              },
              assignee,
            };
          }),
        );
        // Detect stale reservations
        const now = new Date();
        const staleReservations = allReservations.filter((reservation) => {
          console.log(
            "res",
            dateFromReservation(reservation.reservation).getTime(),
          );
          console.log("now", now.getTime());
          return (
            reservation.reservation.status == "oncoming" &&
            dateFromReservation(reservation.reservation).getTime() <
              now.getTime()
          );
        });

        if (staleReservations.length > 0) {
          const staleIds = staleReservations.map((r) => r.reservation.id);

          await tx
            .update(ReservationTable)
            .set({ status: "late" })
            .where(inArray(ReservationTable.id, staleIds));

          // Update local records efficiently using map()
          return allReservations.map((reservation) =>
            staleIds.includes(reservation.reservation.id)
              ? {
                  ...reservation,
                  reservation: {
                    ...reservation.reservation,
                    status: "late" as ReservationStatus,
                  },
                }
              : reservation,
          );
        }

        const onCommingReservations = allReservations.filter((reservation) => {
          console.log(
            "res",
            dateFromReservation(reservation.reservation).getTime(),
          );
          console.log("now", now.getTime());
          return (
            reservation.reservation.status == "oncoming" &&
            dateFromReservation(reservation.reservation).getTime() <
              now.getTime()
          );
        });

        if (onCommingReservations.length > 0) {
          const onCommingIds = onCommingReservations.map(
            (r) => r.reservation.id,
          );

          await tx
            .update(ReservationTable)
            .set({ status: "oncoming" })
            .where(inArray(ReservationTable.id, onCommingIds));

          // Update local records efficiently using map()
          return allReservations.map((reservation) =>
            onCommingIds.includes(reservation.reservation.id)
              ? {
                  ...reservation,
                  reservation: {
                    ...reservation.reservation,
                    status: "oncoming" as ReservationStatus,
                  },
                }
              : reservation,
          );
        }
        return allReservations;
      });

      return Ok(reservations);
    } catch (error) {
      return Fail(
        `Failed to fetch reservations: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        MatchErrorCode(error as Error),
        error as Error,
      );
    }
  }

  public async create(
    data: Omit<
      CreateReservation,
      "id" | "createdAt" | "status" | "reservationNumber"
    >,
  ): Promise<Result<SelectReservation>> {
    try {
      const pet = await this.db
        .select()
        .from(PetTable)
        .where(eq(PetTable.id, data.petId!))
        .get();

      if (!pet) {
        return Fail(
          `Pet with ID ${data.petId} not found`,
          ErrorCodes.NOT_FOUND,
        );
      }

      // Fetch all reservations for the same day
      const reservations = await this.db
        .select()
        .from(ReservationTable)
        .where(eq(ReservationTable.date, data.date))
        .all();

      const [fromHours, fromMinutes] = data.timeFrom.split(":").map(Number);
      let newFrom = DateTime.utc().set({
        hour: fromHours,
        minute: fromMinutes,
      });

      const [toHours, toMinutes] = data.timeTo.split(":").map(Number);
      let newTo = DateTime.utc().set({ hour: toHours, minute: toMinutes });

      // Check for overlapping reservations
      const isOverlapping = reservations.some((res) => {
        const [eFromHours, eFromMinutes] = res.timeFrom.split(":").map(Number);
        const [eToHours, eToMinutes] = res.timeTo.split(":").map(Number);

        // Create DateTime objects for existing reservation
        const existingFrom = DateTime.utc().set({
          hour: eFromHours,
          minute: eFromMinutes,
        });
        const existingTo = DateTime.utc().set({
          hour: eToHours,
          minute: eToMinutes,
        });
        return newFrom < existingTo && newTo > existingFrom;
      });

      if (isOverlapping) {
        return Fail(
          `Time slot ${data.timeFrom} - ${
            data.timeTo
          } is already reserved for ${toDate(data.date).toLocaleDateString(
            "fr-FR",
          )}`,
          ErrorCodes.RECORD_ALREADY_EXISTS,
        );
      }
      // Generate a unique reservation number (e.g., VET-YYYY-MMDD-XXXX)

      const reservationNumber = ReservationService.generateRerservationNumber();

      const [reservation] = await this.db
        .insert(ReservationTable)
        .values({
          ...data,
          reservationNumber,
          status: "oncoming",
        })
        .returning();

      return Ok(reservation);
    } catch (error) {
      return Fail(
        `Failed to create reservation: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        MatchErrorCode(error as Error),
        error as Error,
      );
    }
  }
  public async generateTimeSlots({
    date,
    startHour = 9, // Default: 9 AM
    endHour = 17, // Default: 5 PM
    durationMinutes = 30,
    excludeReservations = true,
  }: GenerateTimeSlotsOptions): Promise<Result<TimeSlot[]>> {
    try {
      // Normalize the given date to midnight.

      // Retrieve reserved slots for that day.
      let reservedSlots: { time: TimeSlot; date: ReservationDate }[] = [];
      if (excludeReservations) {
        const reservations = await this.db
          .select({
            time: {
              from: ReservationTable.timeFrom,
              to: ReservationTable.timeTo,
            },
            date: ReservationTable.date,
          })
          .from(ReservationTable)
          // .where(eq(ReservationTable.date, toReservationDate(date)))
          .all();

        reservedSlots = reservations;
      }
      console.log(date);

      const freeSlots: TimeSlot[] = [];

      // Helper: convert "HH:mm" into total minutes since midnight.
      const timeToMinutes = (time: string): number => {
        const [hour, minute] = time.split(":").map(Number);
        return hour * 60 + minute;
      };

      // Helper: check if two time slots overlap.
      const overlaps = (slot: TimeSlot, reserved: TimeSlot): boolean => {
        const slotStart = timeToMinutes(slot.from);
        const slotEnd = timeToMinutes(slot.to);
        const reservedStart = timeToMinutes(reserved.from);
        const reservedEnd = timeToMinutes(reserved.to);
        console.log(slotStart, reservedStart);
        // Overlap occurs if the start of one slot is before the end of the other, and vice versa.
        return slotStart < reservedEnd && slotEnd > reservedStart;
      };

      // Generate potential slots.
      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += durationMinutes) {
          // Create slot start and end Date objects.
          const slotStart = new Date(date);
          slotStart.setHours(hour, minute, 0, 0);
          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotStart.getMinutes() + durationMinutes);

          // Format the times as "HH:mm" (24-hour format).
          const from = slotStart.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
          const to = slotEnd.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });

          const newSlot: TimeSlot = { from, to };
          let overlaps = false;

          for (const existingSlot of reservedSlots) {
            const sameDay = isSameDay(
              toReservationDate(date),
              existingSlot.date,
            );
            if (sameDay) {
              const _eq = isDeepStrictEqual(existingSlot.time, newSlot);
              overlaps = _eq;
              if (_eq) {
                break;
              }
            }
          }
          if (!overlaps) freeSlots.push(newSlot);
        }
      }

      return Ok(freeSlots);
    } catch (error) {
      return Fail(
        `Failed to generate time slots: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        MatchErrorCode(error as Error),
        error as Error,
      );
    }
  }

  public async getHistory({
    petId,
  }: {
    petId?: number;
  }): AsyncResult<ReservationHistoryRow[]> {
    if (!petId) return Fail("Missing pet id", ErrorCodes.VALIDATION_ERROR);
    const reservations = await this.db
      .select(ReservationHistoryJoinColumns)
      .from(ReservationTable)
      .innerJoin(PetTable, eq(ReservationTable.petId, PetTable.id))
      .innerJoin(UserTable, eq(ReservationTable.userId, UserTable.id))
      .where(eq(PetTable.id, petId))
      .all();

    return Ok(reservations);
  }

  // public async generateTimeSlots({
  //   date,
  //   startHour = 9, // Default: 9 AM
  //   endHour = 17, // Default: 5 PM
  //   durationMinutes = 30,
  //   excludeReservations = true,
  // }: GenerateTimeSlotsOptions): Promise<Result<TimeSlot[]>> {
  //   try {
  //     // Normalize the date to midnight
  //     const startDate = new Date(date);
  //     startDate.setHours(0, 0, 0, 0);

  //     const endDate = new Date(startDate);
  //     endDate.setHours(23, 59, 59, 999);

  //     // Get existing reservations for the date if needed
  //     let existingReservations: SelectReservation[] = [];
  //     if (excludeReservations) {
  //       existingReservations = await this.db
  //         .select()
  //         .from(ReservationTable)
  //         .where(eq(ReservationTable.date, startDate))
  //         .all();
  //     }

  //     const slots: TimeSlot[] = [];
  //     const reservedTimes = new Set(
  //       existingReservations.map((r) => new Date(r.date).getTime()),
  //     );

  //     // Generate slots
  //     for (let hour = startHour; hour < endHour; hour++) {
  //       for (let minute = 0; minute < 60; minute += durationMinutes) {
  //         const slotStart = new Date(date);
  //         slotStart.setHours(hour, minute, 0, 0);

  //         const slotEnd = new Date(slotStart);
  //         slotEnd.setMinutes(slotStart.getMinutes() + durationMinutes);

  //         // Skip if slot is already reserved
  //         if (excludeReservations && reservedTimes.has(slotStart.getTime())) {
  //           continue;
  //         }

  //         // Format times for display
  //         const from = slotStart.toLocaleTimeString("en-US", {
  //           hour: "2-digit",
  //           minute: "2-digit",
  //           hour12: false,
  //         });

  //         const to = slotEnd.toLocaleTimeString("en-US", {
  //           hour: "2-digit",
  //           minute: "2-digit",
  //           hour12: false,
  //         });

  //         slots.push({ from, to });
  //       }
  //     }

  //     return Ok(slots);
  //   } catch (error) {
  //     return Fail(
  //       `Failed to generate time slots: ${
  //         error instanceof Error ? error.message : "Unknown error"
  //       }`,
  //       ErrorCodes.UNKNOWN,
  //     );
  //   }
  // }
}
