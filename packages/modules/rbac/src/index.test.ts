import { describe, expect, it } from "vitest";
import { defaultRoles } from "./index";

describe("rbac", () => {
  it("defines core roles", () => {
    expect(defaultRoles).toContain("dealer_admin");
  });
});
