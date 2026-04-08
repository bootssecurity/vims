export function createMockEventCollector() {
    const events = [];
    return {
        emit(name, payload) {
            events.push({ name, payload });
        },
        all() {
            return [...events];
        },
    };
}
