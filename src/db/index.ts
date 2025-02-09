import { createMiddleware } from "hono/factory";
import * as libsql from "@libsql/client";
import { AppContext } from "../types";
import { drizzle } from "drizzle-orm/libsql";

export const setupDb = () => createMiddleware(
  createMiddleware((c:AppContext, next) => {
    const client = libsql.createClient({
      url: c.env.TURSO_DB_URL,
      authToken: c.env.TURSO_TOKEN,
    });

    const db = drizzle({client})
    
    c.set("db",db)
    c.set("dbClient", client);
    return next();
  }),
);
