import { createVimsApp, createVimsAppAsync, } from "@vims/framework";
import { loadVimsConfig } from "@vims/config";
import { VimsModule } from "@vims/modules-sdk";
import { discoverWorkspaceManifest } from "../generated/workspace-catalog";
export function loadVimsAppSnapshot(overrides = {}) {
    const config = loadVimsConfig(overrides);
    return createVimsApp(discoverWorkspaceManifest(config), config);
}
export async function loadVimsApp(overrides = {}) {
    const config = loadVimsConfig(overrides);
    const app = await createVimsAppAsync(discoverWorkspaceManifest(config), config);
    await app.start();
    return app;
}
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
export async function loadVimsAppModules(modulesConfig, opts = {}) {
    const modulesOptions = Object.entries(modulesConfig)
        .filter(([, declaration]) => declaration !== undefined)
        .map(([moduleKey, declaration]) => ({
        moduleKey,
        moduleDeclaration: declaration,
        cwd: opts.cwd,
    }));
    const loaded = await VimsModule.bootstrapAll(modulesOptions, {
        cwd: opts.cwd,
    });
    // Flatten array of { [moduleKey]: service } maps into one
    const allModules = {};
    for (const serviceMap of loaded) {
        Object.assign(allModules, serviceMap);
    }
    return allModules;
}
export { initializeVimsApp } from "./app";
export { LinkLoader } from "./link-loader";
export { ApiLoader } from "./api-loader";
export { VimsMiddlewarePipeline, requestLogger, attachState, guard, requireAuth, } from "./middleware-pipeline";
