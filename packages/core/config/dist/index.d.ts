export type VimsEnvironment = "development" | "test" | "production";
export type VimsRuntimeConfig = {
    name: string;
    environment: VimsEnvironment;
    postgresUrl: string;
    redisUrl: string;
    enableAdmin: boolean;
    enableTelemetry: boolean;
    enabledModules?: string[];
    enabledProviders?: string[];
    enabledPlugins?: string[];
};
export declare function loadVimsConfig(overrides?: Partial<VimsRuntimeConfig>): VimsRuntimeConfig;
