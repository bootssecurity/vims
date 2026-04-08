function readCsvEnv(value) {
    if (!value) {
        return undefined;
    }
    const entries = value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
    return entries.length ? entries : undefined;
}
export function loadVimsConfig(overrides = {}) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    return {
        name: (_b = (_a = overrides.name) !== null && _a !== void 0 ? _a : process.env.VIMS_APP_NAME) !== null && _b !== void 0 ? _b : "vims",
        environment: (_c = overrides.environment) !== null && _c !== void 0 ? _c : (process.env.NODE_ENV === "production"
            ? "production"
            : process.env.NODE_ENV === "test"
                ? "test"
                : "development"),
        postgresUrl: (_e = (_d = overrides.postgresUrl) !== null && _d !== void 0 ? _d : process.env.POSTGRES_URL) !== null && _e !== void 0 ? _e : "postgres://postgres:postgres@127.0.0.1:5432/vims",
        redisUrl: (_g = (_f = overrides.redisUrl) !== null && _f !== void 0 ? _f : process.env.REDIS_URL) !== null && _g !== void 0 ? _g : "redis://127.0.0.1:6379",
        enableAdmin: (_h = overrides.enableAdmin) !== null && _h !== void 0 ? _h : process.env.VIMS_ENABLE_ADMIN !== "false",
        enableTelemetry: (_j = overrides.enableTelemetry) !== null && _j !== void 0 ? _j : process.env.VIMS_ENABLE_TELEMETRY === "true",
        enabledModules: (_k = overrides.enabledModules) !== null && _k !== void 0 ? _k : readCsvEnv(process.env.VIMS_ENABLED_MODULES),
        enabledProviders: (_l = overrides.enabledProviders) !== null && _l !== void 0 ? _l : readCsvEnv(process.env.VIMS_ENABLED_PROVIDERS),
        enabledPlugins: (_m = overrides.enabledPlugins) !== null && _m !== void 0 ? _m : readCsvEnv(process.env.VIMS_ENABLED_PLUGINS),
    };
}
