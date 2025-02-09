import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config({
  path:"./.dev.vars"
})

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schemas',
  dialect: 'turso',
  dbCredentials: {
    url: process.env["TURSO_DB_URL"] || "",
    authToken: process.env["TURSO_TOKEN"] || "",
  },
});
