export declare const platformModules: readonly [import("@vims/framework").VimsModuleDefinition<{
    entries: {
        action: string;
        actor: string;
    }[];
    record: (action: string, actor: string) => {
        action: string;
        actor: string;
    };
}>, import("@vims/framework").VimsModuleDefinition<{
    strategies: string[];
    issueSessionToken(userId: string): string;
    verifySessionToken(token: string): ({
        userId: string;
    } & import("jsonwebtoken").JwtPayload) | null;
}>, import("@vims/framework").VimsModuleDefinition<{
    pipelineStages: string[];
    inventoryCapabilitiesCount: number;
}>, import("@vims/framework").VimsModuleDefinition<{
    capabilities: string[];
    databaseProvider: string;
}>, import("@vims/framework").VimsModuleDefinition<{
    roles: string[];
    can(role: string, permission: string): boolean;
}>, import("@vims/framework").VimsModuleDefinition<{
    resolveTenantMode: typeof import("@vims/tenancy").resolveTenantMode;
}>, import("@vims/framework").VimsModuleDefinition<{
    sections: import("@vims/websites").WebsiteSectionDefinition[];
    inventoryBacked: boolean;
}>];
export declare const platformProviders: readonly [import("@vims/framework").VimsProviderDefinition<{
    key: string;
    url: string;
    createClient: typeof import("@vims/cache-redis").createRedisCacheClient;
}>, import("@vims/framework").VimsProviderDefinition<{
    key: string;
    url: string;
    createClient: typeof import("@vims/database-postgres").createPostgresClient;
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
