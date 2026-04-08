import {
  defineModule,
  VimsModules,
  type VimsModuleDefinition,
} from "@vims/framework";

/**
 * Static registry of first-party VIMS modules.
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
  // ── Infrastructure ─────────────────────────────────────────────────────────

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
    isRequired: false,
    defaultPackage: "@vims/cache-redis",
    defaultModuleDeclaration: { scope: "internal" },
    dependsOn: [VimsModules.EVENT_BUS],
    register: () => ({}),
  }),

  [VimsModules.WORKFLOW_ENGINE]: defineModule({
    key: VimsModules.WORKFLOW_ENGINE,
    label: "WorkflowEngine",
    owner: "@vims/workflows-sdk",
    isRequired: false,
    defaultPackage: "@vims/workflows-sdk",
    defaultModuleDeclaration: { scope: "internal" },
    dependsOn: [VimsModules.EVENT_BUS],
    register: () => ({}),
  }),

  [VimsModules.LOCKING]: defineModule({
    key: VimsModules.LOCKING,
    label: "Locking",
    owner: "@vims/locking",
    isRequired: false,
    defaultPackage: false,
    defaultModuleDeclaration: { scope: "internal" },
    register: () => ({}),
  }),

  // ── Identity & Access ───────────────────────────────────────────────────────

  [VimsModules.TENANCY]: defineModule({
    key: VimsModules.TENANCY,
    label: "Tenancy",
    owner: "@vims/tenancy",
    isRequired: true,
    defaultPackage: "@vims/tenancy",
    defaultModuleDeclaration: { scope: "internal" },
    dependsOn: [VimsModules.EVENT_BUS],
    register: () => ({}),
  }),

  [VimsModules.AUTH]: defineModule({
    key: VimsModules.AUTH,
    label: "Auth",
    owner: "@vims/auth",
    isRequired: false,
    defaultPackage: "@vims/auth",
    defaultModuleDeclaration: { scope: "internal" },
    dependsOn: [VimsModules.TENANCY],
    register: () => ({}),
  }),

  [VimsModules.RBAC]: defineModule({
    key: VimsModules.RBAC,
    label: "RBAC",
    owner: "@vims/rbac",
    isRequired: false,
    defaultPackage: "@vims/rbac",
    defaultModuleDeclaration: { scope: "internal" },
    dependsOn: [VimsModules.TENANCY, VimsModules.AUTH],
    register: () => ({}),
  }),

  // ── Domain ──────────────────────────────────────────────────────────────────

  [VimsModules.INVENTORY]: defineModule({
    key: VimsModules.INVENTORY,
    label: "Inventory",
    owner: "@vims/inventory",
    isRequired: false,
    defaultPackage: "@vims/inventory",
    defaultModuleDeclaration: { scope: "internal" },
    dependsOn: [VimsModules.TENANCY, VimsModules.EVENT_BUS],
    register: () => ({}),
  }),

  [VimsModules.CRM]: defineModule({
    key: VimsModules.CRM,
    label: "CRM",
    owner: "@vims/crm",
    isRequired: false,
    defaultPackage: "@vims/crm",
    defaultModuleDeclaration: { scope: "internal" },
    dependsOn: [VimsModules.TENANCY, VimsModules.INVENTORY, VimsModules.EVENT_BUS],
    register: () => ({}),
  }),

  [VimsModules.WEBSITES]: defineModule({
    key: VimsModules.WEBSITES,
    label: "Websites",
    owner: "@vims/websites",
    isRequired: false,
    defaultPackage: "@vims/websites",
    defaultModuleDeclaration: { scope: "internal" },
    dependsOn: [VimsModules.TENANCY, VimsModules.EVENT_BUS],
    register: () => ({}),
  }),

  [VimsModules.AUDIT]: defineModule({
    key: VimsModules.AUDIT,
    label: "Audit",
    owner: "@vims/audit",
    isRequired: false,
    defaultPackage: "@vims/audit",
    defaultModuleDeclaration: { scope: "internal" },
    dependsOn: [VimsModules.EVENT_BUS],
    register: () => ({}),
  }),
};

export const MODULE_DEFINITIONS = Object.values(VimsModulesDefinition);

export default MODULE_DEFINITIONS;
