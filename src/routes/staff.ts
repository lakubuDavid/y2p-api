import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { AppContext, Bindings, Variables } from "../types";
import { requirePermission, requireDepartment } from "../middlewares/iam";
import { Department } from "../services/staff";
import { getSignedCookie } from "hono/cookie";

const staff = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// JWT middleware
staff.use("*", (c, next) => {
  const jwtMiddleware = jwt({
    secret: c.env.JWT_SECRET,
  });
  return jwtMiddleware(c, next);
});

const staffSchema = z.object({
  userId: z.number(),
  department: z.enum(["admin", "veterinary", "reception"] as const),
});

const updateStaffSchema = z.object({
  department: z.enum(["admin", "veterinary", "reception"] as const),
});

// List all staff (admin only)
staff.get("/", requirePermission("view:staff"), async (c) => {
  const { staffService } = c.var;
  const department = c.req.query("department") as Department | undefined;

  // console.log(cookies)

  try {
    const staffMembers = await staffService.getAllStaff(department);
    return c.json({ status: "ok", staff: staffMembers });
  } catch (error) {
    return c.json(
      {
        status: "error",
        message: "Failed to fetch staff members",
      },
      500,
    );
  }
});

// Add new staff member (admin only)
staff.post(
  "/",
  requireDepartment(["admin"]),
  zValidator("json", staffSchema),
  async (c) => {
    const { staffService } = c.var;
    const staffInfo = c.req.valid("json");

    try {
      const newStaff = await staffService.addStaffMember(staffInfo);
      return c.json(
        {
          status: "ok",
          message: "Staff member added successfully",
          staff: newStaff,
        },
        201,
      );
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
          message: "Failed to add staff member",
        },
        500,
      );
    }
  },
);

// Update staff member (admin only)
staff.patch(
  "/:id",
  requireDepartment(["admin"]),
  zValidator("json", updateStaffSchema),
  async (c) => {
    const { staffService } = c.var;
    const id = parseInt(c.req.param("id"));
    const updates = c.req.valid("json");

    if (isNaN(id)) {
      return c.json({ status: "error", message: "Invalid staff ID" }, 400);
    }

    try {
      const updatedStaff = await staffService.updateStaffMember(id, updates);
      return c.json({
        status: "ok",
        staff: updatedStaff,
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
          message: "Failed to update staff member",
        },
        500,
      );
    }
  },
);

// Remove staff member (admin only)
staff.delete("/:id", requireDepartment(["admin"]), async (c) => {
  const { staffService } = c.var;
  const id = parseInt(c.req.param("id"));

  if (isNaN(id)) {
    return c.json({ status: "error", message: "Invalid staff ID" }, 400);
  }

  try {
    await staffService.removeStaffMember(id);
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
