import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { AppContext, Bindings, Variables } from "../types";
import { env } from "hono/adapter";
import { AuthService, TokenPayload } from "../services/auth";
import { setCookie } from "hono/cookie";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
const auth = new Hono<{ Bindings: Bindings; Vatiables: Variables }>();

auth.get(
  "/verify",
  zValidator("query", z.object({ token: z.string() })),
  async (c) => {
    const { magicLinkService, authService } = c.var;
    // const token = c.req.query("token");
    const { token } = c.req.valid("query");
    console.log("token", token);
    //@ts-ignore
    const _envs = env<Bindings>(c);
    console.log(_envs);
    if (!token) {
      return c.redirect(`${_envs.CLIENT_URL}/login?error=missing_token`);
    }
    const { data: userData, error } =
      await magicLinkService.verifyMagicLink(token);
    if (error) {
      console.log(error);
      return c.redirect(`${_envs.CLIENT_URL}/login?error=missing_token`);
    }
    // Generate JWT token
    const { accessToken, refreshToken } = await authService.generateTokenPair(
      userData.id,
      userData.email,
    );
    setCookie(c, "__token", accessToken, {
      // secure: true,
      httpOnly: true,
      expires: new Date(Date.now() + AuthService.ACCESS_TOKEN_EXPIRY),
    });
    setCookie(c, "__refresh_token", refreshToken, {
      // secure: true,
      httpOnly: true,
      expires: new Date(Date.now() + AuthService.REFRESH_TOKEN_EXPIRY),
    });
    return c.redirect(`${_envs.CLIENT_URL}`);
  },
);
export default auth;
