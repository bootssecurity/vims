import path, { join } from "node:path";
import { existsSync, readFileSync, type Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { execSync } from "child_process";
import express from "express";
import cors from "cors";
import { parseCorsOrigins, isCorsAllowed, handlePostgresError } from "@vims/utils";
import { reporter } from "../util/reporter.js";
import boxen from "boxen";
import Table from "cli-table3";
import chalk from "chalk";
import { performance } from "perf_hooks";
import dotenv from "dotenv";
import { renderVimsDashboard } from "../util/dashboard-template.js";

/**
 * Detects and terminates any process currently occupying the specified port.
 */
async function killPort(port: number) {
  const activity = reporter.activity(`Checking port ${port}...`);
  try {
    // Find PIDs for the port (works on Mac/Linux)
    const pids = execSync(`lsof -i :${port} -t`, { encoding: "utf-8" }).trim();
    if (pids) {
      execSync(`kill -9 ${pids}`);
      reporter.success(activity, `Port ${port} cleared`);
    } else {
      reporter.success(activity, `Port ${port} is available`);
    }
  } catch (error) {
    // lsof exits with 1 if no process is found, which is fine
    reporter.success(activity, `Port ${port} ready`);
  }
}

/**
 * Performs a full platform build using Turborepo.
 */
async function buildPlatform(directory: string) {
  const activity = reporter.activity("Compiling Platform...");
  try {
    // Check if we are in the monorepo root
    let isRoot = false;
    try {
      const pkgPath = join(process.cwd(), "package.json");
      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
        isRoot = pkg.name === "vims-platform";
      }
    } catch {
      isRoot = false;
    }
    
    // Root build (Full platform) or Targeted build (Core only)
    const buildCmd = isRoot 
      ? "npx turbo run build --filter=!@vims/cli" // Build everything EXCEPT the running CLI
      : "npx turbo run build --filter=@vims/vims";
    
    // Execute build and capture output for error reporting
    execSync(buildCmd, { stdio: "pipe", cwd: process.cwd() });
    reporter.success(activity, "Platform compiled successfully");
  } catch (error: any) {
    reporter.error(activity, "Platform compilation failed");
    if (error.stderr || error.stdout) {
      console.error(chalk.red("\nBuild Error Details:"));
      console.error(error.stderr?.toString() || error.stdout?.toString());
    }
    process.exit(1);
  }
}

/**
 * Checks connectivity and latency for Postgres and Redis.
 */
async function checkInfrastructureHealth() {
  const results = {
    postgres: { status: "Offline", latency: 0 },
    redis: { status: "Offline", latency: 0 }
  };

  // Postgres Check
  const pgUrl = process.env.POSTGRES_URL || "postgres://postgres:postgres@127.0.0.1:5432/vims";
  if (pgUrl) {
    const start = performance.now();
    try {
      const pg = await import("pg");
      const Client: any = pg.default ? (pg.default as any).Client : (pg as any).Client;
      const client = new Client({ connectionString: pgUrl, connectionTimeoutMillis: 2000 });
      await client.connect();
      await client.query("SELECT 1");
      await client.end();
      results.postgres = { status: "Online", latency: Math.round(performance.now() - start) };
    } catch (e: any) {
      results.postgres = { status: "Offline", latency: 0 };
    }
  }

  // Redis Check
  const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
  if (redisUrl) {
    const start = performance.now();
    try {
      const ioredis = await import("ioredis");
      const RedisClass: any = ioredis.default || (ioredis as any);
      const redis = new RedisClass(redisUrl, { connectTimeout: 2000, lazyConnect: true });
      await redis.connect();
      await redis.ping();
      await redis.quit();
      results.redis = { status: "Online", latency: Math.round(performance.now() - start) };
    } catch (e: any) {
      results.redis = { status: "Offline", latency: 0 };
    }
  }

  return results;
}

function displaySummary(data: any, options: any) {
  const table = new Table({
    head: [chalk.cyan("Resource"), chalk.cyan("Count"), chalk.cyan("Status")],
    chars: { mid: "", "left-mid": "", "mid-mid": "", "right-mid": "" },
    style: { head: [], border: [] },
  });

  table.push(
    ["Core Modules", chalk.cyan("7"), chalk.green("Active")],
    ["Providers", chalk.cyan("5"), chalk.green("Loaded")],
    ["Plugins", chalk.cyan("1"), chalk.green("Active")],
    ["Subscribers", data.subscribers, chalk.green("Active")],
    ["Workflows", data.workflows, chalk.green("Active")],
    ["API Routes", data.routes, chalk.green("Ready")]
  );

  // Infrastructure Health Section
  if (!options.skipHealth) {
    table.push([chalk.dim("----------------"), chalk.dim("----------"), chalk.dim("---------------")]);
    
    // Postgres Display
    table.push([
      "Database (PG)", 
      data.health.postgres.status === "Online" ? chalk.cyan(`${data.health.postgres.latency}ms`) : chalk.dim("127.0.0.1:5432"), 
      data.health.postgres.status === "Online" ? chalk.green("Online") : chalk.red(data.health.postgres.status)
    ]);

    // Redis Display
    table.push([
      "Cache (Redis)", 
      data.health.redis.status === "Online" ? chalk.cyan(`${data.health.redis.latency}ms`) : chalk.dim("127.0.0.1:6379"), 
      data.health.redis.status === "Online" ? chalk.green("Online") : chalk.red(data.health.redis.status)
    ]);
  }

  const output = boxen(
    "\n" +
      chalk.bold("   VIMS PLATFORM") +
      "\n\n" +
      table.toString() +
      "\n\n" +
      `   API Gateway:   ${chalk.blue(`http://localhost:${data.port}`)}\n` +
      `   Admin Panel:   ${chalk.blue(`http://localhost:${data.port}/admin`)}\n` +
      `   Health Check: ${chalk.blue(`http://localhost:${data.port}/health`)}\n`,
    {
      padding: 1,
      margin: 1,
      borderStyle: "round",
      borderColor: "blue",
      title: chalk.dim(`v0.1.0`),
      titleAlignment: "right",
    }
  );

  console.log(output);
}

/**
 * Discovers VIMS resource directories across a monorepo (packages/ and apps/)
 */
async function discoverWorkspaceResources(root: string) {
  const resourcePaths: any = {
    subscribers: [],
    workflows: [],
    jobs: [],
    links: [],
    api: [],
  };

  const discoveryRoots = ["packages", "apps"];
  const packagesFound: string[] = [];
  
  async function scanDir(currentPath: string, depth = 0) {
    if (depth > 6) return; 

    // console.log(`${chalk.gray("🔍 Scanning:")} ${path.relative(root, currentPath) || "."}`);

    const entries = await readdir(currentPath, { withFileTypes: true });
    
    // 1. Check if this specific directory is a package
    const isPackage = entries.some((e: Dirent) => e.name === "package.json");
    if (isPackage) {
      packagesFound.push(currentPath);
      
      const getResourcePath = (sub: string) => {
        const distPath = join(currentPath, "dist", sub);
        const srcPath = join(currentPath, "src", sub);
        
        // Priority: dist -> src
        if (existsSync(distPath)) return distPath;
        if (existsSync(srcPath)) return srcPath;
        return null;
      };

      const paths = {
        subscribers: getResourcePath("subscribers"),
        workflows: getResourcePath("workflows"),
        jobs: getResourcePath("jobs"),
        links: getResourcePath("links"),
        api: getResourcePath("api"),
      };

      if (paths.subscribers) resourcePaths.subscribers.push(paths.subscribers);
      if (paths.workflows) resourcePaths.workflows.push(paths.workflows);
      if (paths.jobs) resourcePaths.jobs.push(paths.jobs);
      if (paths.links) resourcePaths.links.push(paths.links);
      if (paths.api) resourcePaths.api.push(paths.api);
    }

    // 2. Recursively scan subdirectories
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      // Skip common build/dependency artifacts
      if (["node_modules", "dist", "out", ".next", "cli", ".git"].includes(entry.name) || entry.name.startsWith(".")) continue;
      
      await scanDir(join(currentPath, entry.name), depth + 1);
    }
  }

  for (const dirName of discoveryRoots) {
    const fullPath = join(root, dirName);
    if (existsSync(fullPath)) {
      await scanDir(fullPath);
    }
  }

  if (packagesFound.length > 0) {
    reporter.info(`Monorepo Scan complete. Found VIMS resources in: ${packagesFound.map(p => path.basename(p)).join(", ")}`);
  }

  return resourcePaths;
}

export async function startCommand(options: any) {
  const directory = options.directory ? path.resolve(process.cwd(), options.directory) : process.cwd();
  const root = process.cwd();

  // 1. Load environment variables from the root AND the project directory
  const rootEnv = join(root, ".env");
  const projectEnv = join(directory, ".env");

  if (existsSync(rootEnv)) {
    dotenv.config({ path: rootEnv, override: true });
  }

  if (existsSync(projectEnv) && projectEnv !== rootEnv) {
    dotenv.config({ path: projectEnv, override: true });
  }

  const port = parseInt(options.port, 10) || parseInt(process.env.VIMS_PORT || process.env.PORT || "9005", 10);

  // DIAGNOSTIC LOGGING
  reporter.info(`[VIMS] Execution Context: ${root}`);
  reporter.info(`[VIMS] Target Directory: ${directory}`);
  reporter.info(`[VIMS] Gateway Port: ${port}`);
  
  const isMonorepoRoot = existsSync(join(root, "turbo.json")) || existsSync(join(root, "packages"));
  reporter.info(`[VIMS] Monorepo Mode: ${isMonorepoRoot ? "Yes" : "No"}`);

  // 0. Kill existing process on port (unless disabled)
  if (options.kill !== false) {
    await killPort(port);
  }

  // 1. Build Phase (if enabled)
  if (options.build !== false) {
    // Warmup the framework registry if we are in a monorepo
    if (isMonorepoRoot) {
      const registryActivity = reporter.activity("Updating Framework Registry");
      try {
        execSync("node scripts/generate-workspace-registry.mjs", { stdio: "ignore", cwd: root });
        reporter.success(registryActivity, "Framework Registry Updated");
      } catch (err) {
        reporter.error(registryActivity, "Failed to update Framework Registry");
      }
    }
    
    await buildPlatform(directory);
  }

  // Detect monorepo root and discover all workspace resources
  let discoveredResources: any = { subscribers: [], workflows: [], jobs: [], links: [], api: [] };
  
  if (isMonorepoRoot) {
    const discoveryId = reporter.activity("Discovering Workspace Resources");
    discoveredResources = await discoverWorkspaceResources(root);
    const totalCount = discoveredResources.subscribers.length + discoveredResources.workflows.length + discoveredResources.api.length;
    reporter.success(discoveryId, `Discovered resources in ${totalCount} packages`);
  }

  // 2. Health Check Phase
  let health = { postgres: { status: "Not Checked", latency: 0 }, redis: { status: "Not Checked", latency: 0 } };
  if (!options.skipHealth) {
    health = await checkInfrastructureHealth();
  }

  const bootActivity = reporter.activity(`Initializing VIMS Framework (Source: ${path.basename(directory)})`);
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const NEXT_PORT = parseInt(process.env.VIMS_NEXT_PORT ?? "3001", 10);
  const appsWebPath = path.resolve(root, "apps/web");

  // Spawn Next.js server and proxy /admin to it (enables middleware + API routes)
  if (existsSync(appsWebPath)) {
    const { createProxyMiddleware } = await import("http-proxy-middleware");
    const { spawn } = await import("child_process");

    // Start Next.js in the background
    const nextProcess = spawn(
      "node",
      [".next/standalone/apps/web/server.js"],
      {
        cwd: appsWebPath,
        env: { ...process.env, PORT: String(NEXT_PORT), HOSTNAME: "127.0.0.1" },
        stdio: "ignore",
      }
    );
    nextProcess.unref();

    // Proxy /admin and /api/auth to Next.js
    const proxy = createProxyMiddleware({
      target: `http://127.0.0.1:${NEXT_PORT}`,
      changeOrigin: true,
    });

    app.use("/admin", proxy);
    app.use("/login", proxy);
  }

  const vimsRouter = express.Router();

  const { initializeVimsApp } = await import("@vims/vims");

  try {
    const vimsOutput = await initializeVimsApp({
      directory: directory,
      subscriberPaths: discoveredResources.subscribers,
      workflowPaths: discoveredResources.workflows,
      jobPaths: discoveredResources.jobs,
      linkPaths: discoveredResources.links,
      apiPaths: discoveredResources.api,
      router: vimsRouter,
    });

    // Root Platform Summary (now within scope of vimsOutput)
    app.get("/", (req, res) => {
      const data = {
        name: "VIMS Platform",
        version: "0.1.0",
        status: "Running",
        health,
        resources: {
          modules: 7,
          providers: 5,
          plugins: 1,
          subscribers: vimsOutput.subscriberLoader?.getRegistered().length || 0,
          workflows: vimsOutput.workflowLoader?.getWorkflows().length || 0,
          apiRoutes: vimsOutput.apiLoader?.getRoutes().length || 0,
        },
        endpoints: {
          admin: "/admin",
          health: "/health",
          api: "/"
        }
      };

      // Content Negotiation: Serve HTML to browsers, JSON to API clients
      res.format({
        html: () => res.send(renderVimsDashboard(data)),
        json: () => res.json(data),
        default: () => res.json(data)
      });
    });

    reporter.success(bootActivity, "VIMS Framework Initialized");

    // Standard Vims Infrastructure Status (Health + resources)
    const table = new Table({
      head: [chalk.blue("Resource"), chalk.blue("Count"), chalk.blue("Status")],
      colWidths: [20, 20, 18],
    });

    table.push(
      ["Project Source", path.basename(directory), "Directory"],
      ["Core Modules", "7", "Active"],
      ["Providers", "5", "Loaded"],
      ["Plugins", "1", "Active"],
      ["Subscribers", vimsOutput.subscriberLoader?.getRegistered().length || 0, "Active"],
      ["Workflows", vimsOutput.workflowLoader?.getWorkflows().length || 0, "Active"],
      ["API Routes", vimsOutput.apiLoader?.getRoutes().length || 0, "Ready"],
      [
        { content: chalk.gray("----------------"), colSpan: 1 },
        { content: chalk.gray("----------"), colSpan: 1 },
        { content: chalk.gray("---------------"), colSpan: 1 },
      ],
      ["Database (PG)", `${health.postgres.latency}ms`, health.postgres.status === "Online" ? chalk.green("Online") : chalk.red(health.postgres.status)],
      ["Cache (Redis)", `${health.redis.latency}ms`, health.redis.status === "Online" ? chalk.green("Online") : chalk.red(health.redis.status)]
    );

    const gatewayUrl = `http://localhost:${port}`;
    
    app.use("/", vimsRouter);

    // Global Error Handler
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error(err);
      const pgError = handlePostgresError(err);
      res.status(pgError.statusCode).json({
        type: pgError.type,
        message: pgError.message,
      });
    });

    app.listen(port, () => {
      reporter.success(reporter.activity("Starting Server..."), "VIMS Server is online");
      displaySummary({
        directory,
        port,
        subscribers: vimsOutput.subscriberLoader.getRegistered().length,
        workflows: vimsOutput.workflowLoader.getWorkflows().length,
        jobs: vimsOutput.jobLoader.getJobs().length,
        routes: vimsOutput.apiLoader.getRoutes().length,
        health
      }, options);
    });

    // Graceful Shutdown
    const gracefullyShutdown = async () => {
      reporter.info("Shutting down VIMS elegantly...");
      await vimsOutput.shutdown();
      process.exit(0);
    };

    process.on("SIGINT", gracefullyShutdown);
    process.on("SIGTERM", gracefullyShutdown);

  } catch (error: any) {
    reporter.error(bootActivity, `Failed to start VIMS: ${error.message}`);
    process.exit(1);
  }
}
