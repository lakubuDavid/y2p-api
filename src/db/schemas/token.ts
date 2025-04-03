import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const TokenTable = sqliteTable('tokens', {
  id: integer('id').primaryKey(),
  userId: integer('user_id').notNull(),
  refreshToken: text('refresh_token').notNull(),
  isRevoked: integer('is_revoked', { mode: 'boolean' }).notNull().default(false),
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at').notNull().$default(()=>Date.now()),
});
