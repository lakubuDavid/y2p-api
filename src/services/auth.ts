// src/services/auth.ts
import { LibSQLDatabase } from "drizzle-orm/libsql";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { sign, verify } from "hono/jwt";
import { UserTable } from "../db/schemas/user";
import { TokenTable } from "../db/schemas/token";
import { JWTPayload } from "hono/utils/jwt/types";
import { BaseService } from "./service";
import {
  AsyncResult,
  ErrorCodes,
  Fail,
  Failed,
  ManagedError,
  Result,
} from "../../lib/error";
import { getCookie } from "hono/cookie";

export interface TokenPayload extends JWTPayload {
  userId: number;
  email: string;
  type: "access" | "refresh";
  exp?: number;
}

export class AuthService extends BaseService {
  private readonly SALT_LENGTH = 32;
  private readonly KEY_LENGTH = 64;
  private readonly ITERATIONS = 100000;
  private readonly DIGEST = "sha512";
  public static readonly ACCESS_TOKEN_EXPIRY = 15 * 60 * 1000; // 15 minutes
  public static readonly REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days

  constructor(db: LibSQLDatabase, jwtSecret: string) {
    super(db, jwtSecret);
  }

  private async hashPassword(
    password: string,
    salt?: string,
  ): Promise<[string, string]> {
    const useSalt =
      salt || crypto.randomBytes(this.SALT_LENGTH).toString("hex");

    const hash = await new Promise<string>((resolve, reject) => {
      crypto.pbkdf2(
        password,
        useSalt,
        this.ITERATIONS,
        this.KEY_LENGTH,
        this.DIGEST,
        (err, derivedKey) => {
          if (err) reject(err);
          resolve(derivedKey.toString("hex"));
        },
      );
    });

    return [hash, useSalt];
  }

  public async generateTokenPair(
    userId: number,
    email: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const now = Math.floor(Date.now() / 1000);

    const accessToken = await sign(
      {
        userId,
        email,
        type: "access",
        exp: now + AuthService.ACCESS_TOKEN_EXPIRY,
      } as TokenPayload,
      this.JWT_SECRET,
    );

    const refreshToken = await sign(
      {
        userId,
        email,
        type: "refresh",
        exp: now + AuthService.REFRESH_TOKEN_EXPIRY,
      } as TokenPayload,
      this.JWT_SECRET,
    );

    // Store refresh token in database
    await this.db.insert(TokenTable).values({
      userId,
      refreshToken,
      expiresAt: now + AuthService.REFRESH_TOKEN_EXPIRY,
    });

    return { accessToken, refreshToken };
  }

  public async verifyToken(token: string): Promise<TokenPayload> {
    try {
      const payload = (await verify(token, this.JWT_SECRET)) as TokenPayload;

      if (payload.type === "refresh") {
        // Check if refresh token is revoked
        const [storedToken] = await this.db
          .select()
          .from(TokenTable)
          .where(
            and(
              eq(TokenTable.refreshToken, token),
              eq(TokenTable.isRevoked, false),
            ),
          );

        if (!storedToken) {
          throw new Error("Token has been revoked");
        }
      }

      return payload;
    } catch (error) {
      throw new Error("Invalid or expired token");
    }
  }

  public async refreshTokens(
    refreshToken: string,
  ): Promise<Result<{ accessToken: string; refreshToken: string }>> {
    try {
      const payload = await this.verifyToken(refreshToken);

      if (payload.type !== "refresh") {
        return Fail("Invalid token type", ErrorCodes.INVALID_ARGUMENT);
      }

      // Generate new token pair
      const tokens = await this.generateTokenPair(
        payload.userId,
        payload.email,
      );

      // Revoke old refresh token
      await this.db
        .update(TokenTable)
        .set({ isRevoked: true })
        .where(eq(TokenTable.refreshToken, refreshToken));

      return { data: tokens };
    } catch (error) {
      console.log(error);
      return Fail(
        "Invalid refresh token",
        ErrorCodes.INVALID_ARGUMENT,
        error as Error,
      );
    }
  }

  public async revokeToken(token: string) {
    await this.db
      .update(TokenTable)
      .set({ isRevoked: true })
      .where(eq(TokenTable.refreshToken, token));
  }

  public async revokeAllUserTokens(userId: number) {
    await this.db
      .update(TokenTable)
      .set({ isRevoked: true })
      .where(eq(TokenTable.userId, userId));
  }

  public async login(
    email: string,
    password: string,
  ): AsyncResult<{
    accessToken: string;
    refreshToken: string;
    user: { id: number; email: string; name: string };
  }> {
    const [user] = await this.db
      .select()
      .from(UserTable)
      .where(eq(UserTable.email, email));

    if (!user) {
      return Fail("Username or password invalid", ErrorCodes.INVALID_ARGUMENT);
    }

    const [hashedAttempt] = await this.hashPassword(password, user.salt);

    if (hashedAttempt !== user.passwordHash) {
      return Fail(
        "Username or password invalid",
        ErrorCodes.AUTHENTICATION_FAILED,
      );
    }

    const tokens = await this.generateTokenPair(user.id, user.email);

    return {
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        ...tokens,
      },
    };
  }

  public async signUp(email: string, password: string, name: string) {
    const [existingUser] = await this.db
      .select()
      .from(UserTable)
      .where(eq(UserTable.email, email));

    if (existingUser) {
      throw new Error("Email already registered");
    }
    console.log("no similar email");
    const [hashedPassword, salt] = await this.hashPassword(password);

    const [user] = await this.db
      .insert(UserTable)
      .values({
        name,
        email,
        passwordHash: hashedPassword,
        salt,
        type: "client",
      })
      .returning();

    const tokens = await this.generateTokenPair(user.id, user.email);
    console.log("tokesn generated");
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      ...tokens,
    };
  }
}
