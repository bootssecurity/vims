import postgres from "postgres";
export declare function createPostgresUrl(): string;
export declare function createPostgresClient(): postgres.Sql<{}>;
export declare const postgresProvider: import("@vims/framework").VimsProviderDefinition<{
    key: string;
    url: string;
    createClient: typeof createPostgresClient;
}>;
