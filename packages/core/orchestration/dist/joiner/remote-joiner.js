export function createRemoteJoiner() {
    return {
        merge(left, right) {
            return Object.assign(Object.assign({}, left), right);
        },
    };
}
