import { LibSQLDatabase } from "drizzle-orm/libsql";
import { BaseService } from "./service";
import { UserInfoType } from "../types";
import { SelectUser, SelectUserData, UserTable } from "../db/schemas/user";
import { eq, or } from "drizzle-orm";
import { Fail, Ok, Result, ErrorCodes, Failed } from "../../lib/error";

export class UserService extends BaseService {
  constructor(db: LibSQLDatabase, jwtSecret: string) {
    super(db, jwtSecret);
  }

  public async create(userInfo: UserInfoType): Promise<Result<SelectUserData>> {
    try {
      const [existingUser] = await this.db
        .select()
        .from(UserTable)
        .where(
          or(
            eq(UserTable.email, userInfo.email!),
          ),
        )
        .limit(1);
      if (
        existingUser &&
        existingUser.email === userInfo.email &&
        existingUser.phoneNumber === userInfo.phoneNumber
      ) {
        return Fail("User already exists", ErrorCodes.USER_ALREADY_EXISTS);
      }
      console.log("creating new user")
      const [user] = await this.db
        .insert(UserTable)
        .values({
          name: userInfo.name,
          surname: userInfo.surname,
          email: userInfo.email ?? "",
          phoneNumber: userInfo.phoneNumber ?? "",
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
      console.log(error)
      return Fail(
        `Failed to create user: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        ErrorCodes.UNKNOWN,
      );
    }
  }

  public async all(): Promise<
    Result<Omit<SelectUser, "salt" | "passwordHash">[]>
  > {
    try {
      const users = await this.db
        .select({
          id: UserTable.id,
          name: UserTable.name,
          surname: UserTable.surname,
          email: UserTable.email,
          phoneNumber: UserTable.phoneNumber,
          createdAt: UserTable.createdAt,
          type: UserTable.type,
        })
        .from(UserTable);
      return Ok(users);
    } catch (err) {
      return Fail("Database error", ErrorCodes.UNKNOWN);
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
  }): Promise<Result<SelectUser | undefined>> {
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

      return Ok(user);
    } catch (error) {
      return Fail(
        `Failed to get user: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        ErrorCodes.UNKNOWN,
      );
    }
  }

  public async getById(id: number): Promise<Result<SelectUser | undefined>> {
    try {
      const [user] = await this.db
        .select()
        .from(UserTable)
        .where(eq(UserTable.id, id));

      return Ok(user);
    } catch (error) {
      return Fail(
        `Failed to get user by ID: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        ErrorCodes.UNKNOWN,
      );
    }
  }

  public async getByEmail(
    email: string,
  ): Promise<Result<SelectUser | undefined>> {
    try {
      const [user] = await this.db
        .select()
        .from(UserTable)
        .where(eq(UserTable.email, email));

      return Ok(user);
    } catch (error) {
      return Fail(
        `Failed to get user by email: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        ErrorCodes.UNKNOWN,
      );
    }
  }

  public async getByPhoneNumber(
    phoneNumber: string,
  ): Promise<Result<SelectUser | undefined>> {
    try {
      const [user] = await this.db
        .select()
        .from(UserTable)
        .where(eq(UserTable.phoneNumber, phoneNumber));

      return Ok(user);
    } catch (error) {
      return Fail(
        `Failed to get user by phone number: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        ErrorCodes.UNKNOWN,
      );
    }
  }

  /**
   * Update user details.
   */
  public async update(
    id: number,
    userInfo: Partial<UserInfoType>,
  ): Promise<Result<SelectUser>> {
    try {
      const [updatedUser] = await this.db
        .update(UserTable)
        .set({
          name: userInfo.name,
          surname: userInfo.surname,
          email: userInfo.email,
          phoneNumber: userInfo.phoneNumber,
          // Exclude passwordHash and salt here since they're handled in resetPassword
        })
        .where(eq(UserTable.id, id))
        .returning();

      return Ok(updatedUser);
    } catch (error) {
      return Fail(
        `Failed to update user: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        ErrorCodes.UNKNOWN,
      );
    }
  }

  /**
   * Delete a user by id.
   */
  public async delete(id: number): Promise<Result<SelectUser>> {
    try {
      const [deletedUser] = await this.db
        .delete(UserTable)
        .where(eq(UserTable.id, id))
        .returning();

      return Ok(deletedUser);
    } catch (error) {
      return Fail(
        `Failed to delete user: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        ErrorCodes.UNKNOWN,
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
  ): Promise<Result<SelectUser>> {
    try {
      const [updatedUser] = await this.db
        .update(UserTable)
        .set({
          passwordHash: newPasswordHash,
          salt: newSalt,
        })
        .where(eq(UserTable.id, id))
        .returning();

      return Ok(updatedUser);
    } catch (error) {
      return Fail(
        `Failed to reset password: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        ErrorCodes.UNKNOWN,
      );
    }
  }
}
