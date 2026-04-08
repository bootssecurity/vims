#!/usr/bin/env node
import {
  normalizeModules,
  writeScaffold,
} from "./generator";

function getArgValue(flag: string) {
  const index = process.argv.indexOf(flag);

  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

export function runCreateVimsAppCli() {
  const name = getArgValue("--name") ?? "dealer-app";
  const modules = normalizeModules(getArgValue("--modules"));
  const outDir = getArgValue("--out-dir") ?? process.cwd();

  return writeScaffold(outDir, { name, modules }).then((result) => {
    console.log(`Scaffolded "${name}" in ${result.targetDir}`);
    console.log("Created files:");

    for (const file of result.files) {
      console.log(`- ${file}`);
    }
  });
}

if (process.argv[1] && /index\.(ts|js)$/.test(process.argv[1])) {
  void runCreateVimsAppCli();
}
