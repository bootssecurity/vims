import { createModuleLink } from "@vims/modules-sdk";
import { publishDealerWebsiteFlow } from "@vims/core-flows";
import { websiteSectionLibrary } from "@vims/websites";
type WebsiteBuilderPluginRuntime = {
    enabled: boolean;
    sectionCount: number;
};
type WebsiteBuilderPluginMetadata = {
    links: Array<ReturnType<typeof createModuleLink>>;
    admin: {
        sections: typeof websiteSectionLibrary;
    };
    flows: {
        publish: typeof publishDealerWebsiteFlow;
    };
};
export declare const websiteBuilderPlugin: import("@vims/framework").VimsPluginDefinition<WebsiteBuilderPluginRuntime, WebsiteBuilderPluginMetadata>;
export {};
