import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.POSTGRES_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/vims",
  },
  schema: "./packages/modules/websites/src/db/schema.ts",
  out: "./packages/modules/websites/drizzle",
  strict: true,
  verbose: true,
});
