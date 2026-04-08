/**
 * Parse a comma-separated CORS origins string into an array.
 * Mirrors Vim's parseCorsOrigins utility.
 */
export function parseCorsOrigins(value: string | undefined, defaults: string[] = []): string[] {
  if (!value) return defaults;
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/**
 * Check whether a request origin is allowed by the configured CORS list.
 */
export function isCorsAllowed(origin: string, allowedOrigins: string[]): boolean {
  return allowedOrigins.includes(origin);
}

/**
 * Build a combined allowed origins list from ADMIN_CORS and STORE_CORS env vars.
 * Falls back to local dev defaults when the env vars are not set.
 */
export function buildCorsOrigins(options?: {
  adminDefaults?: string[];
  storeDefaults?: string[];
}): string[] {
  const adminCors = parseCorsOrigins(
    process.env.ADMIN_CORS,
    options?.adminDefaults ?? ["http://localhost:7000", "http://localhost:7001"],
  );
  const storeCors = parseCorsOrigins(
    process.env.STORE_CORS,
    options?.storeDefaults ?? ["http://localhost:8000"],
  );
  return [...adminCors, ...storeCors];
}
