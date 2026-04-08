export type TenantMode = "platform-admin" | "dealer-site";
export declare function resolveTenantMode(hostname: string): {
    mode: TenantMode;
    label: string;
    description: string;
};
export declare const tenancyModule: import("@vims/framework").VimsModuleDefinition<{
    resolveTenantMode: typeof resolveTenantMode;
}>;
