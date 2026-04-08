import { createEventBus } from "@vims/events";
import { defineProvider } from "@vims/framework";
export const localEventBusProvider = defineProvider({
    key: "event-bus-local",
    label: "Local Event Bus",
    category: "events",
    register: () => ({
        key: "event-bus-local",
        bus: createEventBus(),
    }),
});
