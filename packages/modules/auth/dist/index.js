import { defineModule } from "@vims/framework";
export const authStrategies = ["password", "magic-link", "sso"];
export const authModule = defineModule({
    key: "auth",
    label: "Auth",
    owner: "packages/modules/auth",
    dependsOn: ["tenancy"],
    register: ({ registerService, resolveProvider }) => {
        const events = resolveProvider("event-bus-local");
        registerService("auth.strategies", authStrategies);
        events.bus.emit("auth.booted", { strategies: authStrategies });
        return {
            strategies: authStrategies,
            issueSessionToken(userId) {
                return `session:${userId}`;
            },
        };
    },
});
