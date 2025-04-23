//src/routes/reservation.ts
import { Hono } from "hono";
import { Bindings, Variables, toDate } from "../types";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { SelectUserData } from "../db/schemas/user";
import { ErrorCodes, ManagedError, MatchHTTPCode } from "../../lib/error";
import { SelectPet } from "../db/schemas/pet";
import { PetInfo } from "@/services/pet";
import {
  CreateReservationSchema,
  ReservationDateSchema,
} from "../models/reservation";

const reservation = new Hono<{ Bindings: Bindings; Variables: Variables }>();

reservation.post(
  "/",
  zValidator("json", CreateReservationSchema),
  async (c) => {
    const { petInfo, userInfo, reservationInfo } = c.req.valid("json");

    const { userService, petService, reservationService, notificationService } =
      c.var;
    try {
      let userId: number;
      let petId: number;

      if ("id" in userInfo) {
        console.log("id", userInfo.id);
        userId = userInfo.id;
      } else {
        let user: SelectUserData | undefined;
        const { data, error } = await userService.get({
          email: userInfo.email,
          phoneNumber: userInfo.phoneNumber,
        });
        if (error && error.code != ErrorCodes.USER_NOT_FOUND) {
          return c.json({ error }, MatchHTTPCode(error.code));
        }
        user = data;
        // console.log("existing user", user);
        if (!user) {
          const { data, error } = await userService.create(userInfo);
          if (error) {
            return c.json({ error }, MatchHTTPCode(error.code));
          }
          user = data;
        }
        userId = user.id;
      }

      if ("id" in petInfo) {
        petId = petInfo.id;
      } else {
        let pet: PetInfo | SelectPet | undefined;

        const existingPetResult = await petService.get({
          userId: userId,
          name: petInfo.name,
        });
        if (existingPetResult.error || !existingPetResult.data) {
          const { error } = existingPetResult;
          if (error) {
            return c.json({ error }, MatchHTTPCode(error.code));
          }
          const { data: newPet, error: newPetError } = await petService.create({
            ...petInfo,
            ownerId: userId,
          });
          if (newPetError) {
            return c.json({ newPetError }, MatchHTTPCode(newPetError.code));
          }
          pet = newPet;
        } else {
          pet = existingPetResult.data;
        }
        console.log(pet, petInfo);
        petId = pet.id;
      }
      const { data: result, error: createReservationError } =
        await reservationService.create({
          petId: petId,
          userId: userId,
          date: reservationInfo.date,
          timeFrom: reservationInfo.time.from,
          timeTo: reservationInfo.time.to,
          service: reservationInfo.service,
        });
      if (createReservationError) {
        return c.json(
          { error: createReservationError },
          MatchHTTPCode(createReservationError.code),
        );
      }

      reservationService.getById(result.id).then(({ data: res, error }) => {
        if (!error)
          notificationService
            .sendReservationEmail(res)
            .then(({ data, error }) => {
              if (error || !data) console.error("Could not send mail:", error);
              else console.log("Mail sent");
            })
            .catch((err) => {
              console.error("Could not send mail:", err);
            });
      });

      return c.json({ data: result });
    } catch (err) {
      console.log(err);
      return c.json({ error: (err as Error).message }, 400);
    }
  },
);

reservation.get("/slots", async (c) => {
  const { reservationService } = c.var;
  const date = new Date(c.req.query("date") ?? new Date().toISOString());
  const { data: slots } = await reservationService.generateTimeSlots({ date });
  // console.log(slots);

  return c.json({ data: slots });
});

const QueryParamsSchema = z.object({
  userId: z.number({ coerce: true }).optional(),
  petId: z.number({ coerce: true }).optional(),
  date: ReservationDateSchema.optional(),
  status: z
    .string()
    .transform((value) => value.split(","))
    .pipe(
      z.enum(["rescheduled", "canceled", "oncoming", "done", "late"]).array(),
    )
    .optional(),
});

reservation.get("/", zValidator("query", QueryParamsSchema), async (c) => {
  const { reservationService } = c.var;
  const filters = c.req.valid("query");
  try {
    const { data: reservations, error } = await reservationService.all(filters);
    if (error) {
      return c.json({ error }, MatchHTTPCode(error.code));
    }
    return c.json({ data: reservations });
  } catch (err) {
    return c.json({ error: err }, 500);
  }
});
reservation.get("/:id", async (c) => {
  const id = c.req.param("id");
  const { success: validParam, data: ID } = z.number().int().safeParse(id);
  if (!validParam) {
    const err = new ManagedError(
      "Invalid parameter",
      ErrorCodes.VALIDATION_ERROR,
    );
    return c.json({ error: err }, MatchHTTPCode(err.code));
  }
  const { reservationService } = c.var;
  try {
    const { data: reservations, error } = await reservationService.getById(ID);
    if (error) {
      return c.json({ error }, MatchHTTPCode(error.code));
    }
    return c.json({ data: reservations });
  } catch (err) {
    return c.json({ error: err }, 500);
  }
});
reservation.delete("/:id", async (c) => {
  const id = c.req.param("id");
  let ID = -1;
  // const { success: validParam, data: ID } = z.number().safeParse(id);
  try {
    ID = Number(id);
  } catch (err) {}
  if (ID < 0) {
    const err = new ManagedError(
      `Invalid parameter : ${id}`,
      ErrorCodes.VALIDATION_ERROR,
    );
    return c.json({ error: err }, MatchHTTPCode(err.code));
  }
  const { reservationService } = c.var;
  try {
    const { data: reservation, error } = await reservationService.delete(ID);
    if (error) {
      return c.json({ error }, MatchHTTPCode(error.code));
    }
    return c.json({ data: reservation });
  } catch (err) {
    return c.json({ error: err }, 500);
  }
});
reservation.get("/check/:number", async (c) => {
  const reservationNumber = c.req.param("number");
  const { reservationService } = c.var;

  try {
    const { data: reservation, error } =
      await reservationService.getByNumber(reservationNumber);
    if (error) {
      return c.json({ error }, MatchHTTPCode(error.code));
    }
    return c.json({ data: reservation });
  } catch (err) {
    return c.json({ error: err }, 500);
  }
});

reservation.patch(
  "/:id",
  zValidator(
    "json",
    z
      .object({
        date: ReservationDateSchema,
        time: z.object({
          from: z.string(),
          to: z.string(),
        }),
        status: z.enum(["rescheduled", "canceled", "oncoming", "done", "late"]),
        assigneeId: z.number().int(),
      })
      .partial(),
  ),
  async (c) => {
    try {
      const { reservationService } = c.var;
      const body = c.req.valid("json");
      // const options = {
      //   date: body.date,
      // };
      let status = body.status;

      if (body.date) {
        if (toDate(body.date).getTime() < Date.now()) {
          status = "late";
        } else if (!body.status) {
          status = "oncoming";
        }
      }
      const reservationId = Number.parseInt(c.req.param("id"));
      // Check if already done
      const { data: reservation } =
        await reservationService.getById(reservationId);
      if (reservation && reservation?.reservation.status == "done" && !status) {
        return c.json(
          {
            error: "Already completed reservation can't be modifed",
            code: ErrorCodes.INVALID_OPERATION,
          },
          MatchHTTPCode(ErrorCodes.INVALID_OPERATION),
        );
      }
      const { data, error } = await reservationService.update(reservationId, {
        date: body.date,
        status: body.status,
        timeFrom: body.time?.from,
        timeTo: body.time?.to,
        assigneeId: body.assigneeId,
      });
      if (error) {
        return c.json({ error }, MatchHTTPCode(error.code));
      }
      return c.json({ data });
    } catch (error) {
      console.log(error);
      const err = new ManagedError(
        "Invalid parameter",
        ErrorCodes.VALIDATION_ERROR,
      );
      // if (err instanceof ZodError) {
      return c.json({ error: err }, MatchHTTPCode(err.code));
      // }
    }
  },
);

export default reservation;
