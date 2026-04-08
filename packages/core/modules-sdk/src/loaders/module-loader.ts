import type { VimsModuleResolution } from "@vims/framework";
import { loadVimsInternalModule } from "./utils/index.js";

export type VimsModuleLoaderArgs = {
  /**
   * The shared DI container. Each module receives a scoped view of this
   * container so it can resolve peer dependencies that were loaded before it.
   */
  container: {
    register(key: string, value: unknown): void;
    resolve<T = unknown>(key: string, opts?: { allowUnregistered?: boolean }): T;
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
 *
 * - Skips disabled resolutions (resolutionPath === false)
 * - Dispatches each resolution to `loadVimsInternalModule`
 * - Collects errors and throws after all modules have been attempted
 */
export async function vimsModuleLoader({
  container,
  moduleResolutions,
  logger,
}: VimsModuleLoaderArgs): Promise<void> {
  const resolutions = Object.values(moduleResolutions ?? {});
  const errors: Array<{ label: string; error: Error }> = [];

  await Promise.all(
    resolutions.map(async (resolution) => {
      if (resolution.resolutionPath === false) {
        // Module is disabled — register undefined so container consumers can
        // detect it gracefully with allowUnregistered.
        container.register(resolution.definition.key, undefined);
        return;
      }

      const result = await loadVimsInternalModule({ container, resolution, logger });

      if (result?.error) {
        errors.push({
          label: resolution.definition.label,
          error: result.error,
        });
      }
    })
  );

  if (errors.length) {
    const messages = errors
      .map(({ label, error }) => `  • ${label}: ${error.message}`)
      .join("\n");

    throw new Error(
      `One or more modules failed to load:\n${messages}`
    );
  }
}
