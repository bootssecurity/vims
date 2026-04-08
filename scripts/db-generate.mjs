import { spawnSync } from "node:child_process";
import { migrationDomains } from "./db-manifest.mjs";

for (const domain of migrationDomains) {
  const result = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["drizzle-kit", "generate", "--config", domain.configPath],
    {
      stdio: "inherit",
      env: process.env,
    },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
