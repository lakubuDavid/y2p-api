import { LibSQLDatabase } from "drizzle-orm/libsql";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { sign, verify } from "hono/jwt";
import { UserTable } from "../db/schemas/user";
import { TokenTable } from "../db/schemas/token";
import { JWTPayload } from "hono/utils/jwt/types";

interface TokenPayload extends JWTPayload {
  userId: number;
  email: string;
  type: 'access' | 'refresh';
  exp?: number;
}

export class AuthService {
  private readonly SALT_LENGTH = 32;
  private readonly KEY_LENGTH = 64;
  private readonly ITERATIONS = 100000;
  private readonly DIGEST = 'sha512';
  private readonly JWT_SECRET: string;
  private readonly ACCESS_TOKEN_EXPIRY = 15 * 60; // 15 minutes
  private readonly REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60; // 30 days

  constructor(
    private db: LibSQLDatabase,
    jwtSecret: string
  ) {
    if (!jwtSecret) throw new Error('JWT_SECRET is required');
    this.JWT_SECRET = jwtSecret;
  }

  private async hashPassword(password: string, salt?: string): Promise<[string, string]> {
    const useSalt = salt || crypto.randomBytes(this.SALT_LENGTH).toString('hex');
    
    const hash = await new Promise<string>((resolve, reject) => {
      crypto.pbkdf2(
        password,
        useSalt,
        this.ITERATIONS,
        this.KEY_LENGTH,
        this.DIGEST,
        (err, derivedKey) => {
          if (err) reject(err);
          resolve(derivedKey.toString('hex'));
        }
      );
    });

    return [hash, useSalt];
  }

  private async generateTokenPair(userId: number, email: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const now = Math.floor(Date.now() / 1000);

    const accessToken = await sign({
      userId,
      email,
      type: 'access',
      exp: now + this.ACCESS_TOKEN_EXPIRY,
    } as TokenPayload, this.JWT_SECRET);

    const refreshToken = await sign({
      userId,
      email,
      type: 'refresh',
      exp: now + this.REFRESH_TOKEN_EXPIRY,
    } as TokenPayload, this.JWT_SECRET);

    // Store refresh token in database
    await this.db.insert(TokenTable).values({
      userId,
      refreshToken,
      expiresAt: now + this.REFRESH_TOKEN_EXPIRY,
    });

    return { accessToken, refreshToken };
  }

  public async verifyToken(token: string): Promise<TokenPayload> {
    try {
      const payload = await verify(token, this.JWT_SECRET) as TokenPayload;

      if (payload.type === 'refresh') {
        // Check if refresh token is revoked
        const [storedToken] = await this.db
          .select()
          .from(TokenTable)
          .where(
            and(
              eq(TokenTable.refreshToken, token),
              eq(TokenTable.isRevoked, false)
            )
          )
          .limit(1);

        if (!storedToken) {
          throw new Error('Token has been revoked');
        }
      }

      return payload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  public async refreshTokens(refreshToken: string) {
    try {
      const payload = await this.verifyToken(refreshToken);
      
      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Generate new token pair
      const tokens = await this.generateTokenPair(payload.userId, payload.email);

      // Revoke old refresh token
      await this.db
        .update(TokenTable)
        .set({ isRevoked: true })
        .where(eq(TokenTable.refreshToken, refreshToken));

      return tokens;
    } catch (error) {
      throw new Error('Invalid refresh token');
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

  public async login(email: string, password: string) {
    const [user] = await this.db
      .select()
      .from(UserTable)
      .where(eq(UserTable.email, email))
      .limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    const [hashedAttempt] = await this.hashPassword(password, user.salt);
    
    if (hashedAttempt !== user.passwordHash) {
      throw new Error('Invalid password');
    }

    const tokens = await this.generateTokenPair(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      ...tokens
    };
  }

  public async signUp(email: string, password: string, name: string) {
    const existingUser = await this.db
      .select()
      .from(UserTable)
      .where(eq(UserTable.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      throw new Error('Email already registered');
    }

    const [hashedPassword, salt] = await this.hashPassword(password);

    const [user] = await this.db
      .insert(UserTable)
      .values({
        name,
        email,
        passwordHash: hashedPassword,
        salt,
      })
      .returning();

    const tokens = await this.generateTokenPair(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      ...tokens
    };
  }
}
