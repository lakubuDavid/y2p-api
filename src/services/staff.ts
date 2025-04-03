import { LibSQLDatabase } from "drizzle-orm/libsql";
import { StaffTable, CreateStaff, SelectStaff } from "../db/schemas/staff";
import { UserTable } from "../db/schemas/user";
import { eq, and } from "drizzle-orm";
import { BaseService } from "./service";

export type Department = "admin" | "veterinary" | "reception";
export type StaffWithUser = SelectStaff & {
  user: {
    name: string;
    email: string;
  };
};

export class StaffService extends BaseService{
  constructor(
    db: LibSQLDatabase,
    jwtSecret: string,
  ) {
    super(db,jwtSecret)
  }

  public async addStaffMember(staffInfo: CreateStaff) {
    // Check if user is already a staff member
    const existing = await this.db
      .select()
      .from(StaffTable)
      .where(eq(StaffTable.userId, staffInfo.userId));

    if (existing.length > 0) {
      throw new Error("User is already a staff member");
    }

    const [result] = await this.db
      .insert(StaffTable)
      .values(staffInfo)
      .returning();

    return result;
  }

  public async getStaffMember(userId: number) {
    const [result] = await this.db
      .select({
        id: StaffTable.id,
        department: StaffTable.department,
        userId: StaffTable.userId,
        createdAt: StaffTable.createdAt,
        user: {
          name: UserTable.name,
          email: UserTable.email,
        },
      })
      .from(StaffTable)
      .leftJoin(UserTable, eq(StaffTable.userId, UserTable.id))
      .where(eq(StaffTable.userId, userId));

    return result || null;
  }

  public async getAllStaff(department?: Department) {
    const query = this.db
      .select({
        id: StaffTable.id,
        department: StaffTable.department,
        userId: StaffTable.userId,
        createdAt: StaffTable.createdAt,
        user: {
          name: UserTable.name,
          email: UserTable.email,
        },
      })
      .from(StaffTable)
      .leftJoin(UserTable, eq(StaffTable.userId, UserTable.id));

    if (department) {
      return await query.where(eq(StaffTable.department, department));
    }

    return await query;
  }

  public async updateStaffMember(
    staffId: number,
    updates: Partial<CreateStaff>,
  ) {
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

  public async removeStaffMember(staffId: number) {
    const [result] = await this.db
      .delete(StaffTable)
      .where(eq(StaffTable.id, staffId))
      .returning();

    if (!result) {
      throw new Error("Staff member not found");
    }

    return result;
  }

  public async hasPermission(
    userId: number,
    requiredDepartments: Department[],
  ) {
    const staff = await this.getStaffMember(userId);
    if (!staff) return false;
    return requiredDepartments.includes(staff.department);
  }
}
