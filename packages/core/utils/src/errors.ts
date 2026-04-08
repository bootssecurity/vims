export const VimsErrorTypes = {
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

export type VimsErrorType = (typeof VimsErrorTypes)[keyof typeof VimsErrorTypes];

export class VimsError extends Error {
  public type: VimsErrorType;
  public date: Date;

  public static Types = VimsErrorTypes;

  constructor(type: VimsErrorType, message: string) {
    super(message);
    this.name = "VimsError";
    this.type = type;
    this.date = new Date();
  }
}
