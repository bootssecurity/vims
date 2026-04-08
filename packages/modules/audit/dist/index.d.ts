export declare const auditModule: import("@vims/framework").VimsModuleDefinition<{
    entries: {
        action: string;
        actor: string;
    }[];
    record: (action: string, actor: string) => {
        action: string;
        actor: string;
    };
}>;
