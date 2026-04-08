import { type VimsModuleDefinition } from "@vims/framework";
/**
 * Static registry of first-party VIMS modules.
 * Mirrors Medusa's `ModulesDefinition` in @medusajs/modules-sdk.
 *
 * Each entry declares:
 *  - key:                    canonical lookup key
 *  - label:                  human-readable name for logs/errors
 *  - owner:                  the package that provides the default implementation
 *  - isRequired:             whether the framework refuses to start without it
 *  - defaultPackage:         npm package or workspace path for default impl, or false
 *  - dependsOn:              other module keys that must load first
 *  - defaultModuleDeclaration: default scope used when apps don't override it
 *  - register:               placeholder — real impl comes from the resolved package
 */
export declare const VimsModulesDefinition: Record<string, VimsModuleDefinition>;
export declare const MODULE_DEFINITIONS: VimsModuleDefinition[];
export default MODULE_DEFINITIONS;
