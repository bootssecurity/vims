export function createMockEventCollector() {
  const events: Array<{ name: string; payload: unknown }> = [];

  return {
    emit(name: string, payload: unknown) {
      events.push({ name, payload });
    },
    all() {
      return [...events];
    },
  };
}
