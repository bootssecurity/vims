export declare const MedusaErrorTypes: {
    readonly DB_ERROR: "database_error";
    readonly DUPLICATE_ERROR: "duplicate_error";
    readonly INVALID_ARGUMENT: "invalid_argument";
    readonly INVALID_DATA: "invalid_data";
    readonly NOT_FOUND: "not_found";
    readonly UNEXPECTED_STATE: "unexpected_state";
    readonly UNAUTHORIZED: "unauthorized";
    readonly PAYMENT_AUTHORIZATION_ERROR: "payment_authorization_error";
    readonly CONFLICT: "conflict";
};
export type MedusaErrorType = (typeof MedusaErrorTypes)[keyof typeof MedusaErrorTypes];
export declare class MedusaError extends Error {
    type: MedusaErrorType;
    date: Date;
    static Types: {
        readonly DB_ERROR: "database_error";
        readonly DUPLICATE_ERROR: "duplicate_error";
        readonly INVALID_ARGUMENT: "invalid_argument";
        readonly INVALID_DATA: "invalid_data";
        readonly NOT_FOUND: "not_found";
        readonly UNEXPECTED_STATE: "unexpected_state";
        readonly UNAUTHORIZED: "unauthorized";
        readonly PAYMENT_AUTHORIZATION_ERROR: "payment_authorization_error";
        readonly CONFLICT: "conflict";
    };
    constructor(type: MedusaErrorType, message: string);
}
