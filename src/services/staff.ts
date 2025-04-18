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
export class StaffService extends BaseService {
  constructor(db: LibSQLDatabase, jwtSecret: string) {
    super(db, jwtSecret);
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
      return await query.where(eq(StaffTable.role, role));
    }

    return await query;
  }

  public async update(staffId: number, updates: Partial<CreateStaff>) {
    const [result] = await this.db
      .update(StaffTable)
      .set(updates)
      .where(eq(StaffTable.id, staffId))
      .returning();

    if (!result) {
      throw new Error("Staff member not found");
    }

    return result;
  }

  public async remove(staffId: number) {
    const [result] = await this.db
      .delete(StaffTable)
      .where(eq(StaffTable.id, staffId))
      .returning();

    if (!result) {
      throw new Error("Staff member not found");
    }

    return result;
  }

  public async hasPermission(userId: number, requiredRoles: Roles[]) {
    const { data: staff, error } = await this.getByUserId(userId);
    if (error) return false;
    if (!staff) return false;
    return requiredRoles.includes(staff.role);
  }
}
