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
};
export class VimsError extends Error {
    constructor(type, message) {
        super(message);
        this.name = "VimsError";
        this.type = type;
        this.date = new Date();
    }
}
VimsError.Types = VimsErrorTypes;
