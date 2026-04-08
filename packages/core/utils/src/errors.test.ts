import { describe, expect, it } from "vitest";
import { VimsError, VimsErrorTypes } from "./errors";

describe("VimsError", () => {
  it("constructs with correct type and message", () => {
    const err = new VimsError(VimsErrorTypes.NOT_FOUND, "Resource not found");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(VimsError);
    expect(err.type).toBe("not_found");
    expect(err.message).toBe("Resource not found");
    expect(err.name).toBe("VimsError");
    expect(err.date).toBeInstanceOf(Date);
  });

  it("exposes static Types reference", () => {
    expect(VimsError.Types.NOT_FOUND).toBe("not_found");
    expect(VimsError.Types.UNAUTHORIZED).toBe("unauthorized");
    expect(VimsError.Types.DUPLICATE_ERROR).toBe("duplicate_error");
    expect(VimsError.Types.DB_ERROR).toBe("database_error");
    expect(VimsError.Types.CONFLICT).toBe("conflict");
  });

  it("can be caught as a generic Error", () => {
    expect(() => {
      throw new VimsError(VimsErrorTypes.INVALID_ARGUMENT, "bad input");
    }).toThrow("bad input");
  });

  it("preserves different error types correctly", () => {
    const types: Array<keyof typeof VimsErrorTypes> = [
      "DB_ERROR", "DUPLICATE_ERROR", "INVALID_ARGUMENT", "INVALID_DATA",
      "NOT_FOUND", "UNEXPECTED_STATE", "UNAUTHORIZED", "PAYMENT_AUTHORIZATION_ERROR", "CONFLICT",
    ];

    for (const typeName of types) {
      const err = new VimsError(VimsErrorTypes[typeName], "test");
      expect(err.type).toBe(VimsErrorTypes[typeName]);
    }
  });
});
