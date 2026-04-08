import type { VimsModuleResolution } from "@vims/framework";
type MinimalContainer = {
    register(key: string, value: unknown): void;
    resolve<T = unknown>(key: string, opts?: {
        allowUnregistered?: boolean;
    }): T;
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
/**
 * DrizzleSchemaEntry
 *
 * A schema table exported from a module's `src/db/schema.ts`.
 * Vims modules use Drizzle ORM — each schema file exports named
 * `pgTable` instances.
 */
export type DrizzleSchemaEntry = {
    name: string;
    [key: string]: unknown;
};
export type DiscoveredSchema = {
    moduleKey: string;
    schemaPath: string;
    tables: Record<string, DrizzleSchemaEntry>;
};
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
export declare function loadVimsInternalModule({ container, resolution, logger, }: LoadInternalArgs): Promise<{
    error?: Error;
    schema?: DiscoveredSchema;
} | void>;
export {};
