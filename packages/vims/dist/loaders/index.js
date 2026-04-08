import { createVimsApp, createVimsAppAsync, } from "@vims/framework";
import { loadVimsConfig } from "@vims/config";
import { discoverWorkspaceManifest } from "../generated/workspace-catalog";
export function loadVimsAppSnapshot(overrides = {}) {
    const config = loadVimsConfig(overrides);
    return createVimsApp(discoverWorkspaceManifest(config), config);
}
export async function loadVimsApp(overrides = {}) {
    const config = loadVimsConfig(overrides);
    const app = await createVimsAppAsync(discoverWorkspaceManifest(config), config);
    await app.start();
    return app;
}
