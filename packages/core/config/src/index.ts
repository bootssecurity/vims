export type VimsEnvironment = "development" | "test" | "production";

export type VimsRuntimeConfig = {
  name: string;
  environment: VimsEnvironment;
  postgresUrl: string;
  redisUrl: string;
  enableAdmin: boolean;
  enableTelemetry: boolean;
  enabledModules?: string[];
  enabledProviders?: string[];
  enabledPlugins?: string[];
};

function readCsvEnv(value?: string) {
  if (!value) {
    return undefined;
  }

  const entries = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return entries.length ? entries : undefined;
}

export function loadVimsConfig(
  overrides: Partial<VimsRuntimeConfig> = {},
): VimsRuntimeConfig {
  return {
    name: overrides.name ?? process.env.VIMS_APP_NAME ?? "vims",
    environment:
      overrides.environment ??
      (process.env.NODE_ENV === "production"
        ? "production"
        : process.env.NODE_ENV === "test"
          ? "test"
          : "development"),
    postgresUrl:
      overrides.postgresUrl ??
      process.env.POSTGRES_URL ??
      "postgres://postgres:postgres@127.0.0.1:5432/vims",
    redisUrl:
      overrides.redisUrl ??
      process.env.REDIS_URL ??
      "redis://127.0.0.1:6379",
    enableAdmin: overrides.enableAdmin ?? process.env.VIMS_ENABLE_ADMIN !== "false",
    enableTelemetry:
      overrides.enableTelemetry ?? process.env.VIMS_ENABLE_TELEMETRY === "true",
    enabledModules:
      overrides.enabledModules ?? readCsvEnv(process.env.VIMS_ENABLED_MODULES),
    enabledProviders:
      overrides.enabledProviders ?? readCsvEnv(process.env.VIMS_ENABLED_PROVIDERS),
    enabledPlugins:
      overrides.enabledPlugins ?? readCsvEnv(process.env.VIMS_ENABLED_PLUGINS),
  };
}
