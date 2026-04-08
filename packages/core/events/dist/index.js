export function createEventBus() {
    const events = [];
    return {
        emit(name, payload) {
            const event = { name, payload };
            events.push(event);
            return event;
        },
        all() {
            return [...events];
        },
        count(name) {
            return name ? events.filter((event) => event.name === name).length : events.length;
        },
    };
}
