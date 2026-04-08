export type WebsiteSectionDefinition = {
    key: string;
    label: string;
    description: string;
};
export declare const websiteSectionLibrary: WebsiteSectionDefinition[];
export declare const websitesModule: import("@vims/framework").VimsModuleDefinition<{
    sections: WebsiteSectionDefinition[];
    inventoryBacked: boolean;
}>;
