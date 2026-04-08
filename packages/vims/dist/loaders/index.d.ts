import { type VimsAppConfig, type VimsModuleDeclaration } from "@vims/framework";
/**
 * Declarative module config — what apps pass to `loadVimsAppModules()`.
 * Maps a module key to its declaration (resolve path + options) or false to disable.
 */
export type VimsModuleConfig = Record<string, VimsModuleDeclaration | string | false | undefined>;
export declare function loadVimsAppSnapshot(overrides?: Partial<VimsAppConfig>): import("@vims/framework").VimsFrameworkRuntime;
export declare function loadVimsApp(overrides?: Partial<VimsAppConfig>): Promise<import("@vims/framework").VimsAsyncFrameworkRuntime>;
/**
 * Bootstraps modules from a declarative config map.
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
export { initializeVimsApp } from "./app.js";
export type { VimsAppInitOptions, VimsAppOutput } from "./app.js";
export { LinkLoader } from "./link-loader.js";
export { ApiLoader } from "./api-loader.js";
export type { LoadedVimsRoute, VimsRouteHandler, VimsMiddlewareHandler, VimsRequest, VimsResponse, VimsRouter, HttpMethod, } from "./api-loader.js";
export { VimsMiddlewarePipeline, requestLogger, attachState, guard, } from "./middleware-pipeline.js";
export type { PipelineContext, PipelineMiddleware, MiddlewareBuilderFn, } from "./middleware-pipeline.js";
