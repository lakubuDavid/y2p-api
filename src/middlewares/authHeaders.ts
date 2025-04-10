import { createMiddleware } from "hono/factory";
import { getCookie, setCookie } from "hono/cookie";
import { AuthService } from "../services/auth";
import { clientServerTzOffset } from "../../lib/utils";

export const authHeaders = createMiddleware(async (c, next) => {
  const cookies = getCookie(c);
  // console.log("cookies",cookies)
  if (cookies["__token"]) {
    const req = new Request(c.req.raw);

    req.headers.append("Authorization", `Bearer ${cookies["__token"]}`);
    // console.log("token", cookies["_token"]);
    // console.log("new request", req);
    c.req.raw = req;
  } else {
    if (cookies["__refresh_token"]) {
      const { authService } = c.var;
      const { data, error } = await authService.refreshTokens(
        cookies["__refresh_token"],
      );
      if (error) {
        console.log("can't refresh session", error);
      } else {
        const { accessToken, refreshToken } = data;

        const tzOffset = clientServerTzOffset(c);
        console.log("tz offset",tzOffset)
        setCookie(c, "__token", accessToken, {
          secure: true,
          sameSite:"none",
          httpOnly: true,
          expires: new Date(
            Date.now() + AuthService.ACCESS_TOKEN_EXPIRY + tzOffset,
          ),
        });
        setCookie(c, "__refresh_token", refreshToken, {
          secure: true,
          sameSite:"none",
          httpOnly: true,
          expires: new Date(
            Date.now() + AuthService.REFRESH_TOKEN_EXPIRY + tzOffset,
          ),
        });

        const req = new Request(c.req.raw);
        req.headers.append("Authorization", `Bearer ${accessToken}`);
        c.req.raw = req;
      }
    }
  }
  await next();
});
