export declare const authStrategies: string[];
export declare const authModule: import("@vims/framework").VimsModuleDefinition<{
    strategies: string[];
    issueSessionToken(userId: string): string;
}>;
