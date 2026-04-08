import type { VimsModuleDefinition, VimsModuleDeclaration, VimsModuleResolution } from "@vims/framework";
export type RegisterVimsModuleArgs = {
    moduleKey: string;
    moduleDeclaration?: VimsModuleDeclaration | string | false;
    definition?: VimsModuleDefinition & {
        isRequired?: boolean;
        defaultPackage?: string | false;
        defaultModuleDeclaration?: {
            scope: "internal" | "external";
        };
    };
    cwd?: string;
};
/**
 * Resolves a module key + declaration into a `VimsModuleResolution`.
 * Mirrors Medusa's `registerMedusaModule()` in @medusajs/modules-sdk.
 *
 * Priority:
 *  1. If `moduleDeclaration === false` → disabled, returns { resolutionPath: false }
 *  2. Looks up built-in definition from `VimsModulesDefinition`
 *  3. Falls back to custom user-supplied `definition`
 *  4. Resolves the path via require.resolve() when a `resolve` string is given
 */
export declare function registerVimsModule({ moduleKey, moduleDeclaration, definition, cwd, }: RegisterVimsModuleArgs): Record<string, VimsModuleResolution>;
/**
 * Convenience: register multiple modules at once.
 * Returns a flat map of { moduleKey → VimsModuleResolution }.
 */
export declare function registerVimsModules(modules: Record<string, VimsModuleDeclaration | string | false | undefined>): Record<string, VimsModuleResolution>;
/** Re-export the registration type for consumers */
export type { VimsModuleResolution };
