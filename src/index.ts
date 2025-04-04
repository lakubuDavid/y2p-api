import { Context, Hono } from "hono";
import * as Sentry from "@sentry/cloudflare";
import { cors } from "hono/cors";
import auth from "./routes/auth";
import clientAuth from "./routes/auth.client";
import admin from "./routes/admin";
import pet from "./routes/pet";
import staff from "./routes/staff";
import user from "./routes/user";
import { Bindings, Variables } from "./types";
import { setupDb } from "./db";
import { registerServices } from "./services";
import { logger } from "hono/logger";
import { getCookie } from "hono/cookie";
import { config } from "dotenv";
import { authHeaders } from "./middlewares/authHeaders";
import reservation from "./routes/reservation";

import { responseFormatter } from "./middlewares/response";
import { ErrorCodes, MatchHTTPCode } from "../lib/error";
import { ZodError } from "zod";
import { HTTPException } from "hono/http-exception";
import { env } from "hono/adapter";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

config({ path: ".env" });

app.use(responseFormatter);
app.use(logger());
app.use((c, next) => {
  const client_url = env<Bindings>(c as Context).CLIENT_URL;
  return cors({
    credentials: true,
    // origin:(origin,c)=>{
    //   return origin
    // },
    origin: ["http://localhost:5173",client_url],
  })(c, next);
});
app.use(setupDb());
app.use(registerServices());
app.use(authHeaders);

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.get("/api", (c) => {
  const co = getCookie(c, "__token");
  return c.text("Something");
});

app.route("/api/auth", auth);
app.route("/auth", clientAuth);
app.route("/api/pet", pet);
app.route("/api/staff", staff);
app.route("/api/reservation", reservation);
app.route("/api/user", user);
app.route("/api/admin", admin);

app.onError((error, c) => {
  Sentry.captureException(error)
  if (error instanceof ZodError) {
    // console.log(error.message)
    return c.json(
      { error: error, status: "error", message: error.message },
      MatchHTTPCode(ErrorCodes.VALIDATION_ERROR),
    );
  }
  if (error instanceof HTTPException)
    return c.json(
      {
        error: error.cause ?? error.status,
        status: "error",
        message: error.message,
      },
      MatchHTTPCode(ErrorCodes.UNKNOWN),
    );
  return c.json(
    { error: error.cause ?? error, status: "error", message: error.message },
    MatchHTTPCode(ErrorCodes.UNKNOWN),
  );
});

// export default app;
export default Sentry.withSentry(
  (env) => ({
    dsn: "https://12cb0f1c43e2e708102dd0c30c8d2d60@o4509096974417920.ingest.de.sentry.io/4509096977760336",
  }),
  app
);
