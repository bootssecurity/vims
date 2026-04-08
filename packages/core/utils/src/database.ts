/**
 * Structured Postgres/database error handler.
 * Maps Postgres error codes to clean HTTP error descriptors.
 * Mirrors Vim's handle-postgres-database-error utility.
 */
export function handlePostgresError(err: {
  code?: string;
  message?: string;
}): { statusCode: number; type: string; message: string } {
  switch (err.code) {
    case "23505":
      return {
        statusCode: 409,
        type: "duplicate_error",
        message: "A record with these unique details already exists.",
      };
    case "23503":
      return {
        statusCode: 409,
        type: "conflict",
        message: "Referenced entity does not exist.",
      };
    case "23502":
      return {
        statusCode: 400,
        type: "invalid_data",
        message: "A required field is missing.",
      };
    default:
      return {
        statusCode: 500,
        type: "database_error",
        message: err.message || "An unexpected database error occurred.",
      };
  }
}
