import { describe, expect, it } from "vitest";

import { publishDealerWebsiteFlow } from "./index";

describe("@vims/core-flows", () => {
  it("publishes dealer websites through a predefined flow", async () => {
    const result = await publishDealerWebsiteFlow.run({
      dealerId: "dealer_01",
      status: "draft",
    });

    expect(result.status).toBe("published");
    expect(result.publishedAt).toBeDefined();
  });
});
