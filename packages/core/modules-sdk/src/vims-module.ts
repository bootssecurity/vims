import type { VimsModuleDefinition, VimsModuleResolution } from "@vims/framework";
import { registerVimsModule, type RegisterVimsModuleArgs } from "./loaders/index.js";
import { vimsModuleLoader } from "./loaders/module-loader.js";

// ── Types ─────────────────────────────────────────────────────────────────────

type MinimalContainer = {
  register(key: string, value: unknown): void;
  resolve<T = unknown>(key: string, opts?: { allowUnregistered?: boolean }): T;
};

type MinimalLogger = {
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
};

export type VimsModuleBootstrapOptions = Omit<RegisterVimsModuleArgs, "cwd"> & {
  sharedContainer?: MinimalContainer;
  injectedDependencies?: Record<string, unknown>;
  cwd?: string;
};

export type BootstrapAllOpts = {
  cwd?: string;
};

type ModuleAlias = {
  key: string;
  hash: string;
};

// ── Simple deterministic hash ─────────────────────────────────────────────────

function simpleHash(obj: unknown): string {
  const str = JSON.stringify(obj);
  let h = 0;

  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }

  return Math.abs(h).toString(36);
}

// ── VimsModule singleton ───────────────────────────────────────────────────────

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
export class VimsModule {
  // hash → service instance map
  private static instances_: Map<string, Record<string, unknown>> = new Map();
  // moduleKey → [ModuleAlias] for lookup
  private static modules_: Map<string, ModuleAlias[]> = new Map();
  // hash → in-flight bootstrap promise (dedup concurrent loads)
  private static loading_: Map<string, Promise<Record<string, unknown>>> =
    new Map();
  // moduleKey → resolution metadata
  private static resolutions_: Map<string, VimsModuleResolution> = new Map();

  // ── Lifecycle hooks ─────────────────────────────────────────────────────────

  /**
   * Called when the application is fully started.
   * Invokes `onApplicationStart` on all loaded module services that expose it.
   */
  public static onApplicationStart(onStartCb?: () => void): void {
    for (const instances of VimsModule.instances_.values()) {
      for (const instance of Object.values(instances)) {
        const hooks = (instance as any)?.__hooks;

        if (hooks?.onApplicationStart) {
          void Promise.resolve(hooks.onApplicationStart.call(instance)).then(
            () => onStartCb?.()
          );
        }
      }
    }
  }

  /**
   * Graceful shutdown — waits for all `onApplicationShutdown` hooks.
   */
  public static async onApplicationShutdown(): Promise<void> {
    const callbacks = [...VimsModule.instances_.values()].flatMap(
      (instances) =>
        Object.values(instances).flatMap((instance) => {
          const hook = (instance as any)?.__hooks?.onApplicationShutdown;
          return hook ? [() => Promise.resolve(hook.call(instance))] : [];
        })
    );

    await Promise.all(callbacks.map((fn) => fn().catch(() => void 0)));
  }

  /**
   * Prepare-shutdown phase — gives modules a chance to drain in-flight work.
   */
  public static async onApplicationPrepareShutdown(): Promise<void> {
    const callbacks = [...VimsModule.instances_.values()].flatMap(
      (instances) =>
        Object.values(instances).flatMap((instance) => {
          const hook =
            (instance as any)?.__hooks?.onApplicationPrepareShutdown;
          return hook ? [() => Promise.resolve(hook.call(instance))] : [];
        })
    );

    await Promise.all(callbacks.map((fn) => fn().catch(() => void 0)));
  }

  // ── Query ───────────────────────────────────────────────────────────────────

  public static isInstalled(moduleKey: string): boolean {
    return VimsModule.modules_.has(moduleKey);
  }

  public static getModuleResolution(key: string): VimsModuleResolution | undefined {
    return VimsModule.resolutions_.get(key);
  }

  public static getAllModuleResolutions(): VimsModuleResolution[] {
    return [...VimsModule.resolutions_.values()];
  }

  public static getLoadedModules(): Record<string, unknown>[] {
    return [...VimsModule.instances_.values()];
  }

  public static clearInstances(): void {
    VimsModule.instances_.clear();
    VimsModule.modules_.clear();
    VimsModule.loading_.clear();
    VimsModule.resolutions_.clear();
  }

  // ── Bootstrap ───────────────────────────────────────────────────────────────

  /**
   * Bootstrap a **single** module. Returns the loaded service map.
   */
  public static async bootstrap(
    options: VimsModuleBootstrapOptions
  ): Promise<Record<string, unknown>> {
    const [service] = await VimsModule.bootstrap_([options], {
      cwd: options.cwd,
    });
    return service;
  }

  /**
   * Bootstrap **multiple** modules in parallel.
   */
  public static async bootstrapAll(
    modulesOptions: VimsModuleBootstrapOptions[],
    opts: BootstrapAllOpts = {}
  ): Promise<Record<string, unknown>[]> {
    return VimsModule.bootstrap_(modulesOptions, opts);
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  private static async bootstrap_(
    modulesOptions: VimsModuleBootstrapOptions[],
    { cwd = process.cwd() }: BootstrapAllOpts
  ): Promise<Record<string, unknown>[]> {
    const services: Record<string, unknown>[] = [];

    // Resolve declarations → VimsModuleResolution first (sync)
    const queue: Array<{
      hashKey: string;
      moduleKey: string;
      resolution: VimsModuleResolution;
      sharedContainer: MinimalContainer;
      finishLoading: (v: Record<string, unknown>) => void;
      errorLoading: (e: unknown) => void;
    }> = [];

    for (const opts of modulesOptions) {
      const { moduleKey, moduleDeclaration, definition, sharedContainer, injectedDependencies } = opts;

      // Build a minimal in-memory container if none provided
      const container = sharedContainer ?? VimsModule.makeContainer(injectedDependencies);

      const moduleResolutions = registerVimsModule({
        moduleKey,
        moduleDeclaration,
        definition,
        cwd,
      });

      const resolution = moduleResolutions[moduleKey];
      if (!resolution) continue;

      const hashKey = simpleHash({ moduleKey, resolve: resolution.resolutionPath, options: resolution.options });

      // Already loaded → reuse
      if (VimsModule.instances_.has(hashKey)) {
        services.push(VimsModule.instances_.get(hashKey)!);
        continue;
      }

      // In-flight → wait for it
      if (VimsModule.loading_.has(hashKey)) {
        services.push(await VimsModule.loading_.get(hashKey)!);
        continue;
      }

      let finishLoading!: (v: Record<string, unknown>) => void;
      let errorLoading!: (e: unknown) => void;

      const loadingPromise = new Promise<Record<string, unknown>>((resolve, reject) => {
        finishLoading = resolve;
        errorLoading = reject;
      });

      VimsModule.loading_.set(hashKey, loadingPromise);

      queue.push({ hashKey, moduleKey, resolution, sharedContainer: container, finishLoading, errorLoading });
    }

    // Load all queued modules in parallel via the module-loader
    await Promise.all(
      queue.map(async ({ hashKey, moduleKey, resolution, sharedContainer, finishLoading, errorLoading }) => {
        try {
          await vimsModuleLoader({
            container: sharedContainer,
            moduleResolutions: { [moduleKey]: resolution },
          });

          // Pull the loaded service from the container
          const service = sharedContainer.resolve<unknown>(`module:${moduleKey}`, { allowUnregistered: true });
          const serviceMap: Record<string, unknown> = { [moduleKey]: service };

          VimsModule.instances_.set(hashKey, serviceMap);
          VimsModule.resolutions_.set(moduleKey, resolution);
          VimsModule.registerModuleAlias_(moduleKey, hashKey);

          finishLoading(serviceMap);
          VimsModule.loading_.delete(hashKey);

          services.push(serviceMap);
        } catch (err) {
          errorLoading(err);
          VimsModule.loading_.delete(hashKey);
          throw err;
        }
      })
    );

    return services;
  }

  private static registerModuleAlias_(moduleKey: string, hash: string): void {
    if (!VimsModule.modules_.has(moduleKey)) {
      VimsModule.modules_.set(moduleKey, []);
    }

    VimsModule.modules_.get(moduleKey)!.push({ key: moduleKey, hash });
  }

  /**
   * Creates a minimal in-memory container for standalone module bootstrapping
   * (no shared container needed for simple single-module tests).
   */
  private static makeContainer(
    injected?: Record<string, unknown>
  ): MinimalContainer {
    const registry = new Map<string, unknown>(Object.entries(injected ?? {}));

    return {
      register(key, value) {
        registry.set(key, value);
      },
      resolve<T>(key: string, opts?: { allowUnregistered?: boolean }): T {
        if (!registry.has(key)) {
          if (opts?.allowUnregistered) return undefined as T;
          throw new Error(`VimsModule container: "${key}" is not registered.`);
        }

        return registry.get(key) as T;
      },
    };
  }
}
