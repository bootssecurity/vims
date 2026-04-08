export function formatNumber(value) {
    return new Intl.NumberFormat("en-US").format(value);
}
export * from "./errors";
export * from "./cors";
export * from "./database";
