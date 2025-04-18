import { Hono } from "hono";
import { jwt } from "hono/jwt";
import {
  AppContext,
  Bindings,
  AdminCreateUserSchema,
  Variables,
} from "../types";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { ErrorCodes, Fail, MatchHTTPCode, Ok } from "../../lib/error";
import { authenticatedOnly } from "../middlewares/authentication";
import { error } from "console";

const admin = new Hono<{ Bindings: Bindings; Variables: Variables }>();
// JWT middleware
// admin.use("*", authenticatedOnly);

admin.get("/users", async (c) => {
  const { userService } = c.var;

  const { data, error } = await userService.all();
  if (error) {
    console.log(error);
    return c.json(
      { error: error.message, ...error },
      MatchHTTPCode(error.code),
    );
  }
  return c.json({ data });
});
admin.post("/users", zValidator("json", AdminCreateUserSchema), async (c) => {
  const { userService, magicLinkService, staffService,notificationService } = c.var;
  const userInfo = c.req.valid("json");

  // Create a user and send a magic link
  const { data: user, error: userError } = await userService.create(userInfo);
  if (userError) {
    return c.json({ error: userError }, MatchHTTPCode(userError.code));
  }

  let staffInfo = undefined;

  if (user.type == "staff") {
    if (!userInfo.role) {
      return c.json(
        Fail("Missing parameter role", ErrorCodes.INVALID_ARGUMENT),
        MatchHTTPCode(ErrorCodes.INVALID_ARGUMENT),
      );
    }
    const { data, error } = await staffService.create({
      role: userInfo.role,
      userId: user.id,
    });
    if (error) {
      // Roll back user creation
      await userService.delete(user.id);
      return c.json(
        Fail(
          `An error occured while assigning role : ${error.message}`,
          error.code,
          error,
        ),
        MatchHTTPCode(error.code),
      );
    }
    staffInfo = data;
  }

  const { data: magicLink, error: magicLinkError } =
    await magicLinkService.createMagicLink(user.id);

  if (magicLinkError) {
    return c.json(
      { error: magicLinkError },
      MatchHTTPCode(magicLinkError.code),
    );
  }

  const { data: emailData, error: emailError } =
    await notificationService.sendMagicLinkEmail(magicLink, user);
  if (emailError) {
    return c.json({ error: emailError }, MatchHTTPCode(emailError.code));
  }

  return c.json(Ok({ ...user, role: staffInfo?.role, staffId: staffInfo?.id }));
});

export default admin;
