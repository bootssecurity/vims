import { defineProvider } from "@vims/framework";
import { createMikroOrmConnection } from "@vims/framework";
export function createPostgresUrl() {
    var _a;
    return ((_a = process.env.POSTGRES_URL) !== null && _a !== void 0 ? _a : "postgres://127.0.0.1:5432/vims");
}
let cachedOrm = null;
export async function createPostgresClient() {
    if (!cachedOrm) {
        cachedOrm = await createMikroOrmConnection(createPostgresUrl(), [], false);
    }
    return cachedOrm;
}
export const postgresProvider = defineProvider({
    key: "database-postgres",
    label: "PostgreSQL",
    category: "database",
    register: () => {
        // Return a synchronously resolvable reference proxy
        return {
            key: "database-postgres",
            url: createPostgresUrl(),
            get manager() {
                if (!cachedOrm)
                    throw new Error("DB not booted");
                return cachedOrm.em.fork();
            },
            get orm() {
                if (!cachedOrm)
                    throw new Error("DB not booted");
                return cachedOrm;
            }
        };
    },
    boot: async () => {
        // Authenticate and allocate connection pool during framework startup Promise cascade
        await createPostgresClient();
    }
});
