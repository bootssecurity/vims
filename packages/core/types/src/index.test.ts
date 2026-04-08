import { describe, expect, it } from "vitest";
import { domainModules, serviceExtractionPlan } from "./index";

describe("contracts", () => {
  it("defines stable domain module boundaries", () => {
    expect(domainModules.map((module) => module.name)).toEqual([
      "Tenancy",
      "Inventory",
      "CRM",
      "Websites",
      "Shared UI",
      "Contracts",
    ]);
  });

  it("documents service extraction candidates", () => {
    expect(serviceExtractionPlan).toHaveLength(3);
    expect(serviceExtractionPlan[0]?.name).toBe("Inventory Ingestion Service");
  });
});
