export const MedusaErrorTypes = {
  DB_ERROR: "database_error",
  DUPLICATE_ERROR: "duplicate_error",
  INVALID_ARGUMENT: "invalid_argument",
  INVALID_DATA: "invalid_data",
  NOT_FOUND: "not_found",
  UNEXPECTED_STATE: "unexpected_state",
  UNAUTHORIZED: "unauthorized",
  PAYMENT_AUTHORIZATION_ERROR: "payment_authorization_error",
  CONFLICT: "conflict",
} as const;

export type MedusaErrorType = (typeof MedusaErrorTypes)[keyof typeof MedusaErrorTypes];

export class MedusaError extends Error {
  public type: MedusaErrorType;
  public date: Date;

  public static Types = MedusaErrorTypes;

  constructor(type: MedusaErrorType, message: string) {
    super(message);
    this.name = "MedusaError";
    this.type = type;
    this.date = new Date();
  }
}
