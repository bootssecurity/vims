import type { VimsModuleResolution } from "@vims/framework";
export type VimsModuleLoaderArgs = {
    /**
     * The shared DI container. Each module receives a scoped view of this
     * container so it can resolve peer dependencies that were loaded before it.
     */
    container: {
        register(key: string, value: unknown): void;
        resolve<T = unknown>(key: string, opts?: {
            allowUnregistered?: boolean;
        }): T;
    };
    moduleResolutions: Record<string, VimsModuleResolution>;
    logger?: {
        info(msg: string, meta?: Record<string, unknown>): void;
        warn(msg: string, meta?: Record<string, unknown>): void;
        error(msg: string, meta?: Record<string, unknown>): void;
    };
};
/**
 * Orchestrates loading of all resolved modules into the shared container.
 * Mirrors Medusa's `moduleLoader()` in @medusajs/modules-sdk.
 *
 * - Skips disabled resolutions (resolutionPath === false)
 * - Dispatches each resolution to `loadVimsInternalModule`
 * - Collects errors and throws after all modules have been attempted
 */
export declare function vimsModuleLoader({ container, moduleResolutions, logger, }: VimsModuleLoaderArgs): Promise<void>;
