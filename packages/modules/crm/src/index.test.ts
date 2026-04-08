import { describe, expect, it } from "vitest";
import { defaultPipelineStages } from "./index";

describe("crm", () => {
  it("ships a sensible default sales pipeline", () => {
    expect(defaultPipelineStages).toEqual([
      "New Lead",
      "Contacted",
      "Appointment Set",
      "Negotiation",
      "Won / Delivered",
    ]);
  });
});
