import { join } from "path";
import { loadVimsConfig, } from "@vims/config";
import { bootFrameworkAsync, } from "@vims/framework";
import { VimsModule, Link, createQuery } from "@vims/modules-sdk";
import { SubscriberLoader } from "../subscribers/loader";
import { JobLoader } from "../jobs/loader";
import { WorkflowLoader } from "../flows/loader";
import { LinkLoader } from "./link-loader";
import { ApiLoader } from "./api-loader";
import { discoverWorkspaceManifest } from "../generated/workspace-catalog";
/**
 * Top-level VIMS application initializer.
 *
 * Orchestration order:
 *  1. Load config
 *  2. Boot framework (providers → modules → plugins)
 *  3. Run async prepare phase
 *  4. Bootstrap declarative modules (if modulesConfig provided)
 *  5. Load links (future: LinkLoader)
 *  6. Load workflows
 *  7. Load subscribers
 *  8. Load jobs (background processors) — only in "worker" | "shared" mode
 *  9. Call start phase (onApplicationStart)
 * 10. Return handles + shutdown fn
 */
export async function initializeVimsApp(options = {}) {
    const { directory = process.cwd(), configOverrides = {}, modulesConfig, subscriberPaths = [], jobPaths = [], workflowPaths = [], linkPaths = [], apiPaths = [], router, workerMode = "shared", } = options;
    // 1. Load config
    const config = loadVimsConfig(configOverrides);
    // 2 & 3. Boot framework + async prepare
    const manifest = discoverWorkspaceManifest(config);
    const runtime = await bootFrameworkAsync(manifest, config);
    // 4. Bootstrap declarative modules if config provided
    if (modulesConfig) {
        const { loadVimsAppModules } = await import("./index");
        await loadVimsAppModules(modulesConfig, { cwd: directory });
    }
    // 5. Load links
    const linkDirs = [join(directory, "src", "links"), ...linkPaths];
    const linkLoader = new LinkLoader(linkDirs);
    await linkLoader.load();
    // Resolve the container from the runtime
    const container = runtime.container;
    // 5a. Wire the Link graph + RemoteQuery into the container
    const link = new Link();
    const query = createQuery(container);
    container.register("link", link);
    container.register("query", query);
    // 6. Load workflows
    const workflowDirs = [
        join(directory, "src", "workflows"),
        ...workflowPaths,
    ];
    const workflowLoader = new WorkflowLoader(workflowDirs);
    await workflowLoader.load();
    // 7. Load subscribers
    const subscriberDirs = [
        join(directory, "src", "subscribers"),
        ...subscriberPaths,
    ];
    const subscriberLoader = new SubscriberLoader(subscriberDirs, container);
    await subscriberLoader.load();
    // 8. Load jobs (only when background processors should run)
    const shouldRunBackground = workerMode === "worker" || workerMode === "shared";
    const jobDirs = [join(directory, "src", "jobs"), ...jobPaths];
    const jobLoader = new JobLoader(jobDirs, container);
    if (shouldRunBackground) {
        await jobLoader.load();
    }
    // 5b. Load API routes (only in server/shared mode)
    const shouldLoadApi = workerMode === "server" || workerMode === "shared";
    const apiDirs = [join(directory, "src", "api"), ...apiPaths];
    const apiLoader = new ApiLoader({ sourceDirs: apiDirs, router });
    if (shouldLoadApi) {
        await apiLoader.load();
    }
    // 9. Start phase
    await runtime.start();
    // 10. Compose shutdown
    const shutdown = async () => {
        jobLoader.stopAll();
        await VimsModule.onApplicationPrepareShutdown();
        await VimsModule.onApplicationShutdown();
        await runtime.shutdown();
    };
    return {
        runtime,
        config,
        subscriberLoader,
        jobLoader,
        workflowLoader,
        linkLoader,
        apiLoader,
        link,
        query,
        shutdown,
    };
}
