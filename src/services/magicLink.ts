import { LibSQLDatabase } from "drizzle-orm/libsql";
import { BaseService } from "./service";
import { SelectUser, SelectUserData, UserTable } from "../db/schemas/user";
import { eq, and, gt } from "drizzle-orm";
import {
  Fail,
  Ok,
  Result,
  ErrorCodes,
  ManagedError,
  MatchErrorCode,
} from "../../lib/error";
import { nanoid } from "nanoid";
import { Resend } from "resend";
import { MagicLinkTable, SelectMagicLink } from "../db/schemas/magicLink";

import { MagicLinkEmail } from "../views/emails/MagicLink";

export class MagicLinkService extends BaseService {
  private resend: Resend;
  private appUrl: string;

  constructor(
    db: LibSQLDatabase,
    jwtSecret: string,
    resendApiKey: string,
    appUrl: string,
  ) {
    super(db, jwtSecret);
    if (!resendApiKey || resendApiKey.trim() === "") {
      throw new ManagedError(
        `Missing environment variables`,
        ErrorCodes.SERVER_MISCONFIGURATION,
      );
    }
    this.resend = new Resend(resendApiKey);
    // this.resend.domains.get()
    this.appUrl = appUrl;
  }

  /**
   * Create a magic link for a user
   */
  public async createMagicLink(
    userId: number,
  ): Promise<Result<SelectMagicLink>> {
    try {
      // Check if user exists
      const userResult = await this.db
        .select()
        .from(UserTable)
        .where(eq(UserTable.id, userId))
        .limit(1);

      if (userResult.length === 0) {
        return Fail("User not found", ErrorCodes.USER_NOT_FOUND);
      }

      // Generate a secure token
      const token = nanoid(32);

      // Set expiration (24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Invalidate any existing magic links for this user
      await this.db
        .update(MagicLinkTable)
        .set({ used: true })
        .where(eq(MagicLinkTable.userId, userId));

      // Create new magic link
      const [magicLink] = await this.db
        .insert(MagicLinkTable)
        .values({
          userId,
          token,
          expiresAt,
        })
        .returning();

      return Ok(magicLink);
    } catch (error) {
      return Fail(
        `Failed to create magic link: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        MatchErrorCode(error as Error),
        error as Error,
      );
    }
  }

  /**
   * Verify a magic link token
   */
  public async verifyMagicLink(token: string): Promise<Result<SelectUserData>> {
    try {
      // Find valid magic link
      const [magicLink] = await this.db
        .select()
        .from(MagicLinkTable)
        .where(
          and(
            eq(MagicLinkTable.token, token),
            eq(MagicLinkTable.used, false),
            gt(MagicLinkTable.expiresAt, new Date()),
          ),
        )
        .limit(1);

      if (!magicLink) {
        return Fail("Invalid or expired link", ErrorCodes.INVALID_TOKEN);
      }

      // Mark link as used
      await this.db
        .update(MagicLinkTable)
        .set({ used: true })
        .where(eq(MagicLinkTable.id, magicLink.id));

      // Get the user
      const [user] = await this.db
        .select({
          id: UserTable.id,
          name: UserTable.name,
          surname: UserTable.surname,
          email: UserTable.email,
          phoneNumber: UserTable.phoneNumber,
          createdAt: UserTable.createdAt,
          type: UserTable.type,
        })
        .from(UserTable)
        .where(eq(UserTable.id, magicLink.userId))
        .limit(1);

      if (!user) {
        return Fail("User not found", ErrorCodes.USER_NOT_FOUND);
      }

      return Ok(user);
    } catch (error) {
      return Fail(
        `Failed to verify magic link: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        MatchErrorCode(error as Error),
        error as Error,
      );
    }
  }
}
