import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";
import { migrationDomains } from "./db-manifest.mjs";

const connection = postgres(
  process.env.POSTGRES_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/vims",
  {
    max: 1,
  },
);

async function run() {
  await connection.unsafe("CREATE EXTENSION IF NOT EXISTS pgcrypto;");

  for (const domain of migrationDomains) {
    console.log(`Applying ${domain.name} migrations from ${domain.migrationsFolder}`);
    const files = (await readdir(domain.migrationsFolder))
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const sql = await readFile(join(domain.migrationsFolder, file), "utf8");
      console.log(`  -> ${file}`);
      await connection.unsafe(sql);
    }
  }
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await connection.end();
  });
