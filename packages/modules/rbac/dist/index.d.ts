export declare const defaultRoles: string[];
export declare const rbacModule: import("@vims/framework").VimsModuleDefinition<{
    roles: string[];
    can(role: string, permission: string): boolean;
}>;
