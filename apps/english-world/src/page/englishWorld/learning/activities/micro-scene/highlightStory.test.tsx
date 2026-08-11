import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { highlightStory } from "./highlightStory";

describe("highlightStory", () => {
  afterEach(cleanup);

  it("renders matched targets as safe buttons while preserving plain text", () => {
    const onSelect = vi.fn();
    render(
      <p>
        {highlightStory(
          "She tried to suppress panic, but did not suppress the warning.",
          [{ wordId: 7, word: "suppress", meaning: "压制" }],
          onSelect,
        )}
      </p>,
    );

    const matches = screen.getAllByRole("button", { name: "查看 suppress 的词义" });
    expect(matches).toHaveLength(2);
    expect(screen.getByText(/She tried to/)).toBeInTheDocument();
    matches[0].click();
    expect(onSelect).toHaveBeenCalledWith(7);
  });

  it("does not interpret story text as HTML", () => {
    const { container } = render(
      <p>
        {highlightStory(
          "<img src=x onerror=alert(1)> suppress",
          [{ wordId: 7, word: "suppress", meaning: "压制" }],
          vi.fn(),
        )}
      </p>,
    );

    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText(/<img src=x/)).toBeInTheDocument();
  });
});
