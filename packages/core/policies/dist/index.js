export function allow() {
    return { allowed: true };
}
export function deny(reason) {
    return { allowed: false, reason };
}
export function definePolicy(handler) {
    return handler;
}
