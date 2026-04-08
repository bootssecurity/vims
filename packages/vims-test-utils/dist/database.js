export function createDatabaseTestContext() {
    var _a;
    return {
        connectionString: (_a = process.env.POSTGRES_URL) !== null && _a !== void 0 ? _a : "postgres://postgres:postgres@127.0.0.1:5432/vims",
        schema: "public",
    };
}
