import { serviceExtractionPlan } from "@vims/types";
import { definePolicy } from "@vims/policies";
import { Surface } from "@vims/ui";
import { formatNumber } from "@vims/utils";
import { defineWorkflow } from "@vims/workflows";
import { bootVimsApp } from "@/lib/vims-app";

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
  const tenancyApi = runtime.modules.get("tenancy") as {
    resolveTenantMode: (hostname: string) => {
      label: string;
      description: string;
    };
  };
  const inventoryApi = runtime.modules.get("inventory") as {
    capabilities: string[];
  };
  const crmApi = runtime.modules.get("crm") as {
    pipelineStages: string[];
  };
  const websitesApi = runtime.modules.get("websites") as {
    sections: Array<{
      key: string;
      label: string;
      description: string;
    }>;
  };
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
    {
      label: "Primary deployable",
      value: "1 web app",
    },
    {
      label: "Bounded contexts",
      value: formatNumber(frameworkModules.length),
    },
    {
      label: "Service candidates",
      value: formatNumber(serviceExtractionPlan.length),
    },
    {
      label: "Website blocks",
      value: formatNumber(websitesApi.sections.length),
    },
    {
      label: "Runtime providers",
      value: formatNumber(frameworkProviders.length),
    },
    {
      label: "Boot logs",
      value: formatNumber(bootLogs.length),
    },
  ];
  const tenantMode = tenancyApi.resolveTenantMode("demo.vims.local");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10 lg:px-10">
      <section className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <Surface className="gap-6 p-8">
          <div className="inline-flex w-fit rounded-full border border-[color:var(--line)] bg-white/80 px-3 py-1 text-sm font-medium text-[color:var(--muted)]">
            Modular monolith first, microservices when justified
          </div>
          <div className="space-y-4">
            <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-[color:var(--foreground)] md:text-6xl">
              VIMS is now structured for dealer-scale growth instead of feature
              sprawl.
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-[color:var(--muted)]">
              The platform is split into domain packages with clear ownership for
              tenancy, inventory, CRM, website publishing, contracts, and shared
              UI. The web app stays the front door while API and worker services
              have a clean extraction path.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-4 py-5"
              >
                <div className="text-2xl font-semibold">{metric.value}</div>
                <div className="mt-1 text-sm text-[color:var(--muted)]">
                  {metric.label}
                </div>
              </div>
            ))}
          </div>
        </Surface>

        <Surface className="justify-between p-8">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[color:var(--muted)]">
              Tenant runtime
            </p>
            <h2 className="mt-3 text-2xl font-semibold">
              {tenantMode.label}
            </h2>
            <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">
              {tenantMode.description}
            </p>
          </div>

          <div className="rounded-2xl border border-dashed border-[color:var(--line)] bg-white/70 p-4">
            <div className="text-sm font-medium text-[color:var(--muted)]">
              Default CRM stages
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {crmApi.pipelineStages.map((stage) => (
                <span
                  key={stage}
                  className="rounded-full bg-[color:var(--background)] px-3 py-1 text-sm"
                >
                  {stage}
                </span>
              ))}
            </div>
          </div>
        </Surface>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Surface className="p-8">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Domain modules</h2>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                Packages that own business language, policies, and contracts.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {frameworkModules.map((module) => (
              <article
                key={module.key}
                className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-5"
              >
                <div className="text-lg font-semibold">{module.key}</div>
                <p className="mt-2 text-sm leading-7 text-[color:var(--muted)]">
                  Registered from the framework runtime with service-backed module
                  bootstrapping.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-[color:var(--foreground)]">
                  {Object.keys(module.value).map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </Surface>

        <Surface className="p-8">
          <h2 className="text-2xl font-semibold">Service extraction path</h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            These stay packages until operational pressure makes them worth
            deploying independently.
          </p>

          <div className="mt-5 space-y-4">
            {serviceExtractionPlan.map((service) => (
              <div
                key={service.name}
                className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-lg font-semibold">{service.name}</h3>
                  <span className="rounded-full bg-[color:var(--background)] px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-[color:var(--muted)]">
                    {service.trigger}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-7 text-[color:var(--muted)]">
                  {service.boundary}
                </p>
              </div>
            ))}
          </div>
        </Surface>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Surface className="p-8">
          <h2 className="text-2xl font-semibold">Inventory capabilities</h2>
          <div className="mt-4 grid gap-3">
            {inventoryApi.capabilities.map((capability) => (
              <div
                key={capability}
                className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-4 py-4 text-sm"
              >
                {capability}
              </div>
            ))}
          </div>
        </Surface>

        <Surface className="p-8">
          <h2 className="text-2xl font-semibold">Runtime providers</h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Providers are now registered in the framework kernel and exposed to
            modules through boot context.
          </p>
          <div className="mt-4 grid gap-3">
            {frameworkProviders.map((provider) => (
              <div
                key={provider.key}
                className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-4 py-4"
              >
                <div className="font-medium">{provider.key}</div>
                <div className="mt-1 text-sm text-[color:var(--muted)]">
                  {String(provider.value.url ?? "registered runtime provider")}
                </div>
              </div>
            ))}
          </div>
        </Surface>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Surface className="p-8">
          <h2 className="text-2xl font-semibold">Policies</h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Framework-level policy helpers now sit below modules and can be reused
            by auth, RBAC, admin, and API surfaces.
          </p>
          <div className="mt-4 rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-4 py-4 text-sm">
            {samplePolicy({ role: "dealer_admin" }).reason}
          </div>
        </Surface>

        <Surface className="p-8">
          <h2 className="text-2xl font-semibold">Workflows</h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Workflow primitives are now part of the core so publish, lead routing,
            and integration syncs can share the same runtime contract.
          </p>
          <div className="mt-4 rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-4 py-4 text-sm">
            {publishWorkflow.steps.map((step) => step.name).join(" -> ")}
          </div>
        </Surface>

        <Surface className="p-8">
          <h2 className="text-2xl font-semibold">Kernel logs</h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            The framework boot process now records structured runtime events
            through the core logger.
          </p>
          <div className="mt-4 grid gap-2">
            {bootLogs.slice(0, 4).map((entry) => (
              <div
                key={`${entry.level}-${entry.message}`}
                className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-4 py-3 text-sm"
              >
                {entry.level}: {entry.message}
              </div>
            ))}
          </div>
        </Surface>
      </section>

      <section className="grid gap-6 lg:grid-cols-1">
        <Surface className="p-8">
          <h2 className="text-2xl font-semibold">Website builder library</h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Drag and drop should edit typed section trees, not arbitrary HTML.
          </p>
          <div className="mt-4 grid gap-3">
            {websitesApi.sections.map((section) => (
              <div
                key={section.key}
                className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-4 py-4"
              >
                <div className="font-medium">{section.label}</div>
                <div className="mt-1 text-sm text-[color:var(--muted)]">
                  {section.description}
                </div>
              </div>
            ))}
          </div>
        </Surface>
      </section>
    </main>
  );
}
