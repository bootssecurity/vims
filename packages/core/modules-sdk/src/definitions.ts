import {
  defineModule,
  VimsModules,
  type VimsModuleDefinition,
} from "@vims/framework";

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
export const VimsModulesDefinition: Record<string, VimsModuleDefinition> = {
  [VimsModules.EVENT_BUS]: defineModule({
    key: VimsModules.EVENT_BUS,
    label: "EventBus",
    owner: "@vims/event-bus",
    isRequired: true,
    defaultPackage: "@vims/event-bus",
    defaultModuleDeclaration: { scope: "internal" },
    register: () => ({}),
  }),

  [VimsModules.CACHE]: defineModule({
    key: VimsModules.CACHE,
    label: "Cache",
    owner: "@vims/cache",
    isRequired: true,
    defaultPackage: "@vims/cache",
    defaultModuleDeclaration: { scope: "internal" },
    dependsOn: [VimsModules.EVENT_BUS],
    register: () => ({}),
  }),

  [VimsModules.WORKFLOW_ENGINE]: defineModule({
    key: VimsModules.WORKFLOW_ENGINE,
    label: "WorkflowEngine",
    owner: "@vims/workflow-engine",
    isRequired: false,
    defaultPackage: false,
    defaultModuleDeclaration: { scope: "internal" },
    dependsOn: [VimsModules.EVENT_BUS],
    register: () => ({}),
  }),
};

export const MODULE_DEFINITIONS = Object.values(VimsModulesDefinition);

export default MODULE_DEFINITIONS;
