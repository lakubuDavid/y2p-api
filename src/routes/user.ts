import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { AppContext, Bindings, Variables } from "../types";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { MatchHTTPCode, Ok } from "../../lib/error";
import { env } from "hono/adapter";
import { getCookie } from "hono/cookie";
import { authenticatedOnly } from "../middlewares/authentication";
import { TokenPayload } from "../services/auth";

const user = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// JWT middleware
user.use("*", authenticatedOnly);

user.get("/", async (c) => {
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

user.get("/me", authenticatedOnly, async (c) => {
  const { userService } = c.var;
  const payload = c.get("jwtPayload") as TokenPayload;
  const { data: user, error } = await userService.getById(payload.userId);
  if (error) {
    return c.json(
      {
        error,
      },
      MatchHTTPCode(error.code),
    );
  }
  return c.json(Ok({ ...user }));
});

export default user;
