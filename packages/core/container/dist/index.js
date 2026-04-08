export function createContainer(initialValues = new Map()) {
    const values = new Map(initialValues);
    return {
        register(key, value) {
            values.set(key, value);
        },
        resolve(key) {
            if (!values.has(key)) {
                throw new Error(`Container value "${key}" is not registered`);
            }
            return values.get(key);
        },
        has(key) {
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
