/**
 * Parse a comma-separated CORS origins string into an array.
 * Mirrors Vim's parseCorsOrigins utility.
 */
export function parseCorsOrigins(value, defaults = []) {
    if (!value)
        return defaults;
    return value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);
}
/**
 * Check whether a request origin is allowed by the configured CORS list.
 */
export function isCorsAllowed(origin, allowedOrigins) {
    return allowedOrigins.includes(origin);
}
/**
 * Build a combined allowed origins list from ADMIN_CORS and STORE_CORS env vars.
 * Falls back to local dev defaults when the env vars are not set.
 */
export function buildCorsOrigins(options) {
    var _a, _b;
    const adminCors = parseCorsOrigins(process.env.ADMIN_CORS, (_a = options === null || options === void 0 ? void 0 : options.adminDefaults) !== null && _a !== void 0 ? _a : ["http://localhost:7000", "http://localhost:7001"]);
    const storeCors = parseCorsOrigins(process.env.STORE_CORS, (_b = options === null || options === void 0 ? void 0 : options.storeDefaults) !== null && _b !== void 0 ? _b : ["http://localhost:8000"]);
    return [...adminCors, ...storeCors];
}
