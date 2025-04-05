import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { AppContext, Bindings, Variables } from "../types";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import {
  deleteCookie,
  getCookie,
  getSignedCookie,
  setCookie,
  setSignedCookie,
} from "hono/cookie";
import { AuthService, TokenPayload } from "../services/auth";
import { env } from "hono/adapter";
import {
  ErrorCodes,
  Fail,
  ManagedError,
  MatchHTTPCode,
  Ok,
} from "../../lib/error";
import { authenticatedOnly } from "../middlewares/authentication";
import { Token } from "typescript";
import { clientServerTzOffset, getClientTimeZoneOffset } from "../../lib/utils";

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// // Add JWT middleware for protected routes
// auth.use("/protected/*", async (c, next) => {
//   const jwtMiddleware = jwt({
//     //@ts-ignore
//     secret: env<Bindings>(c).JWT_SECRET,
//     cookie: {
//       key: "__token",
//       secret: "secret",
//     },
//   });
//   const cookies = getCookie(c, "secret");
//   return jwtMiddleware(c, next);
// });

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string(),
});

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  name: z.string().min(2, "Name must be at least 2 characters"),
});

// const refreshSchema = z.object({
//   refreshToken: z.string(),
// });

auth.post("/login", zValidator("json", loginSchema), async (c) => {
  const { authService } = c.var;
  const { email, password } = c.req.valid("json");

  try {
    const { data, error } = await authService.login(email, password);
    if (error) {
      return c.json(
        { status: "error", message: error.message, error },
        MatchHTTPCode(error.code),
      );
    }
    const { user, accessToken, refreshToken } = data;

    const tzOffset = clientServerTzOffset(c);
    setCookie(c, "__token", accessToken, {
      // secure: true,
      httpOnly: true,
      expires: new Date(
        Date.now() + AuthService.ACCESS_TOKEN_EXPIRY + tzOffset,
      ),
    });
    setCookie(c, "__refresh_token", refreshToken, {
      // secure: true,
      httpOnly: true,
      expires: new Date(
        Date.now() + AuthService.REFRESH_TOKEN_EXPIRY + tzOffset,
      ),
    });
    // console.log("fine", user, accessToken, refreshToken);
    return c.json({
      status: "ok",
      data: user,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    if (error instanceof ManagedError) {
      return c.json(
        { status: "error", message: error.message, error },
        MatchHTTPCode(error.code),
      );
    }
    console.log(error);
    return c.json(
      { status: "error", message: "An unexpected error occurred", error },
      500,
    );
  }
});

auth.post("/signup", zValidator("json", signupSchema), async (c) => {
  try {
    const { authService } = c.var;
    const { email, password, name } = c.req.valid("json");
    // console.log({ email, password, name });
    // console.log("head");

    const { user, accessToken, refreshToken } = await authService.signUp(
      email,
      password,
      name,
    );
    const tzOffset = clientServerTzOffset(c);
    setCookie(c, "__token", accessToken, {
      // secure: true,
      httpOnly: true,
      expires: new Date(
        Date.now() + AuthService.ACCESS_TOKEN_EXPIRY + tzOffset,
      ),
    });
    setCookie(c, "__refresh_token", refreshToken, {
      // secure: true,
      httpOnly: true,
      expires: new Date(
        Date.now() + AuthService.REFRESH_TOKEN_EXPIRY + tzOffset,
      ),
    });
    return c.json(
      {
        status: "ok",
        message: "User created successfully",
        user,
        accessToken,
        refreshToken,
      },
      201,
    );
  } catch (error) {
    console.log("error", error);
    if (error instanceof Error) {
      if (error.message === "Email already registered") {
        return c.json({ status: "error", message: error.message }, 409);
      }
      return c.json({ status: "error", message: error.message }, 400);
    }
    return c.json(
      { status: "error", message: "An unexpected error occurred" },
      500,
    );
  }
});

auth.post("/refresh", async (c) => {
  const { authService } = c.var;
  // const { refreshToken } = c.req.valid("json");
  const _token = getCookie(c, "__refresh_token");
  if (!_token) {
    return c.json(Fail("Invalid request", ErrorCodes.INVALID_ARGUMENT));
  }
  try {
    const { data: tokens, error } = await authService.refreshTokens(_token);
    if (error) {
      console.log(error);
      return c.json(
        { ...error, error: error.message },
        MatchHTTPCode(error.code),
      );
    }
    const { accessToken, refreshToken } = tokens;
    const tzOffset = clientServerTzOffset(c);
    setCookie(c, "__token", accessToken, {
      // secure: true,
      httpOnly: true,
      expires: new Date(
        Date.now() + AuthService.ACCESS_TOKEN_EXPIRY + tzOffset,
      ),
    });
    setCookie(c, "__refresh_token", refreshToken, {
      // secure: true,
      httpOnly: true,
      expires: new Date(
        Date.now() + AuthService.REFRESH_TOKEN_EXPIRY + tzOffset,
      ),
    });
    return c.json({
      status: "ok",
      ...tokens,
    });
  } catch (error) {
    return c.json(
      {
        status: "error",
        message: "Refresh token",
      },
      MatchHTTPCode(ErrorCodes.UNKNOWN),
    );
  }
});

auth.get("/me", authenticatedOnly, async (c) => {
  const { authService } = c.var;
  const payload = c.get("jwtPayload") as TokenPayload;
  return c.json(Ok(payload));
  // const tokenPayload = authService.verifyToken()
});

auth.post("/logout", authenticatedOnly, async (c) => {
  const { authService } = c.var;
  const payload = c.get("jwtPayload");
  const refreshToken = c.req.header("x-refresh-token");
  deleteCookie(c, "__token");
  deleteCookie(c, "__refresh_token");

  if (refreshToken) {
    await authService.revokeToken(refreshToken);
  }

  return c.json({ status: "ok", message: "Logged out successfully" });
});

auth.post("/logout-all", authenticatedOnly, async (c) => {
  const { authService } = c.var;
  const payload = c.get("jwtPayload");

  await authService.revokeAllUserTokens(payload.userId);

  return c.json({ status: "ok", message: "Logged out from all devices" });
});

export default auth;
