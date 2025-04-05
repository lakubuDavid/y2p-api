import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config({
  path: "./.dev.vars",
});

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schemas",
  dialect: "turso",
  dbCredentials: {
    url: process.env["TURSO_DB_URL"] || "libsql://y2p-lakubudavid.turso.io",
    authToken:
      process.env["TURSO_TOKEN"] ||
      "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3Mzg5ODg0MzcsImlkIjoiYTA4ZTdhMGMtMjgwZi00YzdhLWFiYWYtZDY5MGU1ODNkMzAwIn0.uB50IPnzRrThsW8qlv9-wzomnf_2StJ5Z9TYdTpzQckcHRgFLRY0rorCvI7uw8BBNnq8-NDNsZ4RFcbRh3gFAQ",
  },
});
