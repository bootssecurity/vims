import { describe, expect, it } from "vitest";
import { vimsCommands } from "./commands/index";
import { vimsFeatureFlags } from "./feature-flags/index";
import { vimsJobs } from "./jobs/index";
import { vimsModules, vimsProviders } from "./modules/index";
import { vimsSubscribers } from "./subscribers/index";

describe("@vims/vims", () => {
  it("aggregates framework modules and providers", () => {
    expect(vimsModules.map((entry) => entry.key)).toContain("inventory");
    expect(vimsProviders.map((entry) => entry.key)).toContain("database-postgres");
  });

  it("exposes operational framework surfaces", () => {
    expect(vimsCommands.map((entry) => entry.name)).toContain("develop");
    expect(vimsJobs).toContain("website-publish");
    expect(vimsSubscribers).toContain("crm.lead.created");
    expect(vimsFeatureFlags.websiteBuilderBlocks).toBe(true);
  });
});
