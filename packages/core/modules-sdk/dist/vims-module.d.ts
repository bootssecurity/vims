import type { VimsModuleResolution } from "@vims/framework";
import { type RegisterVimsModuleArgs } from "./loaders";
type MinimalContainer = {
    register(key: string, value: unknown): void;
    resolve<T = unknown>(key: string, opts?: {
        allowUnregistered?: boolean;
    }): T;
};
export type VimsModuleBootstrapOptions = Omit<RegisterVimsModuleArgs, "cwd"> & {
    sharedContainer?: MinimalContainer;
    injectedDependencies?: Record<string, unknown>;
    cwd?: string;
};
export type BootstrapAllOpts = {
    cwd?: string;
};
/**
 * Singleton bootstrapper for VIMS modules.
 *
 * Responsibilities:
 *  - Resolve module declarations → VimsModuleResolution via registerVimsModule()
 *  - Deduplicate concurrent bootstrap attempts for the same module (via hash)
 *  - Store loaded service instances indexed by hash key
 *  - Expose lifecycle hook dispatch (onApplicationStart / Shutdown)
 *  - Track module resolutions so callers can query what's loaded
 */
export declare class VimsModule {
    private static instances_;
    private static modules_;
    private static loading_;
    private static resolutions_;
    /**
     * Called when the application is fully started.
     * Invokes `onApplicationStart` on all loaded module services that expose it.
     */
    static onApplicationStart(onStartCb?: () => void): void;
    /**
     * Graceful shutdown — waits for all `onApplicationShutdown` hooks.
     */
    static onApplicationShutdown(): Promise<void>;
    /**
     * Prepare-shutdown phase — gives modules a chance to drain in-flight work.
     */
    static onApplicationPrepareShutdown(): Promise<void>;
    static isInstalled(moduleKey: string): boolean;
    static getModuleResolution(key: string): VimsModuleResolution | undefined;
    static getAllModuleResolutions(): VimsModuleResolution[];
    static getLoadedModules(): Record<string, unknown>[];
    static clearInstances(): void;
    /**
     * Bootstrap a **single** module. Returns the loaded service map.
     */
    static bootstrap(options: VimsModuleBootstrapOptions): Promise<Record<string, unknown>>;
    /**
     * Bootstrap **multiple** modules in parallel.
     */
    static bootstrapAll(modulesOptions: VimsModuleBootstrapOptions[], opts?: BootstrapAllOpts): Promise<Record<string, unknown>[]>;
    private static bootstrap_;
    private static registerModuleAlias_;
    /**
     * Creates a minimal in-memory container for standalone module bootstrapping
     * (no shared container needed for simple single-module tests).
     */
    private static makeContainer;
}
export {};
