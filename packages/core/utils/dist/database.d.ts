/**
 * Structured Postgres/database error handler.
 * Maps Postgres error codes to clean HTTP error descriptors.
 * Mirrors Vim's handle-postgres-database-error utility.
 */
export declare function handlePostgresError(err: {
    code?: string;
    message?: string;
}): {
    statusCode: number;
    type: string;
    message: string;
};
