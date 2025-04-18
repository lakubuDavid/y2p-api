import { createMiddleware } from "hono/factory";
import { jwt } from "hono/jwt";
import { env } from "hono/adapter";
import { AppContext, Bindings, Variables } from "../types";

export const authenticatedOnly = createMiddleware(async (c, next) => {
  const environment = env<Bindings>(c).ENVIRONMENT || "production";
  if (environment !== "test") {
    const jwtMiddleware = jwt({
      secret: env<Bindings>(c).JWT_SECRET,
      cookie: {
        key: "__token",
        // secret: "secret",
      },
    });
    return jwtMiddleware(c, next);
  }
  return next()
});
