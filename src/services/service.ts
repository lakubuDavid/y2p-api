import { LibSQLDatabase } from "drizzle-orm/libsql";

export abstract class BaseService {
  protected readonly JWT_SECRET: string;
  protected readonly db: LibSQLDatabase;

  constructor(db: LibSQLDatabase, jwtSecret: string) {
    if (!jwtSecret) throw new Error("JWT_SECRET is required");
    this.JWT_SECRET = jwtSecret;
    this.db = db;
  }
}
