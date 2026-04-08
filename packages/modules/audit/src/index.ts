import { defineModule } from "@vims/framework";

export const auditModule = defineModule({
  key: "audit",
  label: "Audit",
  owner: "packages/modules/audit",
  dependsOn: ["rbac"],
  register: ({ registerService, resolveProvider }) => {
    const events = resolveProvider<{ bus: { emit: (name: string, payload: unknown) => void } }>(
      "event-bus-local",
    );

    const entries: Array<{ action: string; actor: string }> = [];

    function record(action: string, actor: string) {
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
