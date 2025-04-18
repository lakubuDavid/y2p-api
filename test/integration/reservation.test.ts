import { expect, test, beforeAll, afterAll, describe } from "bun:test";
import { ReservationService } from "../src/services/reservation";
// import { db } from "../src/db"; // Use in-memory/mock DB
import * as libsql from "@libsql/client";
// import { CreateReservation } from "../src/types";
import { eq } from "drizzle-orm";
import {
  ReservationTable,
  CreateReservation,
} from "../src/db/schemas/reservation";
import { normalizedDate } from "../lib/utils";
import { drizzle, LibSQLDatabase } from "drizzle-orm/libsql";

let service: ReservationService;
let db: LibSQLDatabase;

let currentReservation = 0;

describe("ReservationService", () => {
  beforeAll(async () => {
    const client = libsql.createClient({
      url: process.env.TURSO_DB_URL || "libsql://y2p-lakubudavid.turso.io",
      authToken:
        process.env.TURSO_TOKEN ||
        "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3Mzg5ODg0MzcsImlkIjoiYTA4ZTdhMGMtMjgwZi00YzdhLWFiYWYtZDY5MGU1ODNkMzAwIn0.uB50IPnzRrThsW8qlv9-wzomnf_2StJ5Z9TYdTpzQckcHRgFLRY0rorCvI7uw8BBNnq8-NDNsZ4RFcbRh3gFAQ",
    });

    db = drizzle({ client });
    service = new ReservationService(db, "JWT_SECRET");
  });

  afterAll(async () => {
    // await db.with();
  });

  test("should create a reservation and verify the response time", async () => {
    const newReservation: Omit<
      CreateReservation,
      "id" | "createdAt" | "status"
    > = {
      petId: 11,
      userId: 12,
      date: normalizedDate(new Date("2025-04-12")), // Ensure midnight time
      timeFrom: "10:00",
      timeTo: "10:30",
    };

    const result = await service.create(newReservation);
    expect(result).toBeDefined();
    expect(result.data?.timeFrom).toBe(newReservation.timeFrom);
    expect(result.data?.timeTo).toBe(newReservation.timeTo);

    currentReservation = result.data?.id ?? 0;
  });

  test("should update the reservation time and verify changes", async () => {
    const existingReservation = await service.getById(currentReservation);
    expect(existingReservation).toBeDefined();
    expect(existingReservation.data).toBeDefined();

    const updatedTimeFrom = "11:00";
    const updatedTimeTo = "11:30";

    const updateResult = await service.update(existingReservation!.data!.id, {
      timeFrom: updatedTimeFrom,
      timeTo: updatedTimeTo,
    });

    expect(updateResult).toBeTruthy();
    expect(updateResult.data?.timeFrom).toBe(updatedTimeFrom);
    expect(updateResult.data?.timeTo).toBe(updatedTimeTo);
  });

  test("should cancel the reservation and verify status changed", async () => {
    const cancelResult = await service.cancel(currentReservation);
    expect(cancelResult).toBeDefined();
    expect(cancelResult.data?.status).toBe("canceled");

    // Retrieve again to verify the cancellation was persisted
    const canceledReservation = await service.getById(currentReservation);
    expect(canceledReservation).toBeDefined();
    expect(canceledReservation.data?.status).toBe("canceled");
  });

  test("should delete the reservation and ensure it no longer exists", async () => {
    const deleteResult = await service.delete(currentReservation);
    expect(deleteResult.data).toBeDefined();

    const deletedReservation = await service.getById(currentReservation);
    expect(deletedReservation.data).toBeUndefined();
  });
});
