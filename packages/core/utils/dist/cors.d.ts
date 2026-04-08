/**
 * Parse a comma-separated CORS origins string into an array.
 * Mirrors Vim's parseCorsOrigins utility.
 */
export declare function parseCorsOrigins(value: string | undefined, defaults?: string[]): string[];
/**
 * Check whether a request origin is allowed by the configured CORS list.
 */
export declare function isCorsAllowed(origin: string, allowedOrigins: string[]): boolean;
/**
 * Build a combined allowed origins list from ADMIN_CORS and STORE_CORS env vars.
 * Falls back to local dev defaults when the env vars are not set.
 */
export declare function buildCorsOrigins(options?: {
    adminDefaults?: string[];
    storeDefaults?: string[];
}): string[];
