import pg, { Client } from "pg";

export async function resetDatabase(dbName: string = "vims_test") {
  // Connect to default DB `postgres` to drop/recreate
  const client = new Client({
    connectionString: "postgres://localhost/postgres", // Default brew postgres URL
  });

  await client.connect();

  try {
    // Terminate existing connections to vims_test
    await client.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = $1
        AND pid <> pg_backend_pid();
    `, [dbName]);

    // Drop and recreate to ensure clean schema
    await client.query(`DROP DATABASE IF EXISTS ${dbName};`);
    await client.query(`CREATE DATABASE ${dbName};`);
  } catch (error) {
    console.error("Failed resetting db:", error);
    throw error;
  } finally {
    await client.end();
  }
}
