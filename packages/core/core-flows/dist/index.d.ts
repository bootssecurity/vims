export type DealerWebsitePublishContext = {
    dealerId: string;
    status: "draft" | "published";
    publishedAt?: string;
};
export declare const publishDealerWebsiteFlow: import("@vims/orchestration").RegisteredWorkflow & {
    run: (initialContext: DealerWebsitePublishContext) => Promise<DealerWebsitePublishContext>;
};
