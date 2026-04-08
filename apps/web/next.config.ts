import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: [
    "@vims/audit",
    "@vims/auth",
    "@vims/cache-redis",
    "@vims/config",
    "@vims/database-postgres",
    "@vims/event-bus-local",
    "@vims/framework",
    "@vims/logger",
    "@vims/policies",
    "@vims/crm",
    "@vims/inventory",
    "@vims/rbac",
    "@vims/tenancy",
    "@vims/types",
    "@vims/ui",
    "@vims/utils",
    "@vims/vims",
    "@vims/workflows",
    "@vims/websites",
  ],
};

export default nextConfig;
