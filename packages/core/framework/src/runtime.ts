import { loadVimsConfig, type VimsRuntimeConfig } from "@vims/config";
import { createContainer } from "@vims/container";
import { createLogger } from "@vims/logger";

export type VimsProviderCategory = "cache" | "database" | "events" | "search";

export type VimsAppConfig = VimsRuntimeConfig;

export type VimsServiceMap = Record<string, unknown>;

// ── Module key constants (parallel to Medusa's `Modules` enum) ──────────────
export const VimsModules = {
  EVENT_BUS: "eventBus",
  CACHE: "cache",
  WORKFLOW_ENGINE: "workflowEngine",
} as const;

export type VimsModuleKey = (typeof VimsModules)[keyof typeof VimsModules];

// ── Declarative module config (what apps write in modulesConfig) ─────────────
export type VimsModuleDeclaration = {
  /** Package name or local path to resolve */
  resolve?: string;
  options?: Record<string, unknown>;
  scope?: "internal" | "external";
  /** Set to true to disable the module without removing it from config */
  disabled?: boolean;
};

// ── Resolved module (output of registerVimsModule) ──────────────────────────
export type VimsModuleResolution = {
  /** Absolute path after require.resolve(), or false when disabled */
  resolutionPath: string | false;
  definition: VimsModuleDefinition;
  dependencies: string[];
  options: Record<string, unknown>;
  moduleDeclaration: { scope: "internal" | "external" };
};

export type VimsProviderRuntimeContext = {
  config: VimsAppConfig;
};

export type VimsBootHookContext = {
  config: VimsAppConfig;
  providers: Map<string, unknown>;
  modules: Map<string, unknown>;
  plugins: Map<string, unknown>;
  services: VimsServiceMap;
  container: ReturnType<typeof createContainer>;
  logger: ReturnType<typeof createLogger>;
  registerService: (key: string, value: unknown) => void;
  resolveProvider: <T>(key: string) => T;
  resolveModule: <T>(key: string) => T;
  resolvePlugin: <T>(key: string) => T;
};

export type VimsModuleRuntimeContext = {
  config: VimsAppConfig;
  providers: Map<string, unknown>;
  modules: Map<string, unknown>;
  plugins: Map<string, unknown>;
  services: VimsServiceMap;
  registerService: (key: string, value: unknown) => void;
  resolveProvider: <T>(key: string) => T;
  resolveModule: <T>(key: string) => T;
  resolvePlugin: <T>(key: string) => T;
};

export type VimsPluginRuntimeContext = VimsModuleRuntimeContext;

export type VimsLifecycleDefinition = {
  boot?: (context: VimsBootHookContext) => void | Promise<void>;
  prepare?: (context: VimsBootHookContext) => void | Promise<void>;
  start?: (context: VimsBootHookContext) => void | Promise<void>;
  prepareShutdown?: (context: VimsBootHookContext) => void | Promise<void>;
  shutdown?: (context: VimsBootHookContext) => void | Promise<void>;
};

export type VimsProviderDefinition<T = unknown> = {
  key: string;
  label: string;
  category: VimsProviderCategory;
  register: (context: VimsProviderRuntimeContext) => T;
} & VimsLifecycleDefinition;

export type VimsModuleDefinition<T = unknown> = {
  key: string;
  label: string;
  owner: string;
  dependsOn?: string[];
  register: (context: VimsModuleRuntimeContext) => T;
} & VimsLifecycleDefinition;

export type VimsPluginDefinition<
  TRuntime = unknown,
  TExtra extends Record<string, unknown> = Record<string, never>,
> = {
  key: string;
  label: string;
  owner: string;
  dependsOn?: string[];
  register?: (context: VimsPluginRuntimeContext) => TRuntime;
} & VimsLifecycleDefinition & TExtra;

export type AnyVimsPluginDefinition = VimsPluginDefinition<
  unknown,
  Record<string, unknown>
>;

export type VimsFrameworkManifest = {
  modules: VimsModuleDefinition[];
  providers: VimsProviderDefinition[];
  plugins: AnyVimsPluginDefinition[];
};

export type VimsFrameworkCatalog = {
  modules: Record<string, VimsModuleDefinition>;
  providers: Record<string, VimsProviderDefinition>;
  plugins: Record<string, AnyVimsPluginDefinition>;
};

export type VimsFrameworkRuntime = {
  config: VimsAppConfig;
  providers: Map<string, unknown>;
  modules: Map<string, unknown>;
  plugins: Map<string, unknown>;
  services: VimsServiceMap;
  container: ReturnType<typeof createContainer>;
  moduleOrder: string[];
  providerOrder: string[];
  pluginOrder: string[];
  shutdown: () => Promise<void>;
};

export type VimsAsyncFrameworkRuntime = VimsFrameworkRuntime & {
  start: () => Promise<void>;
};

export function defineModule<T>(definition: VimsModuleDefinition<T>) {
  return definition;
}

export function defineProvider<T>(definition: VimsProviderDefinition<T>) {
  return definition;
}

export function definePlugin<
  TRuntime = unknown,
  TExtra extends Record<string, unknown> = Record<string, never>,
>(
  definition: VimsPluginDefinition<TRuntime, TExtra>,
) {
  return definition;
}

export function createFrameworkManifest(
  options: VimsFrameworkManifest,
): VimsFrameworkManifest {
  return options;
}

export function createFrameworkCatalog(
  options: VimsFrameworkManifest,
): VimsFrameworkCatalog {
  return {
    modules: Object.fromEntries(
      options.modules.map((moduleDefinition) => [moduleDefinition.key, moduleDefinition]),
    ),
    providers: Object.fromEntries(
      options.providers.map((providerDefinition) => [
        providerDefinition.key,
        providerDefinition,
      ]),
    ),
    plugins: Object.fromEntries(
      options.plugins.map((pluginDefinition) => [
        pluginDefinition.key,
        pluginDefinition,
      ]),
    ),
  };
}

export function discoverManifest(
  catalog: VimsFrameworkCatalog,
  config: Partial<VimsAppConfig> = {},
) {
  const resolvedConfig = defineAppConfig(config);

  const modules = resolvedConfig.enabledModules?.length
    ? resolvedConfig.enabledModules.map((moduleKey) => {
        const moduleDefinition = catalog.modules[moduleKey];

        if (!moduleDefinition) {
          throw new Error(`Unknown configured module "${moduleKey}"`);
        }

        return moduleDefinition;
      })
    : Object.values(catalog.modules);

  const providers = resolvedConfig.enabledProviders?.length
    ? resolvedConfig.enabledProviders.map((providerKey) => {
        const providerDefinition = catalog.providers[providerKey];

        if (!providerDefinition) {
          throw new Error(`Unknown configured provider "${providerKey}"`);
        }

        return providerDefinition;
      })
    : Object.values(catalog.providers);

  const plugins = resolvedConfig.enabledPlugins?.length
    ? resolvedConfig.enabledPlugins.map((pluginKey) => {
        const pluginDefinition = catalog.plugins[pluginKey];

        if (!pluginDefinition) {
          throw new Error(`Unknown configured plugin "${pluginKey}"`);
        }

        return pluginDefinition;
      })
    : Object.values(catalog.plugins);

  return createFrameworkManifest({
    modules,
    providers,
    plugins,
  });
}

export function defineAppConfig(config: Partial<VimsAppConfig> = {}): VimsAppConfig {
  return loadVimsConfig(config);
}

export function createModuleRegistry() {
  const modules = new Map<string, VimsModuleDefinition>();

  return {
    register(moduleDefinition: VimsModuleDefinition) {
      modules.set(moduleDefinition.key, moduleDefinition);
    },
    list() {
      return [...modules.values()];
    },
  };
}

export function createProviderRegistry() {
  const providers = new Map<string, VimsProviderDefinition>();

  return {
    register(providerDefinition: VimsProviderDefinition) {
      providers.set(providerDefinition.key, providerDefinition);
    },
    list() {
      return [...providers.values()];
    },
  };
}

export function createPluginRegistry() {
  const plugins = new Map<string, AnyVimsPluginDefinition>();

  return {
    register(pluginDefinition: AnyVimsPluginDefinition) {
      plugins.set(pluginDefinition.key, pluginDefinition);
    },
    list() {
      return [...plugins.values()];
    },
  };
}

function filterEnabled<T extends { key: string }>(
  entries: T[],
  enabledKeys?: string[],
) {
  if (!enabledKeys?.length) {
    return entries;
  }

  const enabledSet = new Set(enabledKeys);
  return entries.filter((entry) => enabledSet.has(entry.key));
}

function resolveDependencyOrder<T extends { key: string; dependsOn?: string[] }>(
  entries: T[],
) {
  const moduleMap = new Map(entries.map((module) => [module.key, module]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const ordered: T[] = [];

  function visit(moduleKey: string) {
    if (visited.has(moduleKey)) {
      return;
    }

    if (visiting.has(moduleKey)) {
      throw new Error(`Circular module dependency detected for "${moduleKey}"`);
    }

    const moduleDefinition = moduleMap.get(moduleKey);

    if (!moduleDefinition) {
      throw new Error(`Unknown module dependency "${moduleKey}"`);
    }

    visiting.add(moduleKey);

    for (const dependency of moduleDefinition.dependsOn ?? []) {
      visit(dependency);
    }

    visiting.delete(moduleKey);
    visited.add(moduleKey);
    ordered.push(moduleDefinition);
  }

  for (const moduleDefinition of entries) {
    visit(moduleDefinition.key);
  }

  return ordered;
}

export function bootFramework(
  manifest: VimsFrameworkManifest,
  config: Partial<VimsAppConfig> = {},
): VimsFrameworkRuntime {
  const resolvedConfig = defineAppConfig(config);
  const enabledProviders = filterEnabled(
    manifest.providers,
    resolvedConfig.enabledProviders,
  );
  const enabledModules = filterEnabled(
    manifest.modules,
    resolvedConfig.enabledModules,
  );
  const enabledPlugins = filterEnabled(
    manifest.plugins,
    resolvedConfig.enabledPlugins,
  );
  const providerRuntime = new Map<string, unknown>();
  const moduleRuntime = new Map<string, unknown>();
  const pluginRuntime = new Map<string, unknown>();
  const services: VimsServiceMap = {};
  const container = createContainer();
  const logger = createLogger();
  const resolveProvider = <T,>(key: string) => {
    if (!providerRuntime.has(key)) {
      throw new Error(`Provider "${key}" is not registered`);
    }

    return providerRuntime.get(key) as T;
  };
  const resolveModule = <T,>(key: string) => {
    if (!moduleRuntime.has(key)) {
      throw new Error(`Module "${key}" is not registered`);
    }

    return moduleRuntime.get(key) as T;
  };
  const resolvePlugin = <T,>(key: string) => {
    if (!pluginRuntime.has(key)) {
      throw new Error(`Plugin "${key}" is not registered`);
    }

    return pluginRuntime.get(key) as T;
  };
  const registerService = (key: string, value: unknown) => {
    services[key] = value;
    container.register(`service:${key}`, value);
  };
  container.register("logger", logger);
  container.register("config", resolvedConfig);
  logger.info("framework.boot.start", {
    app: resolvedConfig.name,
  });

  for (const providerDefinition of enabledProviders) {
    const provider = providerDefinition.register({
      config: resolvedConfig,
    });
    providerRuntime.set(providerDefinition.key, provider);
    container.register(`provider:${providerDefinition.key}`, provider);
    logger.info("framework.provider.registered", {
      provider: providerDefinition.key,
    });
  }

  const orderedModules = resolveDependencyOrder(enabledModules);
  const orderedPlugins = resolveDependencyOrder(enabledPlugins);

  const runtimeContext: VimsModuleRuntimeContext = {
    config: resolvedConfig,
    providers: providerRuntime,
    modules: moduleRuntime,
    plugins: pluginRuntime,
    services,
    registerService,
    resolveProvider,
    resolveModule,
    resolvePlugin,
  };

  for (const moduleDefinition of orderedModules) {
    const module = moduleDefinition.register(runtimeContext);
    moduleRuntime.set(moduleDefinition.key, module);
    container.register(`module:${moduleDefinition.key}`, module);
    logger.info("framework.module.registered", {
      module: moduleDefinition.key,
    });
  }

  const pluginContext: VimsPluginRuntimeContext = {
    ...runtimeContext,
  };

  for (const pluginDefinition of orderedPlugins) {
    const plugin =
      pluginDefinition.register?.(pluginContext) ?? {
        key: pluginDefinition.key,
        label: pluginDefinition.label,
      };
    pluginRuntime.set(pluginDefinition.key, plugin);
    container.register(`plugin:${pluginDefinition.key}`, plugin);
    logger.info("framework.plugin.registered", {
      plugin: pluginDefinition.key,
    });
  }

  const bootHookContext: VimsBootHookContext = {
    config: resolvedConfig,
    providers: providerRuntime,
    modules: moduleRuntime,
    plugins: pluginRuntime,
    services,
    container,
    logger,
    registerService,
    resolveProvider,
    resolveModule,
    resolvePlugin,
  };

  const shutdownCallbacks: Array<() => Promise<void>> = [];

  for (const providerDefinition of enabledProviders) {
    if (providerDefinition.boot) {
      void providerDefinition.boot(bootHookContext);
    }

    if (providerDefinition.shutdown) {
      shutdownCallbacks.unshift(() => Promise.resolve(providerDefinition.shutdown?.(bootHookContext)));
    }
  }

  for (const moduleDefinition of orderedModules) {
    if (moduleDefinition.boot) {
      void moduleDefinition.boot(bootHookContext);
    }

    if (moduleDefinition.shutdown) {
      shutdownCallbacks.unshift(() => Promise.resolve(moduleDefinition.shutdown?.(bootHookContext)));
    }
  }

  for (const pluginDefinition of orderedPlugins) {
    if (pluginDefinition.boot) {
      void pluginDefinition.boot(bootHookContext);
    }

    if (pluginDefinition.shutdown) {
      shutdownCallbacks.unshift(() => Promise.resolve(pluginDefinition.shutdown?.(bootHookContext)));
    }
  }

  logger.info("framework.boot.complete", {
    modules: orderedModules.length,
    providers: enabledProviders.length,
    plugins: orderedPlugins.length,
  });

  return {
    config: resolvedConfig,
    providers: providerRuntime,
    modules: moduleRuntime,
    plugins: pluginRuntime,
    services,
    container,
    moduleOrder: orderedModules.map((moduleDefinition) => moduleDefinition.key),
    providerOrder: enabledProviders.map((providerDefinition) => providerDefinition.key),
    pluginOrder: orderedPlugins.map((pluginDefinition) => pluginDefinition.key),
    async shutdown() {
      for (const callback of shutdownCallbacks) {
        await callback();
      }

      logger.info("framework.shutdown.complete", {
        app: resolvedConfig.name,
      });
    },
  };
}

export function createVimsApp(
  manifest: VimsFrameworkManifest,
  config?: Partial<VimsAppConfig>,
) {
  return bootFramework(manifest, config);
}

async function runLifecycleStage(
  definitions: Array<
    VimsProviderDefinition | VimsModuleDefinition | AnyVimsPluginDefinition
  >,
  stage: "prepare" | "start" | "prepareShutdown",
  context: VimsBootHookContext,
) {
  for (const definition of definitions) {
    const handler = definition[stage];

    if (handler) {
      await handler(context);
    }
  }
}

export async function bootFrameworkAsync(
  manifest: VimsFrameworkManifest,
  config: Partial<VimsAppConfig> = {},
): Promise<VimsAsyncFrameworkRuntime> {
  const runtime = bootFramework(manifest, config);
  const logger = runtime.container.resolve<ReturnType<typeof createLogger>>("logger");

  const context: VimsBootHookContext = {
    config: runtime.config,
    providers: runtime.providers,
    modules: runtime.modules,
    plugins: runtime.plugins,
    services: runtime.services,
    container: runtime.container,
    logger,
    registerService(key, value) {
      runtime.services[key] = value;
      runtime.container.register(`service:${key}`, value);
    },
    resolveProvider(key) {
      return runtime.providers.get(key) as never;
    },
    resolveModule(key) {
      return runtime.modules.get(key) as never;
    },
    resolvePlugin(key) {
      return runtime.plugins.get(key) as never;
    },
  };

  const providers = manifest.providers.filter((definition) =>
    runtime.providerOrder.includes(definition.key),
  );
  const modules = manifest.modules.filter((definition) =>
    runtime.moduleOrder.includes(definition.key),
  );
  const plugins = manifest.plugins.filter((definition) =>
    runtime.pluginOrder.includes(definition.key),
  );

  await runLifecycleStage(providers, "prepare", context);
  await runLifecycleStage(modules, "prepare", context);
  await runLifecycleStage(plugins, "prepare", context);

  return {
    ...runtime,
    async start() {
      await runLifecycleStage(providers, "start", context);
      await runLifecycleStage(modules, "start", context);
      await runLifecycleStage(plugins, "start", context);

      logger.info("framework.start.complete", {
        app: runtime.config.name,
      });
    },
    async shutdown() {
      await runLifecycleStage([...plugins].reverse(), "prepareShutdown", context);
      await runLifecycleStage([...modules].reverse(), "prepareShutdown", context);
      await runLifecycleStage([...providers].reverse(), "prepareShutdown", context);
      await runtime.shutdown();
    },
  };
}

export async function createVimsAppAsync(
  manifest: VimsFrameworkManifest,
  config?: Partial<VimsAppConfig>,
) {
  return bootFrameworkAsync(manifest, config);
}
