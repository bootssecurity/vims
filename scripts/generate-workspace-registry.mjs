import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = process.cwd();
const sourceRoots = ["packages/modules", "packages/modules/providers", "packages/plugins"];

async function collectPackageEntries(baseDir) {
  const fullBase = resolve(root, baseDir);
  const entries = await readdir(fullBase, { withFileTypes: true });
  const collected = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const packageJsonPath = join(fullBase, entry.name, "package.json");
    let packageJson;

    try {
      packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
    } catch {
      continue;
    }

    if (!packageJson.vims) {
      continue;
    }

    collected.push({
      packageName: packageJson.name,
      exportName: packageJson.vims.exportName,
      kind: packageJson.vims.kind,
    });
  }

  return collected;
}

const collected = (
  await Promise.all(sourceRoots.map((sourceRoot) => collectPackageEntries(sourceRoot)))
).flat();

const modules = collected.filter((entry) => entry.kind === "module");
const providers = collected.filter((entry) => entry.kind === "provider");
const plugins = collected.filter((entry) => entry.kind === "plugin");

const importLines = collected.map(
  (entry) => `import { ${entry.exportName} } from "${entry.packageName}";`,
);

const content = `import { createFrameworkCatalog, discoverManifest } from "@vims/framework";
${importLines.join("\n")}

export const workspaceCatalog = createFrameworkCatalog({
  modules: [
${modules.map((entry) => `    ${entry.exportName},`).join("\n")}
  ],
  providers: [
${providers.map((entry) => `    ${entry.exportName},`).join("\n")}
  ],
  plugins: [
${plugins.map((entry) => `    ${entry.exportName},`).join("\n")}
  ],
});

export function discoverWorkspaceManifest(config = {}) {
  return discoverManifest(workspaceCatalog, config);
}
`;

const outputPath = resolve(
  root,
  "packages/vims/src/generated/workspace-catalog.ts",
);
await mkdir(resolve(root, "packages/vims/src/generated"), {
  recursive: true,
});
await writeFile(
  outputPath,
  `${content}\n`,
  "utf8",
);

console.log(
  `Generated workspace catalog with ${modules.length} modules, ${providers.length} providers, and ${plugins.length} plugins`,
);
