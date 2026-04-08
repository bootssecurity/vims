import { defineModule } from "@vims/framework";
export const auditModule = defineModule({
    key: "audit",
    label: "Audit",
    owner: "packages/modules/audit",
    dependsOn: ["rbac"],
    register: ({ registerService, resolveProvider }) => {
        const events = resolveProvider("event-bus-local");
        const entries = [];
        function record(action, actor) {
            const entry = { action, actor };
            entries.push(entry);
            events.bus.emit("audit.recorded", entry);
            return entry;
        }
        registerService("audit.record", record);
        return {
            entries,
            record,
        };
    },
});
