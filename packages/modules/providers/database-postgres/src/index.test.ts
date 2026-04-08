import { describe, expect, it } from "vitest";
import { createPostgresUrl, postgresProvider } from "./index";

describe("database runtime", () => {
  it("provides local-first postgres defaults", () => {
    expect(createPostgresUrl()).toContain("127.0.0.1:5432/vims");
  });

  it("defines a postgres provider contract", () => {
    expect(postgresProvider.key).toBe("database-postgres");
  });
});
