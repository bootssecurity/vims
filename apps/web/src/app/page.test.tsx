import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Page from "./page";

describe("web app home page", () => {
  it("renders the modular architecture message", async () => {
    render(await Page());

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /VIMS is now structured for dealer-scale growth/i,
      }),
    ).toBeInTheDocument();
  });
});
