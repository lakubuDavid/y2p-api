import { createMiddleware } from "hono/factory";
import { jwt } from "hono/jwt";
import { env } from "hono/adapter";
import { getCookie, setCookie } from "hono/cookie";
import { AuthService } from "../services/auth";

export const authHeaders = createMiddleware(async (c, next) => {
  const cookies = getCookie(c);
  if (cookies["__token"]) {
    const req = new Request(c.req.raw);
    req.headers.append("Authorization", `Bearer ${cookies["__token"]}`);
    c.req.raw = req;
  } else {
    if (cookies["__refresh_token"]) {
      const { authService } = c.var;
      const { data, error } = await authService.refreshTokens(
        cookies["__refresh_token"],
      );
      if (error) {
      } else {
        const { accessToken, refreshToken } = data;

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

        const req = new Request(c.req.raw);
        req.headers.append("Authorization", `Bearer ${accessToken}`);
        c.req.raw = req;
      }
    }
  }
  await next();
});
