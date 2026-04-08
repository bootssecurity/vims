export declare function createRedisUrl(): string;
export declare const redisCacheProvider: import("@vims/framework").VimsProviderDefinition<{
    key: string;
    get(namespace: string, key: string): Promise<any>;
    set(namespace: string, key: string, data: any, ttl?: number): Promise<void>;
    invalidate(namespace: string, keys?: string[]): Promise<void>;
    destroy(): Promise<void>;
}>;
