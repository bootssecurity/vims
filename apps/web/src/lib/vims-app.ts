import { loadVimsApp, loadVimsAppSnapshot } from "@vims/vims/loaders";

export async function bootVimsApp() {
  return loadVimsApp({
    name: "vims-web",
  });
}

export function getVimsLogger() {
  return loadVimsAppSnapshot({
    name: "vims-web",
  }).container.resolve<{
    all: () => Array<{ level: string; message: string }>;
  }>("logger");
}
