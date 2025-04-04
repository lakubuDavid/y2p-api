import { createMiddleware } from "hono/factory";
import { AppContext, Bindings } from "../types";
import { AuthService } from "./auth";
import { MagicLinkService } from "./magicLink";
import assert from "assert";
import { PetService } from "./pet";
import { StaffService } from "./staff";
import { ReservationService } from "./reservation";
import { env } from "hono/adapter";
import { BaseService } from "./service";
import { Context, ContextVariableMap } from "hono";
import { UserService } from "./user";
import { LibSQLDatabase } from "drizzle-orm/libsql";

declare module "hono" {
  interface ContextVariableMap {
    authService: AuthService;
    petService: PetService;
    staffService: StaffService;
    reservationService: ReservationService;
    userService: UserService;
    magicLinkService: MagicLinkService
  }
}
type ServiceName = keyof Omit<ContextVariableMap, "jwtPayload">;

const registerService = <TService extends BaseService>(
  c: Context,
  name: ServiceName,
  type: { new (db: LibSQLDatabase, jwtSecret: string): TService },
) => {
  c.set(name as string, new type(c.var.db, env<Bindings>(c).JWT_SECRET));
};

export const registerServices = () =>
  createMiddleware((c, next) => {
    assert(c.var.db, "[Error : Service Registration] Missing databse instance");
    assert(
      env<Bindings>(c).JWT_SECRET,
      "[Error : Service Registration] Missing JWT secret",
    );

    registerService(c, "authService", AuthService);
    registerService(c, "petService", PetService);
    registerService(c, "staffService", StaffService);
    registerService(c, "reservationService", ReservationService);
    registerService(c, "userService", UserService);

    c.set(
      "magicLinkService",
      new MagicLinkService(
        c.var.db,
        env<Bindings>(c).JWT_SECRET,
        env<Bindings>(c).RESEND_TOKEN,
        env<Bindings>(c).URL,
      ),
    );

    console.log("services ok");
    return next();
  });
