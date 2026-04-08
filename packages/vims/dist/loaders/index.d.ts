import { type VimsAppConfig, type VimsModuleDeclaration } from "@vims/framework";
/**
 * Declarative module config — what apps pass to `loadVimsAppModules()`.
 * Maps a module key to its declaration (resolve path + options) or false to disable.
 * Mirrors Medusa's `MedusaModuleConfig`.
 */
export type VimsModuleConfig = Record<string, VimsModuleDeclaration | string | false | undefined>;
export declare function loadVimsAppSnapshot(overrides?: Partial<VimsAppConfig>): import("@vims/framework").VimsFrameworkRuntime;
export declare function loadVimsApp(overrides?: Partial<VimsAppConfig>): Promise<import("@vims/framework").VimsAsyncFrameworkRuntime>;
/**
 * Bootstraps modules from a declarative config map.
 * Mirrors Medusa's `loadModules()` in @medusajs/modules-sdk.
 *
 * Usage:
 * ```ts
 * const modules = await loadVimsAppModules({
 *   eventBus: { resolve: "@vims/event-bus" },
 *   cache: false, // disabled
 * });
 * ```
 */
export declare function loadVimsAppModules(modulesConfig: VimsModuleConfig, opts?: {
    cwd?: string;
}): Promise<Record<string, unknown>>;
