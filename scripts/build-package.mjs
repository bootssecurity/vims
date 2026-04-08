import { mkdir, readdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import ts from "typescript";

const packageRoot = process.cwd();
const tsconfigPath = ts.findConfigFile(packageRoot, ts.sys.fileExists, "tsconfig.json");

if (!tsconfigPath) {
  throw new Error(`No tsconfig.json found in ${packageRoot}`);
}

const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);

if (configFile.error) {
  throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n"));
}

const parsedConfig = ts.parseJsonConfigFileContent(
  configFile.config,
  ts.sys,
  packageRoot,
  {
    noEmit: false,
    declaration: true,
    declarationMap: false,
    sourceMap: false,
    outDir: resolve(packageRoot, "dist"),
    incremental: false,
    composite: false,
  },
  tsconfigPath,
);

const rootNames = parsedConfig.fileNames.filter(
  (fileName) =>
    !fileName.includes(".test.") &&
    !fileName.includes(".spec.") &&
    !fileName.includes("__tests__"),
);

await rm(resolve(packageRoot, "dist"), {
  recursive: true,
  force: true,
});
await mkdir(resolve(packageRoot, "dist"), {
  recursive: true,
});

const program = ts.createProgram({
  rootNames,
  options: parsedConfig.options,
});

const emitResult = program.emit();
const diagnostics = ts
  .getPreEmitDiagnostics(program)
  .concat(emitResult.diagnostics)
  .filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);

if (diagnostics.length > 0) {
  const host = {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => packageRoot,
    getNewLine: () => "\n",
  };

  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, host));
  process.exitCode = 1;
} else {
  const entries = await readdir(resolve(packageRoot, "dist"));
  console.log(`Built ${packageRoot} -> dist (${entries.length} entries)`);
}
