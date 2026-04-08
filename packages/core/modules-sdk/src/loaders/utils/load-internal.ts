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
export async function loadVimsInternalModule({
  container,
  resolution,
  logger,
}: LoadInternalArgs): Promise<{ error?: Error } | void> {
  const { definition, dependencies, options, moduleDeclaration } = resolution;
  const keyName = definition.key;

  // Build a scoped localContainer that proxies peer dependency resolves back to
  // the shared container — the same pattern Medusa uses with awilix.
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

  // Validate declared dependencies are present in the container
  for (const dep of dependencies) {
    const resolved = container.resolve(dep, { allowUnregistered: true });

    if (resolved === undefined || resolved === null) {
      logger?.warn(
        `Module "${keyName}" declares a dependency on "${dep}" which is not yet loaded.`,
        { module: keyName, dependency: dep }
      );
    }
  }

  try {
    // Invoke the module's register() function to obtain the service
    const service = await Promise.resolve(definition.register(localContainer));

    // Register the returned service value under the module's canonical key
    container.register(`module:${keyName}`, service ?? {});

    logger?.info(`module.loaded`, { module: keyName });

    return undefined; // success
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));

    logger?.error(`module.load.failed`, {
      module: keyName,
      error: error.message,
    });

    // Register undefined so downstream optional resolves don't throw
    container.register(`module:${keyName}`, undefined);

    return { error };
  }
}
