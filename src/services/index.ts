import { createMiddleware } from "hono/factory";
import { AppContext } from "../types";
import { AuthService } from "./auth";
import assert from "assert";
import { PetService } from "./pet";
import { StaffService } from "./staff";

declare module "hono" {
  interface ContextVariableMap {
    authService: AuthService;
    petService: PetService;
    staffService: StaffService;
  }
}
export const registerServices = () =>
  createMiddleware((c: AppContext, next) => {
    assert(c.var.db, "[Error : Service Registration] Missing databse instance");
    assert(
      c.env.JWT_SECRET,
      "[Error : Service Registration] Missing JWT secret",
    );

    c.set("authService", new AuthService(c.var.db, c.env.JWT_SECRET));
    c.set("petService", new PetService(c.var.db, c.env.JWT_SECRET));
    c.set("staffService", new StaffService(c.var.db, c.env.JWT_SECRET));

    return next();
  });
