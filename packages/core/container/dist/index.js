export function createContainer() {
    const values = new Map();
    return {
        register(key, value) {
            values.set(key, value);
        },
        resolve(key, options) {
            if (!values.has(key)) {
                if (options === null || options === void 0 ? void 0 : options.allowUnregistered) {
                    return undefined;
                }
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
    };
}
