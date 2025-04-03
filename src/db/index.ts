import { createMiddleware } from "hono/factory";
import * as libsql from "@libsql/client";
import { AppContext, Bindings } from "../types";
import { drizzle, LibSQLDatabase } from "drizzle-orm/libsql";
import { config} from "dotenv";
import { env } from "hono/adapter";

export let db : LibSQLDatabase

export const setupDb = () => createMiddleware(
  createMiddleware((c, next) => {
    const client = libsql.createClient({
      url: env<Bindings>(c).TURSO_DB_URL || "",
      authToken: env<Bindings>(c).TURSO_TOKEN,
    });

    db = drizzle({client})
    
    c.set("db",db)
    c.set("dbClient", client);
    console.log("db ok")
    return next();
  }),
);
