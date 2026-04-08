import { describe, expect, it } from "vitest";
import { defineWorkflow } from "./index";

describe("workflows", () => {
  it("runs workflow steps in order", async () => {
    const workflow = defineWorkflow("publish-site", [
      {
        name: "prepare",
        run: (context: { steps: string[] }) => ({
          steps: [...context.steps, "prepare"],
        }),
      },
      {
        name: "publish",
        run: (context: { steps: string[] }) => ({
          steps: [...context.steps, "publish"],
        }),
      },
    ]);

    await expect(workflow.run({ steps: [] })).resolves.toEqual({
      steps: ["prepare", "publish"],
    });
  });
});
