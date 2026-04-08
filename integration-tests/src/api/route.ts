import type { VimsRouteHandler } from "@vims/vims";

export const GET: VimsRouteHandler = async (req, res) => {
  const container = req.container as any;
  const startTime = Date.now();

  // 1. Service Discovery (via container registrations)
  const entries = typeof container.entries === "function" ? container.entries() : [];
  const keys = entries.map(([key]: [string, any]) => key);
  
  const modules = keys.filter((k: string) => k.startsWith("module:"));
  const providers = keys.filter((k: string) => k.startsWith("provider:"));
  const plugins = keys.filter((k: string) => k.startsWith("plugin:"));

  // 2. Speed Test: Database (Postgres)
  let dbLatency = -1;
  try {
    const dbStart = Date.now();
    await req.manager.execute("SELECT 1");
    dbLatency = Date.now() - dbStart;
  } catch (err) {
    console.error("Dashboard DB Speed Test Failed:", err);
  }

  // 3. Speed Test: Cache (Redis)
  let redisLatency = -1;
  try {
    const redis = container.resolve("provider:cache-redis");
    const redisStart = Date.now();
    await redis.set("speed-test", "ok", 10);
    await redis.get("speed-test");
    redisLatency = Date.now() - redisStart;
  } catch (err) {
    // Redis might not be enabled or configured
  }

  res.status(200).json({
    status: "VIMS_GATEWAY_ONLINE",
    version: "v0.1.0",
    uptime_ms: process.uptime() * 1000,
    speed_test: {
      database_latency_ms: dbLatency,
      cache_latency_ms: redisLatency,
      check_duration_ms: Date.now() - startTime
    },
    services: {
      modules: {
        count: modules.length,
        items: modules.map((m: string) => m.replace("module:", ""))
      },
      providers: {
        count: providers.length,
        items: providers.map((p: string) => p.replace("provider:", ""))
      },
      plugins: {
        count: plugins.length,
        items: plugins.map((p: string) => p.replace("plugin:", ""))
      }
    },
    gateways: {
      api: "/",
      dashboard: "/admin",
      health: "/health"
    }
  });
};
