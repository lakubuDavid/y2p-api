import { Roles } from "@/models/staff";
import { Context, Next } from "hono";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

// Define permissions for each department
export const DepartmentPermissions = {
  admin: [
    "manage:staff",
    "view:staff",
    "manage:pets",
    "view:pets",
    "manage:appointments",
    "view:appointments",
  ],
  veterinary: [
    "view:staff",
    "manage:pets",
    "view:pets",
    "manage:appointments",
    "view:appointments",
  ],
  receptionist: [
    "view:staff",
    "view:pets",
    "manage:appointments",
    "view:appointments",
  ],
} as const;

export type Permission = (typeof DepartmentPermissions)[Roles][number];

// Create middleware factory for permission-based authorization
export const requirePermission = (requiredPermission: Permission) => {
  return createMiddleware( async (c: Context, next: Next) => {
    const { staffService } = c.var;
    const payload = c.get("jwtPayload");

    const {data:staff,error }= await staffService.getByUserId(payload.userId);
    
    if (!staff) {
      throw new HTTPException(403, {
        message: "Access denied: Not a staff member",
      });
    }
    const departmentPermissions =
      DepartmentPermissions[
        staff.role as keyof typeof DepartmentPermissions
      ]; // Type-safe access

    // const departmentPermissions = DepartmentPermissions[staff.department];
    // if (!departmentPermissions.includes(requiredPermission)) {
    if (
      !departmentPermissions ||
      //@ts-ignore Because staff permissions are not the same as admin and the admin permissions are seen as invalid values outside of possible values
      // Might need to address it if it's not a typescript issue
      !departmentPermissions.includes(requiredPermission)
    ) {
      throw new HTTPException(403, {
        message: "Access denied: Insufficient permissions",
      });
    }

    return next();
  });
};

// Create middleware factory for department-based authorization
export const requireDepartment = (departments: Roles[]) => {
  return async (c: Context, next: Next) => {
    const { staffService } = c.var;
    const payload = c.get("jwtPayload");

    const hasAccess = await staffService.hasPermission(
      payload.userId,
      departments,
    );
    if (!hasAccess) {
      throw new HTTPException(403, {
        message: "Access denied: Invalid department",
      });
    }

    return next();
  };
};
