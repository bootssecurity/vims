import { createModuleLink, createPluginDefinition } from "@vims/modules-sdk";
import { publishDealerWebsiteFlow } from "@vims/core-flows";
import { websiteSectionLibrary } from "@vims/websites";
export const websiteBuilderPlugin = createPluginDefinition({
    key: "website-builder",
    label: "Website Builder",
    owner: "packages/plugins/website-builder",
    dependsOn: [],
    register: ({ registerService }) => {
        registerService("plugins.website-builder.sections", websiteSectionLibrary);
        return {
            enabled: true,
            sectionCount: websiteSectionLibrary.length,
        };
    },
    boot: ({ logger }) => {
        logger.info("plugin.website-builder.boot", {
            sections: websiteSectionLibrary.length,
        });
    },
    links: [
        createModuleLink({
            source: "websites",
            target: "inventory",
            relationship: "one-to-many",
        }),
    ],
    admin: {
        sections: websiteSectionLibrary,
    },
    flows: {
        publish: publishDealerWebsiteFlow,
    },
});
