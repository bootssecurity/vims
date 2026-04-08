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
 * Wires a single resolved module into the shared container.
 * Mirrors Medusa's `loadInternalModule()` in @medusajs/modules-sdk.
 *
 * Design:
 *  - Creates a scoped `localContainer` so the module can resolve its peer
 *    dependencies (declared in `resolution.dependencies`) without polluting the
 *    shared container registry directly.
 *  - Calls the module definition's `register()` function to obtain the service
 *    instance (or object), then registers that under the module's key.
 *  - Intentionally does NOT do file-system auto-discovery (models/services/repos)
 *    — that will be added in a future phase when ORM support arrives.
 */
export declare function loadVimsInternalModule({ container, resolution, logger, }: LoadInternalArgs): Promise<{
    error?: Error;
} | void>;
export {};
