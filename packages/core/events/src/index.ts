export type VimsEvent<T = unknown> = {
  name: string;
  payload: T;
};

export function createEventBus() {
  const events: VimsEvent[] = [];

  return {
    emit<T>(name: string, payload: T) {
      const event = { name, payload };
      events.push(event);
      return event;
    },
    all() {
      return [...events];
    },
    count(name?: string) {
      return name ? events.filter((event) => event.name === name).length : events.length;
    },
  };
}
