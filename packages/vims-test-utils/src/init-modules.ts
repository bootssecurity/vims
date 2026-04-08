import { bootTestVimsApp } from "./index";

export function initModulesForTest(name = "init-modules-test") {
  return bootTestVimsApp({ name });
}
