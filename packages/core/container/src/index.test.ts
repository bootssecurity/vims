import { describe, expect, it } from "vitest";
import { createContainer } from "./index";

describe("container", () => {
  it("registers and resolves runtime values", () => {
    const container = createContainer();
    container.register("db", { kind: "postgres" });
    expect(container.resolve<{ kind: string }>("db").kind).toBe("postgres");
  });
});
