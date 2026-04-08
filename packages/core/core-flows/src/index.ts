import {
  createWorkflowDefinition,
  createWorkflowStep,
} from "@vims/workflows-sdk";

export type DealerWebsitePublishContext = {
  dealerId: string;
  status: "draft" | "published";
  publishedAt?: string;
};

export const publishDealerWebsiteFlow = createWorkflowDefinition(
  "dealer.website.publish",
  [
    createWorkflowStep<DealerWebsitePublishContext>("mark-published", (context) => ({
      ...context,
      status: "published",
      publishedAt: new Date("2026-04-07T00:00:00.000Z").toISOString(),
    })),
  ],
);
