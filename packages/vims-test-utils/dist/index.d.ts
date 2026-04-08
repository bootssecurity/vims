import { type VimsRuntimeConfig } from "@vims/config";
export declare const defaultTestModules: readonly [import("@vims/framework").VimsModuleDefinition<{
    resolveTenantMode: typeof import("@vims/tenancy").resolveTenantMode;
}>, import("@vims/framework").VimsModuleDefinition<{
    strategies: string[];
    issueSessionToken(userId: string): string;
}>, import("@vims/framework").VimsModuleDefinition<{
    roles: string[];
    can(role: string, permission: string): boolean;
}>, import("@vims/framework").VimsModuleDefinition<{
    entries: {
        action: string;
        actor: string;
    }[];
    record: (action: string, actor: string) => {
        action: string;
        actor: string;
    };
}>, import("@vims/framework").VimsModuleDefinition<{
    capabilities: string[];
    databaseProvider: string;
}>, import("@vims/framework").VimsModuleDefinition<{
    pipelineStages: string[];
    inventoryCapabilitiesCount: number;
}>, import("@vims/framework").VimsModuleDefinition<{
    sections: import("@vims/websites").WebsiteSectionDefinition[];
    inventoryBacked: boolean;
}>];
export declare const defaultTestProviders: readonly [import("@vims/framework").VimsProviderDefinition<{
    key: string;
    url: string;
    createClient: typeof import("@vims/database-postgres").createPostgresClient;
}>, import("@vims/framework").VimsProviderDefinition<{
    key: string;
    url: string;
    createClient: typeof import("@vims/cache-redis").createRedisCacheClient;
}>, import("@vims/framework").VimsProviderDefinition<{
    key: string;
    bus: {
        emit<T>(name: string, payload: T): {
            name: string;
            payload: T;
        };
        all(): import("@vims/events").VimsEvent<unknown>[];
        count(name?: string): number;
    };
}>];
export declare const defaultTestPlugins: readonly [import("@vims/framework").VimsPluginDefinition<{
    enabled: boolean;
    sectionCount: number;
}, {
    links: Array<ReturnType<typeof import("@vims/modules-sdk").createModuleLink>>;
    admin: {
        sections: typeof import("@vims/websites").websiteSectionLibrary;
    };
    flows: {
        publish: typeof import("@vims/core-flows").publishDealerWebsiteFlow;
    };
}>];
export declare function createTestConfig(overrides?: Partial<VimsRuntimeConfig>): VimsRuntimeConfig;
export declare function bootTestVimsApp(overrides?: Partial<VimsRuntimeConfig>): import("@vims/framework").VimsFrameworkRuntime;
export declare function createTestManifest(): import("@vims/framework").VimsFrameworkManifest;
export declare function createModuleTestRunner(): {
    boot(overrides?: Partial<VimsRuntimeConfig>): import("@vims/framework").VimsFrameworkRuntime;
    manifest(): import("@vims/framework").VimsFrameworkManifest;
    config(overrides?: Partial<VimsRuntimeConfig>): VimsRuntimeConfig;
};
