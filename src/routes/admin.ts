import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { AppContext, Bindings, CreateUserSchema, Variables } from "../types";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { MatchHTTPCode, Ok } from "../../lib/error";
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
admin.post("/users", zValidator("json", CreateUserSchema), async (c) => {
  const { userService, magicLinkService, authService } = c.var;
  const userInfo = c.req.valid("json");

  // Create a user and send a magic link
  const { data: user, error: userError } = await userService.create(userInfo);
  if (userError) {
    return c.json({ error: userError }, MatchHTTPCode(userError.code));
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
    await magicLinkService.sendMagicLinkEmail(magicLink, user);
  if (emailError) {
    return c.json({ error: emailError }, MatchHTTPCode(emailError.code));
  }

  return c.json(Ok(user));
});

export default admin;
