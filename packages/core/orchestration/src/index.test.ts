import { describe, expect, it } from "vitest";
import { createRemoteJoiner } from "./joiner";
import { createTransactionOrchestrator } from "./transaction";
import { createWorkflowManager } from "./workflow";

describe("@vims/orchestration", () => {
  it("merges records through the joiner", () => {
    const joiner = createRemoteJoiner();

    expect(joiner.merge({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
  });

  it("runs transactional steps", async () => {
    const orchestrator = createTransactionOrchestrator([
      {
        name: "step-1",
        invoke: (context: { count: number }) => ({ count: context.count + 1 }),
      },
      {
        name: "step-2",
        invoke: (context: { count: number }) => ({ count: context.count + 1 }),
      },
    ]);

    await expect(orchestrator.run({ count: 0 })).resolves.toEqual({ count: 2 });
  });

  it("registers workflows", () => {
    const manager = createWorkflowManager();
    manager.register({
      name: "publish-website",
      run: (input) => input,
    });

    expect(manager.list().map((workflow) => workflow.name)).toContain("publish-website");
  });
});
