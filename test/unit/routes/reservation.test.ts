// File: test/unit/routes/reservation.test.ts
import { expect, test, describe, beforeEach, mock, Mock } from "bun:test";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { ReservationService } from "../../../src/services/reservation";
import { StaffService } from "../../../src/services/staff";
import { MagicLinkService } from "../../../src/services/magicLink";
import { NotificationService } from "../../../src/services/notification";
import { PetService } from "../../../src/services/pet";
import { ErrorCodes, Ok, Fail, MatchHTTPCode } from "../../../lib/error";
import reservation from "../../../src/routes/reservation";
import { responseFormatter } from "../../../src/middlewares/response";
import { AuthService } from "../../../src/services/auth";
import { UserService } from "../../../src/services/user";
import { ZodError } from "zod";

declare module "hono" {
  interface ContextVariableMap {
    authService: AuthService;
    petService: PetService;
    staffService: StaffService;
    reservationService: ReservationService;
    userService: UserService;
    magicLinkService: MagicLinkService;
    notificationService: NotificationService;
  }
}
describe("Reservation Routes", () => {
  let app: Hono;
  let mockReservationService: any;
  let mockPetService: any;
  let mockUserService: any;
  let mockNotificationService: any;

  beforeEach(() => {
    // Create mock services
    mockReservationService = {
      create: mock(() =>
        Ok({
          id: 1,
          reservationNumber: "VET-20250417-123",
          status: "oncoming",
        }),
      ),
      all: mock(() =>
        Ok([
          {
            reservation: {
              id: 1,
              reservationNumber: "VET-20250417-123",
              status: "oncoming",
              time: {
                from: "8:00",
                to: "8:30",
              },
            },
          },
        ]),
      ),
      getById: mock(() =>
        Promise.resolve(
          Ok({
            reservation: {
              id: 1,
              reservationNumber: "VET-20250417-123",
              status: "oncoming",
              time: {
                from: "8:00",
                to: "8:30",
              },
            },
          }),
        ),
      ),
      getByNumber: mock(() =>
        Ok({
          reservation: {
            id: 1,
            reservationNumber: "VET-20250417-123",
            status: "oncoming",
            time: {
              from: "8:00",
              to: "8:30",
            },
          },
        }),
      ),
      update: mock(() =>
        Ok({
          id: 1,
          reservationNumber: "VET-20250417-123",
          status: "rescheduled",
        }),
      ),
      delete: mock(() =>
        Ok({
          id: 1,
          reservationNumber: "VET-20250417-123",
          status: "canceled",
        }),
      ),
      generateTimeSlots: mock(() =>
        Ok([
          { from: "09:00", to: "09:30" },
          { from: "09:30", to: "10:00" },
        ]),
      ),
    };

    mockPetService = {
      get: mock(() => Ok({ id: 1, name: "Buddy", specie: "Dog" })),
    };

    mockUserService = {
      get: mock(() =>
        Ok({ id: 1, email: "user@example.com", name: "Test User" }),
      ),
    };
    mockNotificationService = {
      sendReservationEmail: mock(() => Promise.resolve(true)),
    };

    // Create app instance with mock services
    app = new Hono();
    app.use(responseFormatter);
    app.use("*", (c, next) => {
      c.set("reservationService", mockReservationService);
      c.set("petService", mockPetService);
      c.set("userService", mockUserService);
      c.set("notificationService", mockNotificationService);
      return next();
    });

    // Add reservation routes
    app.route("/reservation", reservation);

    app.onError((error, c) => {
      if (error instanceof ZodError) {
        // console.log(error.message)
        return c.json(
          { error: error, status: "error", message: error.message },
          MatchHTTPCode(ErrorCodes.VALIDATION_ERROR),
        );
      }
      if (error instanceof HTTPException)
        return c.json(
          {
            error: error.cause ?? error.status,
            status: "error",
            message: error.message,
          },
          MatchHTTPCode(ErrorCodes.UNKNOWN),
        );
      return c.json(
        {
          error: error.cause ?? error,
          status: "error",
          message: error.message,
        },
        MatchHTTPCode(ErrorCodes.UNKNOWN),
      );
    });
  });

  test("GET /reservation should call all() with correct filters", async () => {
    const req = new Request(
      "http://localhost/reservation?status=oncoming,canceled&userId=1",
    );
    const res = await app.fetch(req);
    const result = await res.json();

    expect(res.status).toBe(200);
    expect(mockReservationService.all).toHaveBeenCalledTimes(1);

    // Check that filters were correctly passed
    const filters = mockReservationService.all.mock.calls[0][0];
    expect(filters).toBeDefined();
    expect(filters.status).toEqual(["oncoming", "canceled"]);
    expect(filters.userId).toBe(1);

    expect(result.data).toBeDefined();
  });

  test("GET /reservation with invalid filters should return validation error", async () => {
    const req = new Request(
      "http://localhost/reservation?status=invalid&userId=abc",
    );
    const res = await app.fetch(req);

    expect(res.status).toBe(400);

    const result = await res.json();

    expect(result.error).toBeDefined();
    expect(result.code).toBe(ErrorCodes.VALIDATION_ERROR);
  });

  test("POST /reservation should call create() with correct parameters", async () => {
    const requestBody = {
      petInfo: { id: 1 },
      userInfo: { id: 1 },
      reservationInfo: {
        date: { year: 2025, month: 4, day: 20 },
        time: { from: "10:00", to: "11:00" },
        service: "grooming",
      },
    };

    const inServiceData = {
      date: requestBody.reservationInfo.date,
      petId: requestBody.petInfo.id,
      userId: requestBody.userInfo.id,
      timeFrom: requestBody.reservationInfo.time.from,
      timeTo: requestBody.reservationInfo.time.to,
      service: "grooming",
    };

    const req = new Request("http://localhost/reservation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const res = await app.fetch(req);
    const result = await res.json();
    console.log(result.error);

    expect(res.status).toBe(200);

    expect(mockReservationService.create).toHaveBeenCalledTimes(1);
    expect(mockReservationService.create.mock.calls[0][0]).toEqual(
      inServiceData,
    );

    expect(result.data).toBeDefined();
    expect(result.data.reservationNumber).toBeDefined();
  });

  test("POST /reservation with invalid data should return validation error", async () => {
    const invalidBody = {
      petId: "not-a-number",
      userId: 1,
      date: "invalid-date",
      timeFrom: "not-a-time",
      timeTo: "11:00",
    };

    const req = new Request("http://localhost/reservation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invalidBody),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(400);

    const result = await res.json();
    expect(result.error).toBeDefined();
    expect(result.code).toBe(ErrorCodes.VALIDATION_ERROR);
  });

  test("GET /reservation/check/:number should call getByNumber() with correct parameter", async () => {
    const req = new Request(
      "http://localhost/reservation/check/VET-20250417-123",
    );
    const res = await app.fetch(req);

    expect(res.status).toBe(200);
    expect(mockReservationService.getByNumber).toHaveBeenCalledTimes(1);
    expect(mockReservationService.getByNumber.mock.calls[0][0]).toBe(
      "VET-20250417-123",
    );

    const result = await res.json();
    expect(result.data).toBeDefined();
  });

  test("GET /reservation/check/:number with nonexistent number should return not found", async () => {
    mockReservationService.getByNumber = mock(() =>
      Fail("Reservation not found", ErrorCodes.NOT_FOUND),
    );

    const req = new Request("http://localhost/reservation/check/NONEXISTENT");
    const res = await app.fetch(req);

    expect(res.status).toBe(404);

    const result = await res.json();
    expect(result.error).toBeDefined();
    expect(result.error?.code).toBe(ErrorCodes.NOT_FOUND);
  });

  test("GET /reservation/slots should call generateTimeSlots() with correct parameters", async () => {
    const req = new Request(
      "http://localhost/reservation/slots?date=2025-04-20",
    );
    const res = await app.fetch(req);

    expect(res.status).toBe(200);
    expect(mockReservationService.generateTimeSlots).toHaveBeenCalledTimes(1);

    // Check date parameter was correctly passed
    const options = mockReservationService.generateTimeSlots.mock.calls[0][0];
    expect(options.date).toBeDefined();

    const result = await res.json();
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
  });

  test("PATCH /reservation/:id should call update() with correct parameters", async () => {
    mockReservationService.update = mock(() =>
      Ok({
        id: 1,
        reservationNumber: "VET-20250417-123",
        status: "rescheduled",
        timeFrom: "14:00",
        timeTo: "15:00",
      }),
    );

    const updateData = {
      status: "rescheduled",
      time: { from: "14:00", to: "15:00" },
    };
    // Teh data takend from the route are reformatted to wokr on the service
    const inServiceUpdateData = {
      status: updateData.status,
      timeFrom: updateData.time.from,
      timeTo: updateData.time.to,
    };

    const req = new Request("http://localhost/reservation/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData),
    });

    const res = await app.fetch(req);

    const result = await res.json();

    console.log(result);
    expect(res.status).toBe(200);

    expect(mockReservationService.update).toHaveBeenCalledTimes(1);
    expect(mockReservationService.update.mock.calls[0][0]).toBe(1);
    expect(mockReservationService.update.mock.calls[0][1]).toEqual(
      inServiceUpdateData,
    );

    expect(result.data).toBeDefined();
  });

  test("DELETE /reservation/:id should call delete() with correct id", async () => {
    const req = new Request("http://localhost/reservation/1", {
      method: "DELETE",
    });

    const res = await app.fetch(req);
    const result = await res.json();

    // console.log(result);

    expect(res.status).toBe(200);

    expect(mockReservationService.delete).toHaveBeenCalledTimes(1);
    expect(mockReservationService.delete.mock.calls[0][0]).toBe(1);

    expect(result.data).toBeDefined();
  });
});
