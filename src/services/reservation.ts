// src/services/reservation.ts
import { eq, and, gte, lte, inArray, or, lt } from "drizzle-orm";
import { LibSQLDatabase } from "drizzle-orm/libsql";
import {
  ReservationTable,
  CreateReservation,
  SelectReservation,
  ReservationStatus,
} from "../db/schemas/reservation";
import { PetTable } from "../db/schemas/pet";
import { BaseService } from "./service";
import { UserTable } from "../db/schemas/user";
import { ErrorCodes, Fail, Ok, Result } from "../../lib/error";

import { normalizeDate, normalizedDate } from "../../lib/utils";

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
  date?: Date;
}
// interface QueryReservationFilter{
//   status? : `${ReservationStatus}`
// }

export class ReservationService extends BaseService {
  constructor(db: LibSQLDatabase, jwtSecret: string) {
    super(db, jwtSecret);
  }
  public async cancel(id: number) : Promise<Result<SelectReservation>> {
    try {
      const [reservation] = await this.db
        .update(ReservationTable)
        .set({
          status:"canceled"
        })
        .where(eq(ReservationTable.id, id))
        .returning();
      return Ok(reservation)
    } catch (error) {
      return Fail(
        `Failed to update reservation: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        ErrorCodes.UNKNOWN,
      );
    }
  }
  public async delete(id: number) : Promise<Result<SelectReservation>> {
    try {
      const [reservation] = await this.db
        .delete(ReservationTable)
        .where(eq(ReservationTable.id, id))
        .returning();
      return Ok(reservation)
    } catch (error) {
      return Fail(
        `Failed to update reservation: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        ErrorCodes.UNKNOWN,
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
      const [updatedReservation] = await this.db
        .update(ReservationTable)
        .set(value)
        .where(eq(ReservationTable.id, id))
        .returning();

      return Ok(updatedReservation);
    } catch (error) {
      return Fail(
        `Failed to update reservation: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        ErrorCodes.UNKNOWN,
      );
    }
  }
  public async getById(id: number): Promise<Result<SelectReservation>> {
    try {
      const [reservation] = await this.db
        .select()
        .from(ReservationTable)
        .where(eq(ReservationTable.id, id));

      return Ok(reservation);
    } catch (err) {
      return Fail("Database error");
    }
  }
  // export interface QueryReservationFilter {
  //   status?: string;
  //   userId?: number;
  //   petId?: number;
  //   date?: Date;
  // }

  public async all(filter?: QueryReservationFilter): Promise<Result<any[]>> {
    try {
      console.log(filter?.status);
      const reservations = await this.db.transaction(async (tx) => {
        let query = tx
          .select({
            pet: {
              id: PetTable.id,
              name: PetTable.name,
              specie: PetTable.specie,
            },
            user: {
              id: UserTable.id,
              name: UserTable.name,
              surname: UserTable.surname,
              email: UserTable.email,
              phoneNumber: UserTable.phoneNumber,
            },
            reservation: {
              date: ReservationTable.date,
              status: ReservationTable.status,
              createdAt: ReservationTable.createdAt,
              id: ReservationTable.id,
            },
          })
          .from(ReservationTable)
          .leftJoin(PetTable, eq(ReservationTable.petId, PetTable.id))
          .leftJoin(UserTable, eq(ReservationTable.userId, UserTable.id));
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
          if (filter.date)
            dynamicQuery = dynamicQuery.where(
              eq(ReservationTable.date, filter.date),
            );
        }
        const allReservations = await dynamicQuery.execute();

        // Detect stale reservations
        const now = new Date();
        const staleReservations = allReservations.filter(
          (reservation) =>
            reservation.reservation.status === "oncoming" &&
            new Date(reservation.reservation.date).getTime() < now.getTime(),
        );

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
                  reservation: { ...reservation.reservation, status: "late" },
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
        ErrorCodes.UNKNOWN,
      );
    }
  }

  public async create(
    data: Omit<CreateReservation, "id" | "createdAt" | "status">,
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
          ErrorCodes.VALIDATION_ERROR,
        );
      }
      console.log("date", data.date);
      const _normalizedDate = normalizedDate(data.date);
      console.log("normalized date", _normalizedDate);
      console.log("normalized utc date", normalizedDate(data.date));
      console.log("date", data.date);

      // Normalize the date to 00:00:00 for comparison
      const dateStart = new Date(data.date);
      dateStart.setUTCHours(0, 0, 0, 0);
      console.log("start", dateStart);

      const dateEnd = new Date(data.date);
      dateEnd.setUTCHours(23, 59, 59, 999);
      console.log("end", dateEnd);

      // Fetch all reservations for the same day
      const reservations = await this.db
        .select()
        .from(ReservationTable)
        .where(
          and(
            gte(ReservationTable.date, dateStart),
            lte(ReservationTable.date, dateEnd),
          ),
        )
        .all();

      console.log("todays reservations", reservations);

      const newFrom = new Date(dateStart);
      const [fromHours, fromMinutes] = data.timeFrom.split(":").map(Number);
      newFrom.setUTCHours(fromHours, fromMinutes, 0, 0);

      const newTo = new Date(dateStart);
      const [toHours, toMinutes] = data.timeTo.split(":").map(Number);
      newTo.setUTCHours(toHours, toMinutes, 0, 0);

      console.log("with time from,to", newFrom, newTo);

      // Check for overlapping reservations
      const isOverlapping = reservations.some((res) => {
        const existingFrom = new Date(res.date);
        const [eFromHours, eFromMinutes] = res.timeFrom.split(":").map(Number);
        console.log("existsing from", existingFrom);
        existingFrom.setHours(eFromHours, eFromMinutes, 0, 0);
        console.log("existsing from", existingFrom);

        const existingTo = new Date(res.date);
        const [eToHours, eToMinutes] = res.timeTo.split(":").map(Number);
        console.log("existsing to", existingTo);
        existingTo.setHours(eToHours, eToMinutes, 0, 0);
        console.log("existsing to", existingTo);

        return (
          (newFrom >= existingFrom && newFrom < existingTo) || // Starts inside another reservation
          (newTo > existingFrom && newTo <= existingTo) || // Ends inside another reservation
          (newFrom <= existingFrom && newTo >= existingTo) // Completely overlaps another reservation
        );
      });

      if (isOverlapping) {
        return Fail(
          `Time slot ${data.timeFrom} - ${
            data.timeTo
          } is already reserved for ${new Date(
            data.date,
          ).toLocaleDateString()}`,
          ErrorCodes.RECORD_ALREADY_EXISTS,
        );
      }
      // const existingReservation = await this.db
      //   .select()
      //   .from(ReservationTable)
      //   .where(
      //     and(
      //       eq(ReservationTable.date, normalizedDate),
      //       or(
      //         and(
      //           gte(ReservationTable.timeFrom, data.timeFrom),
      //           lt(ReservationTable.timeFrom, data.timeTo),
      //         ),
      //         and(
      //           gte(ReservationTable.timeTo, data.timeFrom),
      //           lt(ReservationTable.timeTo, data.timeTo),
      //         ),
      //       ),
      //     ),
      //   )
      //   .get();

      // if (existingReservation) {
      //   console.log("Existing res", existingReservation);
      //   return Fail(
      //     `Time slot already reserved for ${new Date(
      //       data.date,
      //     ).toLocaleDateString()} , ${data.timeFrom} - ${data.timeTo}`,
      //     ErrorCodes.RECORD_ALREADY_EXISTS,
      //   );
      // }

      const [reservation] = await this.db
        .insert(ReservationTable)
        .values({
          ...data,
          date: _normalizedDate,
          status: "oncoming",
        })
        .returning();

      return Ok(reservation);
    } catch (error) {
      return Fail(
        `Failed to create reservation: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        ErrorCodes.UNKNOWN,
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
      const _normalizedDate = normalizedDate(date);

      // Retrieve reserved slots for that day.
      let reservedSlots: TimeSlot[] = [];
      if (excludeReservations) {
        const reservations = await this.db
          .select({
            timeFrom: ReservationTable.timeFrom,
            timeTo: ReservationTable.timeTo,
          })
          .from(ReservationTable)
          .where(eq(ReservationTable.date, _normalizedDate))
          .all();

        reservedSlots = reservations.map((reservation) => ({
          from: reservation.timeFrom,
          to: reservation.timeTo,
        }));
      }

      console.log("reserved slots", reservedSlots);

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
        // Overlap occurs if the start of one slot is before the end of the other, and vice versa.
        return slotStart < reservedEnd && slotEnd > reservedStart;
      };

      // Generate potential slots.
      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += durationMinutes) {
          // Create slot start and end Date objects.
          const slotStart = new Date(_normalizedDate);
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
          // console.log(newSlot);
          // Check for any overlap with reserved slots.
          const hasOverlap = reservedSlots.some((reserved) =>
            overlaps(newSlot, reserved),
          );
          if (hasOverlap) {
            continue; // Skip this slot if it overlaps.
          }

          freeSlots.push(newSlot);
        }
      }

      return Ok(freeSlots);
    } catch (error) {
      return Fail(
        `Failed to generate time slots: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        ErrorCodes.UNKNOWN,
      );
    }
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
