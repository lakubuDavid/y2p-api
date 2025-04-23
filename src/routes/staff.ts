import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { AppContext, Bindings, Variables } from "../types";
import { requirePermission, requireRole } from "../middlewares/iam";
import { getSignedCookie } from "hono/cookie";
import { Roles, StaffTable } from "@/models/staff";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import {
  ErrorCodes,
  Fail,
  Failed,
  MatchErrorCode,
  MatchHTTPCode,
  Ok,
} from "@/libs/error";
import { QueryFilterStaffAll } from "@/services/staff";
import { env } from "hono/adapter";

const staff = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// JWT middleware
// staff.use("*", (c, next) => {
//   const jwtMiddleware = jwt({
//     secret: env<Bindings>(c).JWT_SECRET,
//   });
//   return jwtMiddleware(c, next);
// });

const staffSchema = createInsertSchema(StaffTable);
const updateStaffSchema = createUpdateSchema(StaffTable);
// List all staff (admin only)
staff.get("/", zValidator("query", QueryFilterStaffAll), async (c) => {
  const { staffService } = c.var;
  const filterRole = c.req.query("role") as Roles | undefined;

  // console.log(cookies)

  try {
    const { data, error } = await staffService.all({ role: filterRole });
    if (error) return c.json(error, MatchHTTPCode(error.code));
    return c.json(Ok(data));
  } catch (error) {
    return c.json(Fail("Failed to fetch staff members"), 500);
  }
});

// Add new staff member (admin only)
staff.post(
  "/",
  requireRole(["admin"]),
  zValidator("json", staffSchema),
  async (c) => {
    const { staffService } = c.var;
    const staffInfo = c.req.valid("json");

    try {
      const { data, error } = await staffService.create(staffInfo);
      if (error) return c.json(error, MatchHTTPCode(error.code));
      return c.json(Ok(data), 201);
    } catch (error) {
      if (error instanceof Error) {
        return c.json(Fail(error.message), 400);
      }
      return c.json(Fail("Failed to add staff member"), 500);
    }
  },
);

// Update staff member (admin only)
staff.patch(
  "/:id",
  zValidator("json", updateStaffSchema),
  async (c) => {
    const { staffService } = c.var;
    const id = parseInt(c.req.param("id"));
    const updates = c.req.valid("json");

    if (isNaN(id)) {
      return c.json(Fail("Invalid staff ID", ErrorCodes.INVALID_ARGUMENT), 400);
    }

    try {
      const { data, error } = await staffService.update(id, updates);
      if (error) return c.json(Failed(error), MatchHTTPCode(error.code));
      return c.json(Ok(data));
    } catch (error) {
      if (error instanceof Error) {
        return c.json(Fail(error.message), 400);
      }
      return c.json(Fail("Failed to update staff member"), 500);
    }
  },
);

// Remove staff member (admin only)
staff.delete("/:id", requireRole(["admin"]), async (c) => {
  const { staffService } = c.var;
  const id = parseInt(c.req.param("id"));

  if (isNaN(id)) {
    return c.json({ status: "error", message: "Invalid staff ID" }, 400);
  }

  try {
    await staffService.remove(id);
    return c.json({
      status: "ok",
      message: "Staff member removed successfully",
    });
  } catch (error) {
    if (error instanceof Error) {
      return c.json(
        {
          status: "error",
          message: error.message,
        },
        400,
      );
    }
    return c.json(
      {
        status: "error",
        message: "Failed to remove staff member",
      },
      500,
    );
  }
});

export default staff;
