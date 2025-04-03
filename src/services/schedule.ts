import { LibSQLDatabase } from "drizzle-orm/libsql";
import { BaseService } from "./service";
import { UserInfoType } from "../types";
import { UserTable } from "../db/schemas/user";
import { eq, or } from "drizzle-orm";

export class ScheduleService extends BaseService {
  constructor(db: LibSQLDatabase, jwtSecret: string) {
    super(db, jwtSecret);
  }

  public async create(userInfo: UserInfoType) {
    const [existingUser] = await this.db
      .select()
      .from(UserTable)
      .where(
        or(
          eq(UserTable.email, userInfo.email ?? ""),
          eq(UserTable.phoneNumber, userInfo.phoneNumber ?? ""),
        ),
      )
      .limit(1);
    if (existingUser) throw new Error("User already exists");
    const [user] = await this.db
      .insert(UserTable)
      .values({
        name: userInfo.name,
        email: userInfo.email ?? "",
        phoneNumber: userInfo.phoneNumber ?? "",
        passwordHash: "",
        salt: "",
      })
      .returning();

    return user;
  }

  public async get({
    email,
    phoneNumber,
    id,
  }: {
    email?: string;
    phoneNumber?: string;
    id?: number;
  }) {
    if (id == undefined && email == undefined && phoneNumber == undefined) {
      throw new Error(
        "At least one value must be specified between id,email and phoneNumber",
      );
    }
    if (id) return this.getById(id);
    if (email) return this.getByEmail(email);
    if (phoneNumber) return this.getByPhoneNumber(phoneNumber);
    return undefined;
  }

  public async getById(id: number) {
    const [user] = await this.db
      .select()
      .from(UserTable)
      .where(eq(UserTable.id, id));
    return user;
  }

  public async getByEmail(email: string) {
    const [user] = await this.db
      .select()
      .from(UserTable)
      .where(eq(UserTable.email, email));
    return user;
  }
  public async getByPhoneNumber(phoneNumber: string) {
    const [user] = await this.db
      .select()
      .from(UserTable)
      .where(eq(UserTable.phoneNumber, phoneNumber));
    return user;
  }
}
