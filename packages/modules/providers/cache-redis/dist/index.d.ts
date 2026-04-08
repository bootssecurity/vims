import Redis from "ioredis";
export declare function createRedisUrl(): string;
export declare const redisCacheProvider: import("@vims/framework").VimsProviderDefinition<{
    key: string;
    url: string;
    createClient: typeof createRedisCacheClient;
}>;
export declare function createRedisCacheClient(url?: string): Redis;
