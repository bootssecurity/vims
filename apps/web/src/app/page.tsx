import { serviceExtractionPlan } from "@vims/types";
import { definePolicy } from "@vims/policies";
import { formatNumber } from "@vims/utils";
import { defineWorkflow } from "@vims/workflows";
import { bootVimsApp } from "@/lib/vims-app";
import { AdminShell } from "@/components/admin-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Box, Server, Activity, Terminal, Shield, Share2 } from "lucide-react";

const publishWorkflow = defineWorkflow("dealer-site-publish", [
  {
    name: "prepare",
    run: (context: { steps: string[] }) => ({
      steps: [...context.steps, "prepare"],
    }),
  },
  {
    name: "publish",
    run: (context: { steps: string[] }) => ({
      steps: [...context.steps, "publish"],
    }),
  },
]);

const samplePolicy = definePolicy<{ role: string }>(({ role }) => ({
  allowed: role === "platform_admin",
  reason: role === "platform_admin" ? undefined : "role requires escalation",
}));

export default async function Home() {
  const runtime = await bootVimsApp();
  const logger = runtime.container.resolve<{
    all: () => Array<{ level: string; message: string }>;
  }>("logger");
  
  const tenancyApi = runtime.modules.get("tenancy") as any;
  const inventoryApi = runtime.modules.get("inventory") as any;
  const crmApi = runtime.modules.get("crm") as any;
  const websitesApi = runtime.modules.get("websites") as any;
  
  const frameworkModules = [...runtime.modules.entries()].map(([key, value]) => ({
    key,
    value: value as Record<string, unknown>,
  }));
  
  const frameworkProviders = [...runtime.providers.entries()].map(([key, value]) => ({
    key,
    value: value as Record<string, unknown>,
  }));
  
  const bootLogs = logger.all();
  
  const metrics = [
    { label: "Core Modules", value: formatNumber(frameworkModules.length), icon: Box, color: "text-primary" },
    { label: "Providers", value: formatNumber(frameworkProviders.length), icon: Server, color: "text-accent-foreground" },
    { label: "API Routes", value: formatNumber(33), icon: Share2, color: "text-muted-foreground" }, // Mode-aware
    { label: "Security Policies", value: formatNumber(12), icon: Shield, color: "text-secondary-foreground" }, // Mode-aware
  ];

  return (
    <AdminShell>
      <div className="flex flex-col gap-8">
        {/* Hero Section */}
        <section className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Platform Overview</h1>
          <p className="text-muted-foreground">
            Manage your modular monolith architecture and service extraction paths.
          </p>
        </section>

        {/* Metric Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Domain Modules */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Box className="h-5 w-5 text-primary" />
                Domain Modules
              </CardTitle>
              <CardDescription>
                Packages owning business language and core contracts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {frameworkModules.map((module) => (
                  <div key={module.key} className="flex flex-col gap-1 p-3 rounded-xl border bg-card/50">
                    <span className="font-semibold">{module.key}</span>
                    <span className="text-xs text-muted-foreground">Active in runtime</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Service Extraction */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-accent-foreground" />
                Service Extraction Plan
              </CardTitle>
              <CardDescription>
                Identified contexts for independent deployment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {serviceExtractionPlan.map((service) => (
                  <div key={service.name} className="flex items-center justify-between p-3 rounded-xl border bg-card/50">
                    <div>
                      <div className="font-medium">{service.name}</div>
                      <div className="text-xs text-muted-foreground">{service.trigger}</div>
                    </div>
                    <div className="text-xs font-mono bg-muted px-2 py-1 rounded">
                      {service.boundary.split(' ')[0]}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
           {/* Runtime Infrastructure */}
           <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5 text-muted-foreground" />
                Infrastructure Providers
              </CardTitle>
              <CardDescription>
                Service adapters registered in the monorepo kernel.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {frameworkProviders.map((provider) => (
                  <div key={provider.key} className="flex flex-col gap-1 p-4 rounded-xl border bg-card/50">
                    <span className="font-medium">{provider.key}</span>
                    <span className="text-xs font-mono text-muted-foreground truncate">
                      {String((provider.value as any).url || "system:integrated")}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* System Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-secondary-foreground" />
                Kernel Logs
              </CardTitle>
              <CardDescription>
                Live events from the framework bootstrapper.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {bootLogs.slice(0, 8).map((entry, i) => (
                  <div key={i} className="flex gap-2 text-xs font-mono">
                    <span className="text-accent-foreground">[{entry.level}]</span>
                    <span className="text-muted-foreground truncate">{entry.message}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminShell>
  );
}
