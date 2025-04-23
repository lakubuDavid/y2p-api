// File: test/reservation.test.ts
import { expect, test, describe, beforeEach, mock, afterAll } from "bun:test";
import { ReservationService } from "../../src/services/reservation";
import { ErrorCodes } from "../../lib/error";
import { ReservationTable } from "../../src/db/schemas/reservation";
import { PetTable } from "../../src/db/schemas/pet";
import { UserTable } from "../../src/db/schemas/user";
import { ReservationStatus } from "../../src/models/reservation";

describe("ReservationService", () => {
  let reservationService;
  let mockDb;
  const jwtSecret = "test_secret";

  // Mock the static method to generate reservation numbers
  const originalGenerateMethod = ReservationService.generateRerservationNumber;
  ReservationService.generateRerservationNumber = () => "VET-20250417-TEST";

  beforeEach(() => {
    // Setup mock database
    mockDb = {
      select: mock(() => ({
        from: mock(() => ({
          where: mock(() => [
            {
              id: 1,
              petId: 1,
              userId: 1,
              reservationNumber: "VET-20250417-TEST",
              date: "2025-04-17",
              timeFrom: "10:00",
              timeTo: "11:00",
              status: "oncoming",
              createdAt: new Date(),
            },
          ]),
          all: mock(() => [
            {
              id: 1,
              petId: 1,
              userId: 1,
              reservationNumber: "VET-20250417-TEST",
              date: "2025-04-17",
              timeFrom: "10:00",
              timeTo: "11:00",
              status: "oncoming",
              createdAt: new Date(),
            },
          ]),
          innerJoin: mock(() => ({
            innerJoin: mock(() => ({
              where: mock(() => ({
                get: mock(() => ({
                  pet: { id: 1, name: "Buddy", specie: "Dog" },
                  user: { id: 1, name: "John", surname: "Doe" },
                  reservation: {
                    id: 1,
                    date: "2025-04-17",
                    timeFrom: "10:00",
                    timeTo: "11:00",
                    status: "oncoming",
                    reservationNumber: "VET-20250417-TEST",
                    createdAt: new Date(),
                  },
                })),
              })),
              $dynamic: mock(() => ({
                where: mock(() => ({
                  execute: mock(() => []),
                })),
                execute: mock(() => []),
              })),
            })),
          })),
        })),
        returning: mock(() => [
          [
            {
              id: 1,
              petId: 1,
              userId: 1,
              reservationNumber: "VET-20250417-TEST",
              date: "2025-04-17",
              timeFrom: "10:00",
              timeTo: "11:00",
              status: "oncoming",
            },
          ],
        ]),
      })),
      insert: mock(() => ({
        values: mock(() => ({
          returning: mock(() => [
            {
              id: 1,
              petId: 1,
              userId: 1,
              reservationNumber: "VET-20250417-TEST",
              date: "2025-04-17",
              timeFrom: "10:00",
              timeTo: "11:00",
              status: "oncoming",
            },
            ,
          ]),
        })),
      })),
      update: mock(() => ({
        set: mock(() => ({
          where: mock(() => ({
            returning: mock(() => [
              {
                id: 1,
                petId: 1,
                userId: 1,
                reservationNumber: "VET-20250417-TEST",
                date: "2025-04-17",
                timeFrom: "10:00",
                timeTo: "11:00",
                status: "canceled",
              },
              ,
            ]),
          })),
        })),
      })),
      delete: mock(() => ({
        where: mock(() => ({
          returning: mock(() => [
            {
              id: 1,
              petId: 1,
              userId: 1,
              reservationNumber: "VET-20250417-TEST",
              date: "2025-04-17",
              timeFrom: "10:00",
              timeTo: "11:00",
              status: "oncoming",
            },
            ,
          ]),
        })),
      })),
      transaction: mock((callback) => callback(mockDb)),
    };

    reservationService = new ReservationService(mockDb, jwtSecret);
  });

  // Clean up the static method mock after tests
  afterAll(() => {
    ReservationService.generateRerservationNumber = originalGenerateMethod;
  });

  describe("create method", () => {
    test("should create a reservation successfully", async () => {
      // No other reservation on the same day
      // The pet already exists
      // The user already exists
      mockDb.select = mock(() => ({
        from: mock((table) =>
          table === PetTable
            ? {
                where: mock(() => ({
                  get: mock(() => [{ id: 1, name: "Buddy", specie: "Dog" }]),
                })),
              }
            : table === ReservationTable
              ? {
                  where: mock(() => ({
                    all: mock(() => []),
                  })),
                }
              : {},
        ),
      }));

      const reservationData = {
        petId: 1,
        userId: 1,
        date: "2025-04-17",
        timeFrom: "10:00",
        timeTo: "11:00",
      };

      const result = await reservationService.create(reservationData);
      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.data.reservationNumber).toBe("VET-20250417-TEST");
      expect(result.data.status).toBe("oncoming");
    });

    test("should return error if pet not found", async () => {
      // Mock the pet not found scenario
      mockDb.select = mock(() => ({
        from: mock((table) =>
          table === PetTable
            ? {
                where: mock(() => ({
                  get: mock(() => null),
                })),
              }
            : table === ReservationTable
              ? {
                  where: mock(() => ({
                    all: mock(() => []),
                  })),
                }
              : {},
        ),
      }));
      const reservationData = {
        petId: 999, // Non-existent pet ID
        userId: 1,
        date: "2025-04-17",
        timeFrom: "10:00",
        timeTo: "11:00",
      };

      const result = await reservationService.create(reservationData);

      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe(ErrorCodes.NOT_FOUND);
      expect(result.error.message).toContain("Pet with ID 999 not found");
    });
  });

  describe("cancel method", () => {
    test("should cancel a reservation successfully", async () => {
      const result = await reservationService.cancel(1);

      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.data.status).toBe("canceled");
      expect(mockDb.update).toHaveBeenCalled();
    });

    test("should return error if cancellation fails", async () => {
      // Mock a database error
      mockDb.update = mock(() => {
        throw new Error("Database error");
      });

      const result = await reservationService.cancel(1);

      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain("Failed to update reservation");
    });
  });

  describe("delete method", () => {
    test("should delete a reservation successfully", async () => {
      const result = await reservationService.delete(1);

      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(mockDb.delete).toHaveBeenCalled();
    });

    test("should return error if deletion fails", async () => {
      // Mock a database error
      mockDb.delete = mock(() => {
        throw new Error("Database error");
      });

      const result = await reservationService.delete(1);

      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain("Failed to update reservation");
    });
  });

  describe("update method", () => {
    test("should update a reservation successfully", async () => {
      const updateData = {
        date: "2025-04-18",
        status: "rescheduled" as ReservationStatus,
      };

      const result = await reservationService.update(1, updateData);

      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(mockDb.update).toHaveBeenCalled();
    });

    test("should return error if update fails", async () => {
      // Mock a database error
      mockDb.update = mock(() => {
        throw new Error("Database error");
      });

      const updateData = { status: "rescheduled" as ReservationStatus };
      const result = await reservationService.update(1, updateData);

      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain("Failed to update reservation");
    });
  });

  describe("getById method", () => {
    test("should return a reservation when given valid ID", async () => {
      const result = await reservationService.getById(1);

      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.data.id).toBe(1);
    });

    test("should return error if reservation not found", async () => {
      // Mock reservation not found
      mockDb.select = mock(() => ({
        from: mock(() => ({
          where: mock(() => []),
        })),
      }));

      const result = await reservationService.getById(999);

      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe(ErrorCodes.NOT_FOUND);
    });
  });

  describe("getByNumber method", () => {
    test("should return a reservation record when given valid reservation number", async () => {
      const result = await reservationService.getByNumber("VET-20250417-TEST");

      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.data.reservation.reservationNumber).toBe(
        "VET-20250417-TEST",
      );
      expect(result.data.pet).toBeDefined();
      expect(result.data.user).toBeDefined();
    });

    test("should return error if reservation not found by number", async () => {
      // Mock empty result
      mockDb.select = mock(() => ({
        from: mock(() => ({
          innerJoin: mock(() => ({
            innerJoin: mock(() => ({
              where: mock(() => ({
                get: mock(() => null),
              })),
            })),
          })),
        })),
      }));
      const result = await reservationService.getByNumber("NONEXISTENT");

      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe(ErrorCodes.NOT_FOUND);
    });
  });

  describe("all method", () => {
    test("should return all reservations", async () => {
      // Additional mock setup for the complex query
      mockDb.transaction = mock((callback) => {
        return callback({
          select: mock(() => ({
            from: mock(() => ({
              innerJoin: mock(() => ({
                innerJoin: mock(() => ({
                  $dynamic: mock(() => ({
                    execute: mock(() => [
                      {
                        pet: { id: 1, name: "Buddy", specie: "Dog" },
                        user: { id: 1, name: "John", surname: "Doe" },
                        reservation: {
                          id: 1,
                          date: { day: 17, month: 4, year: 2025 },
                          timeFrom: "10:00",
                          timeTo: "11:00",
                          status: "oncoming",
                          reservationNumber: "VET-20250417-TEST",
                          createdAt: new Date(),
                        },
                      },
                    ]),
                  })),
                })),
              })),
            })),
          })),
          update: mock(() => ({
            set: mock(() => ({
              where: mock(() => []),
            })),
          })),
        });
      });

      const result = await reservationService.all();

      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(1);
      expect(result.data[0].reservation.time).toBeDefined();
      expect(result.data[0].reservation.time.from).toBe("10:00");
      expect(result.data[0].reservation.time.to).toBe("11:00");
    });

    test("should apply filters when provided", async () => {
      // Setup mock to verify filter application
      const dynamicExecuteMock = mock(() => [
        {
          pet: { id: 1, name: "Buddy", specie: "Dog" },
          user: { id: 1, name: "John", surname: "Doe" },
          reservation: {
            id: 1,
            date: "2025-04-17",
            timeFrom: "10:00",
            timeTo: "11:00",
            status: "oncoming",
            reservationNumber: "VET-20250417-TEST",
            createdAt: new Date(),
          },
        },
      ]);

      const dynamicWhereMock = mock(() => ({
        where: dynamicWhereMock,
        execute: dynamicExecuteMock,
      }));

      mockDb.transaction = mock((callback) => {
        return callback({
          select: mock(() => ({
            from: mock(() => ({
              innerJoin: mock(() => ({
                innerJoin: mock(() => ({
                  $dynamic: mock(() => ({
                    where: dynamicWhereMock,
                  })),
                })),
              })),
            })),
          })),
        });
      });

      const filter = {
        status: ["oncoming"],
        userId: 1,
      };

      const result = await reservationService.all(filter);

      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(dynamicWhereMock).toHaveBeenCalled();
    });

    test("should handle database errors", async () => {
      // Mock transaction to throw error
      mockDb.transaction = mock(() => {
        throw new Error("Database error");
      });

      const result = await reservationService.all();

      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain("Failed to fetch reservations");
    });
  });

  describe("generateTimeSlots method", () => {
    test("should generate time slots for a given date", async () => {
      // Mock to return some reserved slots
      mockDb.select = mock(() => ({
        from: mock((table) =>
          table === ReservationTable
            ? {
                where: mock(() => ({
                  all: mock(() => [
                    {
                      timeFrom: "10:00",
                      timeTo: "10:30",
                      time: { from: "10:00", to: "10:30" },
                      date:{
                        day:17,
                        month:4,
                        year:2025
                      }
                    },
                    {
                      timeFrom: "13:00",
                      timeTo: "13:30",
                      time: { from: "13:00", to: "13:30" },
                      date:{
                        day:17,
                        month:4,
                        year:2025
                      }
                    },
                  ]),
                })),
                all: mock(() => [
                  {
                    timeFrom: "10:00",
                    timeTo: "10:30",
                    time: { from: "10:00", to: "10:30" },
                      date:{
                        day:17,
                        month:4,
                        year:2025
                      }
                  },
                  {
                    timeFrom: "13:00",
                    timeTo: "13:30",
                    time: { from: "13:00", to: "13:30" },
                      date:{
                        day:17,
                        month:4,
                        year:2025
                      }
                  },
                ]),
              }
            : {},
        ),
      }));

      const options = {
        date: new Date("2025-04-17"),
        startHour: 9,
        endHour: 17,
        durationMinutes: 30,
      };

      const result = await reservationService.generateTimeSlots(options);

      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      // 8 hours with 30 minute slots = 16 slots
      expect(result.data.length).toBeGreaterThan(0);
    });

    test("should exclude reserved slots when requested", async () => {
      // Mock to return some reserved slots
      mockDb.select = mock(() => ({
        from: mock((table) =>
          table === ReservationTable
            ? {
                where: mock(() => ({
                  all: mock(() => [
                    {
                      timeFrom: "10:00",
                      timeTo: "10:30",
                      time: { from: "10:00", to: "10:30" },
                      date:{
                        day:17,
                        month:4,
                        year:2025
                      }
                    },
                    {
                      timeFrom: "13:00",
                      timeTo: "13:30",
                      time: { from: "13:00", to: "13:30" },
                      date:{
                        day:17,
                        month:4,
                        year:2025
                      }
                    },
                  ]),
                })),
                all: mock(() => [
                  {
                    timeFrom: "10:00",
                    timeTo: "10:30",
                    time: { from: "10:00", to: "10:30" },
                      date:{
                        day:17,
                        month:4,
                        year:2025
                      }
                  },
                  {
                    timeFrom: "13:00",
                    timeTo: "13:30",
                    time: { from: "13:00", to: "13:30" },
                      date:{
                        day:17,
                        month:4,
                        year:2025
                      }
                  },
                ]),
              }
            : {},
        ),
      }));

      const options = {
        date: new Date("2025-04-17"),
        excludeReservations: true,
      };

      const result = await reservationService.generateTimeSlots(options);

      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();

      // Check that reserved slots are excluded
      const containsReservedSlot = result.data.some(
        (slot) =>
          (slot.from === "10:00" && slot.to === "10:30") ||
          (slot.from === "13:00" && slot.to === "13:30"),
      );

      expect(containsReservedSlot).toBe(false);
    });
  });
});
