import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WordCorrectionSuggestion } from "./WordCorrectionSuggestion";

afterEach(cleanup);

describe("WordCorrectionSuggestion", () => {
  it("renders an inflection suggestion and invokes both explicit actions", () => {
    const onUse = vi.fn();
    const onKeep = vi.fn();
    render(
      <WordCorrectionSuggestion
        input="running"
        candidate="run"
        status="inflected"
        reason="这是 run 的现在分词"
        onUse={onUse}
        onKeep={onKeep}
      />,
    );

    expect(screen.getByText(/检测到词形变化/)).toHaveTextContent(
      "running → run",
    );
    expect(screen.getByText("这是 run 的现在分词")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "使用建议" }));
    fireEvent.click(screen.getByRole("button", { name: "保留原词" }));
    expect(onUse).toHaveBeenCalledTimes(1);
    expect(onKeep).toHaveBeenCalledTimes(1);
  });

  it("renders a misspelling suggestion", () => {
    render(
      <WordCorrectionSuggestion
        input="recieve"
        candidate="receive"
        status="misspelled"
        reason="建议检查拼写"
        onUse={vi.fn()}
        onKeep={vi.fn()}
      />,
    );

    expect(screen.getByText(/可能拼写错误/)).toHaveTextContent(
      "recieve → receive",
    );
  });
});
