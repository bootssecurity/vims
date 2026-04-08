import { describe, expect, it } from "vitest";
import { auditModule } from "./index";

describe("audit", () => {
  it("registers the audit module", () => {
    expect(auditModule.key).toBe("audit");
  });
});
