import { describe, expect, it } from "vitest";
import { allow, definePolicy, deny } from "./index";

describe("policies", () => {
  it("evaluates policy handlers", () => {
    const policy = definePolicy<{ role: string }>(({ role }) =>
      role === "admin" ? allow() : deny("forbidden"),
    );

    expect(policy({ role: "admin" }).allowed).toBe(true);
    expect(policy({ role: "user" }).allowed).toBe(false);
  });
});
