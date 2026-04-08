export declare function createPostgresUrl(): string;
export declare function createPostgresClient(): Promise<any>;
export declare const postgresProvider: import("@vims/framework").VimsProviderDefinition<{
    key: string;
    url: string;
    readonly manager: any;
    readonly orm: any;
}>;
