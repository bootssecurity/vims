import { readdir, stat } from "fs/promises";
import { join, extname, dirname } from "path";
/**
 * Attempt to auto-discover and load the Drizzle schema for a module.
 *
 * Convention:
 *   - The module's `resolutionPath` is the entry file (e.g. `src/index.ts`)
 *   - We look for `src/db/schema.ts` relative to that entry's parent directory
 *   - If found, we dynamic-import it and return the named exports as tables
 *
 */
async function discoverSchema(resolution, logger) {
    if (!resolution.resolutionPath || typeof resolution.resolutionPath !== "string")
        return null;
    // Entry: e.g. /path/to/packages/modules/crm/dist/index.js
    // Schema:     /path/to/packages/modules/crm/dist/db/schema.js
    // (or src/db/schema.ts when running in dev mode)
    const entryDir = dirname(resolution.resolutionPath);
    const candidatePaths = [
        join(entryDir, "db", "schema.js"),
        join(entryDir, "db", "schema.mjs"),
        join(entryDir, "db", "schema.ts"),
    ];
    for (const schemaPath of candidatePaths) {
        try {
            const fileStat = await stat(schemaPath);
            if (!fileStat.isFile())
                continue;
            const mod = await import(schemaPath);
            const tables = {};
            for (const [exportName, value] of Object.entries(mod)) {
                // Drizzle tables have a `Symbol.for("drizzle:Name")` or a `.name` property
                if (value && typeof value === "object" && !Array.isArray(value)) {
                    tables[exportName] = value;
                }
            }
            logger === null || logger === void 0 ? void 0 : logger.info("module.schema.discovered", {
                module: resolution.definition.key,
                path: schemaPath,
                tables: Object.keys(tables),
            });
            return {
                moduleKey: resolution.definition.key,
                schemaPath,
                tables,
            };
        }
        catch (_a) {
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
async function discoverMigrations(resolution, logger) {
    if (!resolution.resolutionPath || typeof resolution.resolutionPath !== "string")
        return [];
    const entryDir = dirname(resolution.resolutionPath);
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
                logger === null || logger === void 0 ? void 0 : logger.info("module.migrations.discovered", {
                    module: resolution.definition.key,
                    dir,
                    count: migrations.length,
                });
                return migrations;
            }
        }
        catch (_a) {
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
export async function loadVimsInternalModule({ container, resolution, logger, }) {
    var _a;
    const { definition, dependencies, options, moduleDeclaration } = resolution;
    const keyName = definition.key;
    // 1. Build scoped localContainer
    const localRegistry = {};
    const localContainer = {
        config: (_a = container.resolve("config", { allowUnregistered: true })) !== null && _a !== void 0 ? _a : {},
        providers: new Map(),
        modules: new Map(),
        plugins: new Map(),
        services: {},
        registerService(k, v) {
            localRegistry[k] = v;
            container.register(`service:${k}`, v);
        },
        resolveProvider(k) {
            return container.resolve(`provider:${k}`, { allowUnregistered: true });
        },
        resolveModule(k) {
            return container.resolve(`module:${k}`, { allowUnregistered: true });
        },
        resolvePlugin(k) {
            return container.resolve(`plugin:${k}`, { allowUnregistered: true });
        },
    };
    // 2. Validate dependencies
    for (const dep of dependencies) {
        const resolved = container.resolve(dep, { allowUnregistered: true });
        if (resolved === undefined || resolved === null) {
            logger === null || logger === void 0 ? void 0 : logger.warn(`Module "${keyName}" declares dependency "${dep}" which is not yet loaded.`, { module: keyName, dependency: dep });
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
        container.register(`module:${keyName}`, service !== null && service !== void 0 ? service : {});
        logger === null || logger === void 0 ? void 0 : logger.info(`module.loaded`, { module: keyName, hasSchema: !!schema });
        return schema ? { schema } : undefined;
    }
    catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger === null || logger === void 0 ? void 0 : logger.error(`module.load.failed`, { module: keyName, error: error.message });
        container.register(`module:${keyName}`, undefined);
        return { error };
    }
}
