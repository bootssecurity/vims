export declare const VimsErrorTypes: {
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
export type VimsErrorType = (typeof VimsErrorTypes)[keyof typeof VimsErrorTypes];
export declare class VimsError extends Error {
    type: VimsErrorType;
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
    constructor(type: VimsErrorType, message: string);
}
