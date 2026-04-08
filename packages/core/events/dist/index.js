export function createEventBus() {
    const events = [];
    const subscribers = new Map();
    return {
        emit(name, payload) {
            const event = { name, payload };
            events.push(event);
            const subs = subscribers.get(name);
            if (subs) {
                for (const handler of subs) {
                    void Promise.resolve(handler(payload, name));
                }
            }
            return event;
        },
        subscribe(eventName, handler) {
            let subs = subscribers.get(eventName);
            if (!subs) {
                subs = new Set();
                subscribers.set(eventName, subs);
            }
            subs.add(handler);
        },
        unsubscribe(eventName, handler) {
            var _a;
            (_a = subscribers.get(eventName)) === null || _a === void 0 ? void 0 : _a.delete(handler);
        },
        all() {
            return [...events];
        },
        count(name) {
            return name ? events.filter((event) => event.name === name).length : events.length;
        },
    };
}
