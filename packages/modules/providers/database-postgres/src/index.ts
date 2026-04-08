import postgres from "postgres";
import { defineProvider } from "@vims/framework";

export function createPostgresUrl() {
  return (
    process.env.POSTGRES_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/vims"
  );
}

let cachedClient: ReturnType<typeof postgres> | null = null;

export function createPostgresClient() {
  if (!cachedClient) {
    cachedClient = postgres(createPostgresUrl(), {
      max: 10,
      idle_timeout: 20,
      max_lifetime: 60 * 30, // 30 minutes
    });
  }
  return cachedClient;
}

export const postgresProvider = defineProvider({
  key: "database-postgres",
  label: "PostgreSQL",
  category: "database",
  register: () => ({
    key: "database-postgres",
    url: createPostgresUrl(),
    createClient: createPostgresClient,
  }),
});
