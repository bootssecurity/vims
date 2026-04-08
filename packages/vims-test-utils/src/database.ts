export function createDatabaseTestContext() {
  return {
    connectionString:
      process.env.POSTGRES_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/vims",
    schema: "public",
  };
}
