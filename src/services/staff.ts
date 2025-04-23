import { LibSQLDatabase } from "drizzle-orm/libsql";
import {
  StaffTable,
  CreateStaff,
  SelectStaff,
  Roles,
} from "../db/schemas/staff";
import { UserTable } from "../db/schemas/user";
import { eq, and } from "drizzle-orm";
import { BaseService } from "./service";
import { AsyncResult, ErrorCodes, Fail, Ok, Result } from "@/libs/error";
import staff from "@/routes/staff";
import { z } from "zod";

export type StaffUser = SelectStaff & {
  user: {
    name: string;
    email: string;
  };
};

export const StaffTablePublicColumns = {
  id: StaffTable.id,
  role: StaffTable.role,
  userId: StaffTable.userId,
  createdAt: StaffTable.createdAt,
  user: {
    name: UserTable.name,
    email: UserTable.email,
  },
};

export const QueryFilterStaffAll = z
  .object({
    role: z.enum(["admin", "veterinary", "receptionist"]).optional(),
    email: z.string().email().optional(),
  })
  .optional();
export class StaffService extends BaseService {
  constructor(db: LibSQLDatabase, jwtSecret: string) {
    super(db, jwtSecret);
  }
  public async all(
    filters?: z.infer<typeof QueryFilterStaffAll>,
  ): AsyncResult<StaffUser[]> {
    try {
      let query = this.db
        .select(StaffTablePublicColumns)
        .from(StaffTable)
        .leftJoin(UserTable, eq(StaffTable.userId, UserTable.id))
        .$dynamic();

      // Apply filters if provided
      if (filters) {
        const conditions = [];

        // Filter by role
        if (filters.role) {
          conditions.push(eq(StaffTable.role, filters.role));
        }

        // Filter by email
        if (filters.email) {
          conditions.push(eq(UserTable.email, filters.email));
        }

        // Apply all conditions if any exist
        if (conditions.length > 0) {
          if (conditions.length === 1) {
            query = query.where(conditions[0]);
          } else {
            query = query.where(and(...conditions));
          }
        }
      }

      const results = await query;

      return Ok(results as StaffUser[]);
    } catch (error) {
      return Fail(
        `Failed to fetch staff: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        ErrorCodes.UNKNOWN,
      );
    }
  }
  public async create(staffInfo: CreateStaff): AsyncResult<SelectStaff> {
    // Check if user is already a staff member
    const existing = await this.db
      .select()
      .from(StaffTable)
      .where(eq(StaffTable.userId, staffInfo.userId));

    if (existing.length > 0) {
      return Fail(
        "Staff member already exists",
        ErrorCodes.RECORD_ALREADY_EXISTS,
      );
    }

    const [result] = await this.db
      .insert(StaffTable)
      .values(staffInfo)
      .returning();

    return Ok(result);
  }

  public async getByUserId(userId: number): AsyncResult<StaffUser> {
    const [result] = await this.db
      .select(StaffTablePublicColumns)
      .from(StaffTable)
      .leftJoin(UserTable, eq(StaffTable.userId, UserTable.id))
      .where(eq(StaffTable.userId, userId));
    if (!result) {
      return Fail("Not found", ErrorCodes.NOT_FOUND);
    }
    return Ok(result as StaffUser);
  }

  public async getByRole(role?: Roles) {
    const query = this.db
      .select(StaffTablePublicColumns)
      .from(StaffTable)
      .leftJoin(UserTable, eq(StaffTable.userId, UserTable.id));
    if (role) {
      return Ok(await query.where(eq(StaffTable.role, role)));
    }

    const result = await query;
    return Ok(result);
  }

  public async update(
    staffId: number,
    updates: Partial<CreateStaff>,
  ): AsyncResult<{
    id: number;
    role: "admin" | "veterinary" | "receptionist";
    createdAt: Date;
    userId: number;
  }> {
    const [result] = await this.db
      .update(StaffTable)
      .set(updates)
      .where(eq(StaffTable.id, staffId))
      .returning();

    if (!result) {
      return Fail("Staff member not found", ErrorCodes.NOT_FOUND);
    }

    return Ok(result);
  }

  public async remove(staffId: number) {
    const [result] = await this.db
      .delete(StaffTable)
      .where(eq(StaffTable.id, staffId))
      .returning();

    if (!result) {
      return Fail("Staff member not found", ErrorCodes.NOT_FOUND);
    }

    return Ok(result);
  }

  public async hasPermission(userId: number, requiredRoles: Roles[]) {
    const { data: staff, error } = await this.getByUserId(userId);
    if (error) return false;
    if (!staff) return false;
    return requiredRoles.includes(staff.role);
  }
}
