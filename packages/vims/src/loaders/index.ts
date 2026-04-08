import {
  createVimsApp,
  createVimsAppAsync,
  type VimsAppConfig,
  type VimsModuleDeclaration,
} from "@vims/framework";
import { loadVimsConfig } from "@vims/config";
import { VimsModule } from "@vims/modules-sdk";
import { discoverWorkspaceManifest } from "../generated/workspace-catalog.js";

/**
 * Declarative module config — what apps pass to `loadVimsAppModules()`.
 * Maps a module key to its declaration (resolve path + options) or false to disable.
 */
export type VimsModuleConfig = Record<
  string,
  VimsModuleDeclaration | string | false | undefined
>;

export function loadVimsAppSnapshot(overrides: Partial<VimsAppConfig> = {}) {
  const config = loadVimsConfig(overrides);
  return createVimsApp(discoverWorkspaceManifest(config), config);
}

export async function loadVimsApp(overrides: Partial<VimsAppConfig> = {}) {
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
export async function loadVimsAppModules(
  modulesConfig: VimsModuleConfig,
  opts: { cwd?: string } = {}
): Promise<Record<string, unknown>> {
  const modulesOptions = Object.entries(modulesConfig)
    .filter(([, declaration]) => declaration !== undefined)
    .map(([moduleKey, declaration]) => ({
      moduleKey,
      moduleDeclaration:
        declaration as VimsModuleDeclaration | string | false,
      cwd: opts.cwd,
    }));

  const loaded = await VimsModule.bootstrapAll(modulesOptions, {
    cwd: opts.cwd,
  });

  // Flatten array of { [moduleKey]: service } maps into one
  const allModules: Record<string, unknown> = {};

  for (const serviceMap of loaded) {
    Object.assign(allModules, serviceMap);
  }

  return allModules;
}

export { initializeVimsApp } from "./app.js";
export type { VimsAppInitOptions, VimsAppOutput } from "./app.js";
export { LinkLoader } from "./link-loader.js";
export { ApiLoader } from "./api-loader.js";
export type {
  LoadedVimsRoute,
  VimsRouteHandler,
  VimsMiddlewareHandler,
  VimsRequest,
  VimsResponse,
  VimsRouter,
  HttpMethod,
} from "./api-loader.js";
export {
  VimsMiddlewarePipeline,
  requestLogger,
  attachState,
  guard,
} from "./middleware-pipeline.js";
export type {
  PipelineContext,
  PipelineMiddleware,
  MiddlewareBuilderFn,
} from "./middleware-pipeline.js";
