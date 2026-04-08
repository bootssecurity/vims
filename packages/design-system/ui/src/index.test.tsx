import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Surface } from "./index";

describe("ui", () => {
  it("renders shared surface primitives", () => {
    render(
      <Surface>
        <div>Dealer module</div>
      </Surface>,
    );

    expect(screen.getByText("Dealer module")).toBeInTheDocument();
  });
});
