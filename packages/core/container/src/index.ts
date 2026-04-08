export function createContainer() {
  const values = new Map<string, unknown>();

  return {
    register<T>(key: string, value: T) {
      values.set(key, value);
    },
    resolve<T>(key: string): T {
      if (!values.has(key)) {
        throw new Error(`Container value "${key}" is not registered`);
      }

      return values.get(key) as T;
    },
    has(key: string) {
      return values.has(key);
    },
    entries() {
      return [...values.entries()];
    },
  };
}
