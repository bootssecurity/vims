import { describe, expect, it } from "vitest";

import {
  createWorkflowDefinition,
  createWorkflowRegistry,
  createWorkflowStep,
} from "./index";

describe("@vims/workflows-sdk", () => {
  it("creates workflow definitions and registries", async () => {
    const registry = createWorkflowRegistry();
    const workflow = createWorkflowDefinition("publish", [
      createWorkflowStep("flag", (context: { done: boolean }) => ({
        ...context,
        done: true,
      })),
    ]);

    registry.register(workflow);

    expect(await workflow.run({ done: false })).toEqual({ done: true });
    expect(registry.list()).toHaveLength(1);
  });
});
