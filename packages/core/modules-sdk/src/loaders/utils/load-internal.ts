import { readdir, stat } from "fs/promises";
import { join, extname, dirname } from "path";
import type { VimsModuleResolution, VimsModuleRuntimeContext } from "@vims/framework";

type MinimalContainer = {
  register(key: string, value: unknown): void;
  resolve<T = unknown>(key: string, opts?: { allowUnregistered?: boolean }): T;
};

type MinimalLogger = {
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
};

export type LoadInternalArgs = {
  container: MinimalContainer;
  resolution: VimsModuleResolution;
  logger?: MinimalLogger;
};

// ── ORM Auto-discovery ────────────────────────────────────────────────────────

/**
 * DrizzleSchemaEntry
 *
 * A schema table exported from a module's `src/db/schema.ts`.
 * Vims modules use Drizzle ORM — each schema file exports named
 * `pgTable` instances.
 */
export type DrizzleSchemaEntry = {
  name: string;  // table name in DB
  [key: string]: unknown;
};

export type DiscoveredSchema = {
  moduleKey: string;
  schemaPath: string;
  tables: Record<string, DrizzleSchemaEntry>;
};

/**
 * Attempt to auto-discover and load the Drizzle schema for a module.
 *
 * Convention:
 *   - The module's `resolutionPath` is the entry file (e.g. `src/index.ts`)
 *   - We look for `src/db/schema.ts` relative to that entry's parent directory
 *   - If found, we dynamic-import it and return the named exports as tables
 *
 */
async function discoverSchema(
  resolution: VimsModuleResolution,
  logger?: MinimalLogger
): Promise<DiscoveredSchema | null> {
  if (!resolution.resolutionPath || typeof resolution.resolutionPath !== "string") return null;

  // Entry: e.g. /path/to/packages/modules/crm/dist/index.js
  // Schema:     /path/to/packages/modules/crm/dist/db/schema.js
  // (or src/db/schema.ts when running in dev mode)
  const entryDir = dirname(resolution.resolutionPath as string);
  const candidatePaths = [
    join(entryDir, "db", "schema.js"),
    join(entryDir, "db", "schema.mjs"),
    join(entryDir, "db", "schema.ts"),
  ];

  for (const schemaPath of candidatePaths) {
    try {
      const fileStat = await stat(schemaPath);
      if (!fileStat.isFile()) continue;

      const mod = await import(schemaPath);
      const tables: Record<string, DrizzleSchemaEntry> = {};

      for (const [exportName, value] of Object.entries(mod)) {
        // Drizzle tables have a `Symbol.for("drizzle:Name")` or a `.name` property
        if (value && typeof value === "object" && !Array.isArray(value)) {
          tables[exportName] = value as DrizzleSchemaEntry;
        }
      }

      logger?.info("module.schema.discovered", {
        module: resolution.definition.key,
        path: schemaPath,
        tables: Object.keys(tables),
      });

      return {
        moduleKey: resolution.definition.key,
        schemaPath,
        tables,
      };
    } catch {
      // path doesn't exist or import failed — try next candidate
    }
  }

  return null;
}

/**
 * Attempt to auto-discover migration files for a module.
 *
 * Convention: `src/db/migrations/` or `dist/db/migrations/` relative to module entry.
 */
async function discoverMigrations(
  resolution: VimsModuleResolution,
  logger?: MinimalLogger
): Promise<string[]> {
  if (!resolution.resolutionPath || typeof resolution.resolutionPath !== "string") return [];

  const entryDir = dirname(resolution.resolutionPath as string);
  const migrationDirs = [
    join(entryDir, "db", "migrations"),
  ];

  for (const dir of migrationDirs) {
    try {
      const entries = await readdir(dir);
      const migrations = entries
        .filter((f) => [".ts", ".js", ".sql"].includes(extname(f)))
        .filter((f) => !f.endsWith(".d.ts"))
        .map((f) => join(dir, f))
        .sort(); // chronological order by filename convention

      if (migrations.length > 0) {
        logger?.info("module.migrations.discovered", {
          module: resolution.definition.key,
          dir,
          count: migrations.length,
        });
        return migrations;
      }
    } catch {
      // dir doesn't exist
    }
  }

  return [];
}

// ── loadVimsInternalModule ─────────────────────────────────────────────────────

/**
 * Wires a single resolved module into the shared container.
 *
 * Steps:
 *  1. Build a scoped `localContainer` (peer-dep resolution proxy)
 *  2. Validate declared dependencies are present
 *  3. Run ORM auto-discovery (schema + migrations) — non-blocking
 *  4. Call module's `register()` to obtain the service instance
 *  5. Register service under the module's canonical key
 *  6. Register discovered schema under `schema:<key>` for query layers
 */
export async function loadVimsInternalModule({
  container,
  resolution,
  logger,
}: LoadInternalArgs): Promise<{ error?: Error; schema?: DiscoveredSchema } | void> {
  const { definition, dependencies, options, moduleDeclaration } = resolution;
  const keyName = definition.key;

  // 1. Build scoped localContainer
  const localRegistry: Record<string, unknown> = {};

  const localContainer: VimsModuleRuntimeContext = {
    config: container.resolve<any>("config", { allowUnregistered: true }) ?? {},
    providers: new Map(),
    modules: new Map(),
    plugins: new Map(),
    services: {},
    registerService(k, v) {
      localRegistry[k] = v;
      container.register(`service:${k}`, v);
    },
    resolveProvider<T>(k: string) {
      return container.resolve<T>(`provider:${k}`, { allowUnregistered: true });
    },
    resolveModule<T>(k: string) {
      return container.resolve<T>(`module:${k}`, { allowUnregistered: true });
    },
    resolvePlugin<T>(k: string) {
      return container.resolve<T>(`plugin:${k}`, { allowUnregistered: true });
    },
  };

  // 2. Validate dependencies
  for (const dep of dependencies) {
    const resolved = container.resolve(dep, { allowUnregistered: true });
    if (resolved === undefined || resolved === null) {
      logger?.warn(
        `Module "${keyName}" declares dependency "${dep}" which is not yet loaded.`,
        { module: keyName, dependency: dep }
      );
    }
  }

  // 3. ORM auto-discovery (non-blocking — schema absence is not an error)
  const [schema, migrations] = await Promise.all([
    discoverSchema(resolution, logger),
    discoverMigrations(resolution, logger),
  ]);

  // Register schema in the container so query layers can access it
  if (schema) {
    container.register(`schema:${keyName}`, schema);
  }
  if (migrations.length > 0) {
    container.register(`migrations:${keyName}`, migrations);
  }

  // 4 & 5. Register the service
  try {
    const service = await Promise.resolve(definition.register(localContainer));
    container.register(`module:${keyName}`, service ?? {});
    logger?.info(`module.loaded`, { module: keyName, hasSchema: !!schema });
    return schema ? { schema } : undefined;
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger?.error(`module.load.failed`, { module: keyName, error: error.message });
    container.register(`module:${keyName}`, undefined);
    return { error };
  }
}
