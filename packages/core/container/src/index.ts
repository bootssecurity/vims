export function createContainer(initialValues = new Map<string, unknown>()) {
  const values = new Map<string, unknown>(initialValues);

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
    createScope() {
      // Returns an isolated clone inheriting the parent's resolved bindings
      return createContainer(values);
    }
  };
}
