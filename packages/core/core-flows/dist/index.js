import { createWorkflowDefinition, createWorkflowStep, } from "@vims/workflows-sdk";
export const publishDealerWebsiteFlow = createWorkflowDefinition("dealer.website.publish", [
    createWorkflowStep("mark-published", (context) => (Object.assign(Object.assign({}, context), { status: "published", publishedAt: new Date("2026-04-07T00:00:00.000Z").toISOString() }))),
]);
