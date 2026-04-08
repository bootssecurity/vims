import { type VimsAppConfig } from "@vims/framework";
export declare function loadVimsAppSnapshot(overrides?: Partial<VimsAppConfig>): import("@vims/framework").VimsFrameworkRuntime;
export declare function loadVimsApp(overrides?: Partial<VimsAppConfig>): Promise<import("@vims/framework").VimsAsyncFrameworkRuntime>;
