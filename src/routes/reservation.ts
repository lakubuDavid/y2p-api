//src/routes/reservation.ts
import { Hono } from "hono";
import { jwt } from "hono/jwt";
import {
  AppContext,
  Bindings,
  dateFromReservationFrom,
  CreateReservationParams,
  Variables,
  CreateReservationSchema,
} from "../types";
import { z, ZodError } from "zod";
import { zValidator } from "@hono/zod-validator";
import { SelectUser } from "../db/schemas/user";
import { ErrorCodes, Fail, ManagedError, MatchHTTPCode } from "../../lib/error";
import { SelectPet } from "../db/schemas/pet";
import { ReservationStatus } from "../db/schemas/reservation";
import { ReservationService } from "../services/reservation";

const reservation = new Hono<{ Bindings: Bindings; Variables: Variables }>();

reservation.post(
  "/",
  zValidator("json", CreateReservationParams),
  async (c) => {
    const { petInfo, userInfo, reservationInfo } = c.req.valid("json");

    // console.log(petInfo);
    // console.log(userInfo);
    // console.log(reservationInfo);

    const { userService, petService, reservationService } = c.var;
    try {
      let user: SelectUser | undefined;
      const { data, error } = await userService.get({
        email: userInfo.email,
        phoneNumber: userInfo.phoneNumber,
      });
      if (error) {
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

      let { data: pet, error: getError } =
        (await petService.get({ userId: user.id, name: petInfo.name })) ??
        (await petService.add({ ...petInfo, owner: user.id }));

      if (getError) {
        return c.json({ error }, MatchHTTPCode(getError.code));
      }

      const { data: result, error: createReservationError } =
        await reservationService.create({
          petId: pet!.id,
          userId: user.id,
          date: reservationInfo.date,
          timeFrom: reservationInfo.time.from,
          timeTo: reservationInfo.time.to,
        });
      if (createReservationError) {
        return c.json({ error }, MatchHTTPCode(createReservationError.code));
      }

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
  date: z.date({ coerce: true }).optional(),
  // status: z
  //   .enum(["rescheduled", "canceled", "oncoming", "done", "late"])
  //   .optional(),
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

reservation.patch(
  "/:id",
  zValidator("param", z.number()),
  zValidator(
    "json",
    z
      .object({
        date: z.date(),
        time: z.object({
          from: z.string(),
          to: z.string(),
        }),
        status: z.enum(["rescheduled", "canceled", "oncoming", "done", "late"]),
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
      const reservationId = c.req.valid("param");
      const { data, error } = await reservationService.update(reservationId, {
        date: body.date,
        status: body.status,
        timeFrom: body.time?.from,
        timeTo: body.time?.to,
      });
      if (error) {
      }
      return c.json({ data });
    } catch (error) {
      const err = new ManagedError(
        "Invalid parameter",
        ErrorCodes.VALIDATION_ERROR,
      );
      // if (err instanceof ZodError) {
      c.json({ error: err }, MatchHTTPCode(err.code));
      // }
    }
  },
);

export default reservation;
