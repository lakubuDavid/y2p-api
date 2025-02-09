import * as libsql from "@libsql/client";
import { LibSQLDatabase } from "drizzle-orm/libsql";
import { Context } from "hono";
import type { JwtVariables } from "hono/jwt";

export type Bindings = {
  TURSO_DB_URL: string;
  TURSO_TOKEN: string;
  JWT_SECRET: string;
};
export type Variables = {
  dbClient: libsql.Client;
  db: LibSQLDatabase;
} & JwtVariables;

export type AppContext = Context<{ Bindings: Bindings; Variables: Variables }>;
