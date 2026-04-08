import type {
  VimsModuleDefinition,
  VimsModuleDeclaration,
  VimsModuleResolution,
} from "@vims/framework";
import { VimsModulesDefinition } from "../definitions";

export type RegisterVimsModuleArgs = {
  moduleKey: string;
  moduleDeclaration?: VimsModuleDeclaration | string | false;
  definition?: VimsModuleDefinition & {
    isRequired?: boolean;
    defaultPackage?: string | false;
    defaultModuleDeclaration?: { scope: "internal" | "external" };
  };
  cwd?: string;
};

/**
 * Resolves a module key + declaration into a `VimsModuleResolution`.
 *
 * Priority:
 *  1. If `moduleDeclaration === false` → disabled, returns { resolutionPath: false }
 *  2. Looks up built-in definition from `VimsModulesDefinition`
 *  3. Falls back to custom user-supplied `definition`
 *  4. Resolves the path via require.resolve() when a `resolve` string is given
 */
export function registerVimsModule({
  moduleKey,
  moduleDeclaration,
  definition,
  cwd = process.cwd(),
}: RegisterVimsModuleArgs): Record<string, VimsModuleResolution> {
  const resolutions: Record<string, VimsModuleResolution> = {};

  // Explicit false → disabled module
  if (moduleDeclaration === false) {
    const modDef =
      definition ??
      (VimsModulesDefinition[moduleKey] as VimsModuleDefinition | undefined);

    if (!modDef) {
      throw new Error(
        `Module "${moduleKey}" has no definition — cannot disable an unknown module.`
      );
    }

    resolutions[moduleKey] = {
      resolutionPath: false,
      definition: modDef,
      dependencies: (modDef as any).dependsOn ?? [],
      options: {},
      moduleDeclaration: { scope: "internal" },
    };

    return resolutions;
  }

  const builtinDef = VimsModulesDefinition[moduleKey];
  const modDef = definition ?? builtinDef;

  if (!modDef) {
    throw new Error(
      `Module "${moduleKey}" is not a known built-in module and no definition was supplied. ` +
      `Pass a "definition" option or use a key from VimsModules.`
    );
  }

  // Normalise the declaration
  const isString = typeof moduleDeclaration === "string";
  const isObject =
    moduleDeclaration !== null &&
    typeof moduleDeclaration === "object" &&
    !Array.isArray(moduleDeclaration);

  const declaration: VimsModuleDeclaration = isObject
    ? (moduleDeclaration as VimsModuleDeclaration)
    : {};

  const resolveStr: string | undefined = isString
    ? (moduleDeclaration as string)
    : declaration.resolve;

  const defaultDecl = (modDef as any).defaultModuleDeclaration ?? {
    scope: "internal",
  };
  const scope: "internal" | "external" =
    declaration.scope ?? defaultDecl.scope ?? "internal";

  // Path resolution
  let resolutionPath: string | false;

  if (resolveStr) {
    try {
      resolutionPath = require.resolve(resolveStr, { paths: [cwd] });
    } catch {
      // Store original string so caller can surface a friendlier error
      resolutionPath = resolveStr;
    }
  } else {
    const defaultPkg = (modDef as any).defaultPackage;

    if (defaultPkg) {
      try {
        resolutionPath = require.resolve(defaultPkg, { paths: [cwd] });
      } catch {
        // Not installed yet — store name for deferred resolution
        resolutionPath = defaultPkg;
      }
    } else {
      resolutionPath = false;
    }
  }

  resolutions[moduleKey] = {
    resolutionPath,
    definition: modDef as VimsModuleDefinition,
    dependencies: (modDef as any).dependsOn ?? [],
    options: declaration.options ?? {},
    moduleDeclaration: { scope },
  };

  return resolutions;
}

/**
 * Convenience: register multiple modules at once.
 * Returns a flat map of { moduleKey → VimsModuleResolution }.
 */
export function registerVimsModules(
  modules: Record<string, VimsModuleDeclaration | string | false | undefined>
): Record<string, VimsModuleResolution> {
  const all: Record<string, VimsModuleResolution> = {};

  for (const [moduleKey, declaration] of Object.entries(modules)) {
    if (declaration === undefined) continue;
    Object.assign(
      all,
      registerVimsModule({ moduleKey, moduleDeclaration: declaration })
    );
  }

  return all;
}

/** Re-export the registration type for consumers */
export type { VimsModuleResolution };
