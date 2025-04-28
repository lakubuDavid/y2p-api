import { LibSQLDatabase } from "drizzle-orm/libsql";
import { BaseService } from "./service";
import { UserInfoType } from "../types";
import {
  SelectUser,
  SelectUserData,
  UpdateUserParams,
  UserTable,
} from "../db/schemas/user";
import { eq, or } from "drizzle-orm";
import {
  Fail,
  Ok,
  Result,
  ErrorCodes,
  Failed,
  MatchErrorCode,
} from "../../lib/error";
import { SelectStaff, StaffTable } from "@/models/staff";

const UserSelectColumns = {
  name: UserTable.name,
  id: UserTable.id,
  surname: UserTable.surname,
  email: UserTable.email,
  phoneNumber: UserTable.phoneNumber,
  type: UserTable.type,
  createdAt: UserTable.createdAt,
  role: StaffTable.role,
  staffId:StaffTable.id
};

export class UserService extends BaseService {
  constructor(db: LibSQLDatabase, jwtSecret: string) {
    super(db, jwtSecret);
  }

  public async create(userInfo: UserInfoType): Promise<Result<SelectUserData>> {
    try {
      const [existingUser] = await this.db
        .select(UserSelectColumns)
        .from(UserTable)
        .innerJoin(StaffTable, eq(StaffTable.userId, UserTable.id))
        .where(or(eq(UserTable.email, userInfo.email!)));
      if (
        existingUser &&
        existingUser.email === userInfo.email &&
        existingUser.phoneNumber === userInfo.phoneNumber
      ) {
        return Fail("User already exists", ErrorCodes.USER_ALREADY_EXISTS);
      }
      console.log("creating new user");
      const [user] = await this.db
        .insert(UserTable)
        .values({
          name: userInfo.name,
          surname: userInfo.surname,
          email: userInfo.email ?? "",
          phoneNumber: userInfo.phoneNumber ?? "",
          type: userInfo.type,
          passwordHash: "",
          salt: "",
        })
        .returning({
          id: UserTable.id,
          name: UserTable.name,
          surname: UserTable.surname,
          email: UserTable.email,
          phoneNumber: UserTable.phoneNumber,
          createdAt: UserTable.createdAt,
          type: UserTable.type,
        });

      return Ok(user);
    } catch (error) {
      console.log(error);
      return Fail(
        `Failed to create user: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        MatchErrorCode(error as Error),
        error as Error,
      );
    }
  }

  public async all(): Promise<Result<SelectUserData[]>> {
    try {
      const users = await this.db
        .select(UserSelectColumns)
        .from(UserTable)
        .leftJoin(StaffTable, eq(StaffTable.userId, UserTable.id));

      const _users = users.map((_user) => {
        console.log("role", _user.role);
        return {
          ..._user,
          role: _user.role == null ? undefined : _user.role,
        };
      });
      return Ok(_users);
    } catch (err) {
      return Fail(
        err instanceof Error ? err.message : "Database error",
        ErrorCodes.DATABASE_ERROR,
        err as Error,
      );
    }
  }

  public async get({
    email,
    phoneNumber,
    id,
  }: {
    email?: string;
    phoneNumber?: string;
    id?: number;
  }): Promise<Result<SelectUserData>> {
    try {
      if (
        id === undefined &&
        email === undefined &&
        phoneNumber === undefined
      ) {
        return Fail(
          "At least one value must be specified between id, email, and phoneNumber",
          ErrorCodes.VALIDATION_ERROR,
        );
      }

      let user;
      if (id !== undefined) {
        const { data, error } = await this.getById(id);
        if (error) {
          return Failed(error);
        }
        user = data;
      }

      if (!user && email !== undefined) {
        const { data, error } = await this.getByEmail(email);
        if (error) {
          return Failed(error);
        }
        user = data;
      }

      if (!user && phoneNumber !== undefined) {
        const { data, error } = await this.getByPhoneNumber(phoneNumber);
        if (error) {
          return Failed(error);
        }
        user = data;
      }
      if (!user) return Fail("User not found", ErrorCodes.USER_NOT_FOUND);
      return Ok(user);
    } catch (error) {
      return Fail(
        `Failed to get user: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        MatchErrorCode(error as Error),
        error as Error,
      );
    }
  }

  public async getById(id: number): Promise<Result<SelectUserData>> {
    try {
      const [user] = await this.db
        .select(UserSelectColumns)
        .from(UserTable)
        .leftJoin(StaffTable, eq(StaffTable.userId, UserTable.id))
        .where(eq(UserTable.id, id));
      if (!user) {
        return Fail("User not found", ErrorCodes.NOT_FOUND);
      }
      return Ok(user);
    } catch (error) {
      return Fail(
        `Failed to get user by ID: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        MatchErrorCode(error as Error),
        error as Error,
      );
    }
  }

  public async getByEmail(email: string): Promise<Result<SelectUserData>> {
    try {
      const [user] = await this.db
        .select(UserSelectColumns)
        .from(UserTable)
        .leftJoin(StaffTable, eq(StaffTable.userId, UserTable.id))
        .where(eq(UserTable.email, email));
      if (!user) return Fail("User not found", ErrorCodes.USER_NOT_FOUND);
      return Ok(user);
    } catch (error) {
      return Fail(
        `Failed to get user by email: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        MatchErrorCode(error as Error),
        error as Error,
      );
    }
  }

  public async getByPhoneNumber(
    phoneNumber: string,
  ): Promise<Result<SelectUserData>> {
    try {
      const [user] = await this.db
        .select(UserSelectColumns)
        .from(UserTable)
        .leftJoin(StaffTable, eq(StaffTable.userId, UserTable.id))
        .where(eq(UserTable.phoneNumber, phoneNumber));

      if (!user) {
        return Fail("User not found", ErrorCodes.NOT_FOUND);
      }
      return Ok(user);
    } catch (error) {
      return Fail(
        `Failed to get user by phone number: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        MatchErrorCode(error as Error),
        error as Error,
      );
    }
  }

  /**
   * Update user details.
   */
  public async update(
    id: number,
    userInfo: UpdateUserParams,
  ): Promise<Result<SelectUserData>> {
    try {
      const updatedUser = await this.db.transaction(async (tx) => {
        const [user] = await tx
          .update(UserTable)
          .set({
            name: userInfo.name,
            surname: userInfo.surname,
            email: userInfo.email,
            phoneNumber: userInfo.phoneNumber,
            type: userInfo.type,
            // Exclude passwordHash and salt here since they're handled in resetPassword
          })
          .where(eq(UserTable.id, id))
          .returning(UserSelectColumns);
        let staff: SelectStaff | undefined = undefined;
        if (userInfo.role) {
          // Check if staff member exists
          const [staffRow] = await tx
            .select()
            .from(StaffTable)
            .where(eq(StaffTable.userId, id));
          if (staffRow) {
            [staff] = await tx
              .update(StaffTable)
              .set({ role: userInfo.role })
              .where(eq(StaffTable.userId, id))
              .returning();
          } else {
            [staff] = await tx
              .insert(StaffTable)
              .values({
                userId: id,
                role: userInfo.role,
              })
              .returning();
          }
        }
        return { ...user, role: user.role ?? staff?.role };
        //   return r;
      });
      if (!updatedUser) {
        return Fail("User not found", ErrorCodes.NOT_FOUND);
      }
      return Ok(updatedUser);
    } catch (error) {
      return Fail(
        `Failed to update user: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        MatchErrorCode(error as Error),
        error as Error,
      );
    }
  }

  /**
   * Delete a user by id.
   */
  public async delete(id: number): Promise<Result<SelectUserData>> {
    try {
      const [deletedUser] = await this.db
        .delete(UserTable)
        .where(eq(UserTable.id, id))
        .returning(UserSelectColumns);
      if (!deletedUser) return Fail("User not found", ErrorCodes.NOT_FOUND);
      return Ok(deletedUser);
    } catch (error) {
      return Fail(
        `Failed to delete user: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        MatchErrorCode(error as Error),
        error as Error,
      );
    }
  }

  /**
   * Reset the user's password.
   * @param id - User ID.
   * @param newPasswordHash - The new hashed password.
   * @param newSalt - The new salt.
   */
  public async resetPassword(
    id: number,
    newPasswordHash: string,
    newSalt: string,
  ): Promise<Result<SelectUserData>> {
    try {
      const [updatedUser] = await this.db
        .update(UserTable)
        .set({
          passwordHash: newPasswordHash,
          salt: newSalt,
        })
        .where(eq(UserTable.id, id))
        .returning(UserSelectColumns);

      return Ok(updatedUser);
    } catch (error) {
      return Fail(
        `Failed to reset password: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        MatchErrorCode(error as Error),
        error as Error,
      );
    }
  }
}
