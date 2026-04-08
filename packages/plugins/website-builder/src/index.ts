import { createModuleLink, createPluginDefinition } from "@vims/modules-sdk";
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

export const websiteBuilderPlugin = createPluginDefinition<
  WebsiteBuilderPluginRuntime,
  WebsiteBuilderPluginMetadata
>({
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
