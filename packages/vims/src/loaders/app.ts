import { join } from "path";
import {
  loadVimsConfig,
} from "@vims/config";
import {
  bootFrameworkAsync,
  type VimsAppConfig,
  type VimsAsyncFrameworkRuntime,
} from "@vims/framework";
import { VimsModule, Link, createQuery, type RemoteQuery } from "@vims/modules-sdk";
import { SubscriberLoader } from "../subscribers/loader";
import { JobLoader } from "../jobs/loader";
import { WorkflowLoader } from "../flows/loader";
import { LinkLoader } from "./link-loader";
import { ApiLoader, type VimsRouter } from "./api-loader";
import { discoverWorkspaceManifest } from "../generated/workspace-catalog";
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
  link: Link;
  query: RemoteQuery;
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
export async function initializeVimsApp(
  options: VimsAppInitOptions = {}
): Promise<VimsAppOutput> {
  const {
    directory = process.cwd(),
    configOverrides = {},
    modulesConfig,
    subscriberPaths = [],
    jobPaths = [],
    workflowPaths = [],
    linkPaths = [],
    apiPaths = [],
    router,
    workerMode = "shared",
  } = options;

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
  const container = runtime.container as any;

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
  const apiLoader = new ApiLoader({ sourceDirs: apiDirs, router, container });

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
