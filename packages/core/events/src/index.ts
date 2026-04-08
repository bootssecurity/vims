export type VimsEvent<T = unknown> = {
  name: string;
  payload: T;
};

export type VimsEventSubscriber = (payload: unknown, eventName: string) => void | Promise<void>;

export function createEventBus() {
  const events: VimsEvent[] = [];
  const subscribers = new Map<string, Set<VimsEventSubscriber>>();

  return {
    emit<T>(name: string, payload: T) {
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
    subscribe(eventName: string, handler: VimsEventSubscriber) {
      let subs = subscribers.get(eventName);
      if (!subs) {
        subs = new Set();
        subscribers.set(eventName, subs);
      }
      subs.add(handler);
    },
    unsubscribe(eventName: string, handler: VimsEventSubscriber) {
      subscribers.get(eventName)?.delete(handler);
    },
    all() {
      return [...events];
    },
    count(name?: string) {
      return name ? events.filter((event) => event.name === name).length : events.length;
    },
  };
}
