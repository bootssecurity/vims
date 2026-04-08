export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}
export * from "./errors.js";
export * from "./cors.js";
export * from "./database.js";
