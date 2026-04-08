import { type VimsAppConfig, type VimsAsyncFrameworkRuntime } from "@vims/framework";
import { SubscriberLoader } from "../subscribers/loader";
import { JobLoader } from "../jobs/loader";
import { WorkflowLoader } from "../flows/loader";
import { LinkLoader } from "./link-loader";
import { ApiLoader, type VimsRouter } from "./api-loader";
import type { VimsModuleConfig } from "./index";
export type VimsAppInitOptions = {
    /** Absolute path to the project root (defaults to cwd) */
    directory?: string;
    /** Override config values */
    configOverrides?: Partial<VimsAppConfig>;
    /**
     * Declarative module map. When provided this is merged on top of the
     * workspace catalog manifest, letting apps swap individual modules at runtime.
     */
    modulesConfig?: VimsModuleConfig;
    /**
     * Additional subscriber directories to scan beyond the built-in ones.
     * Built-in: <directory>/src/subscribers
     */
    subscriberPaths?: string[];
    /**
     * Additional job directories to scan beyond the built-in ones.
     * Built-in: <directory>/src/jobs
     */
    jobPaths?: string[];
    /**
     * Additional workflow directories to scan beyond the built-in ones.
     * Built-in: <directory>/src/workflows
     */
    workflowPaths?: string[];
    /**
     * Additional link directories to scan beyond the built-in ones.
     * Built-in: <directory>/src/links
     */
    linkPaths?: string[];
    /**
     * Additional API source directories to scan beyond the built-in ones.
     * Built-in: <directory>/src/api
     */
    apiPaths?: string[];
    /**
     * Optional router to register discovered API routes on.
     * If omitted, routes are discovered but not registered.
     */
    router?: VimsRouter;
    /**
     * Worker mode
     *  - "server"  → only boot entrypoints, no background processors
     *  - "worker"  → only run background processors, no HTTP
     *  - "shared"  → both (default)
     */
    workerMode?: "server" | "worker" | "shared";
};
export type VimsAppOutput = {
    runtime: VimsAsyncFrameworkRuntime;
    config: VimsAppConfig;
    subscriberLoader: SubscriberLoader;
    jobLoader: JobLoader;
    workflowLoader: WorkflowLoader;
    linkLoader: LinkLoader;
    apiLoader: ApiLoader;
    shutdown: () => Promise<void>;
};
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
export declare function initializeVimsApp(options?: VimsAppInitOptions): Promise<VimsAppOutput>;
