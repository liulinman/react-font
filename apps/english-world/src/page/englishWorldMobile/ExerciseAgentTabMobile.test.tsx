import "antd-mobile/es/global";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExerciseAgentTabMobile } from "./ExerciseAgentTabMobile";

vi.mock("@font/api", () => ({
  default: vi.fn(),
  getApiBaseUrl: () => "/api",
}));

describe("ExerciseAgentTabMobile", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders generated practice as a mobile reading workflow", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          headers: {
            get: () => "application/json",
          },
          json: () =>
            Promise.resolve({
              data: {
                sessionId: 7,
                article:
                  "Urban Farming\n\nUrban farming improves local food supply.\n\nIt helps communities reuse empty rooftops.",
                words: ["urban farming", "supply", "rooftop"],
                questions: [
                  {
                    id: "q1",
                    stem: "What is the passage mainly about?",
                    options: ["Urban farming", "Ocean travel"],
                  },
                ],
              },
            }),
        }),
      ),
    );

    render(<ExerciseAgentTabMobile />);

    await user.click(screen.getByRole("button", { name: "生成练习" }));

    expect(await screen.findByRole("region", { name: "练习概览" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "阅读材料" })).toBeInTheDocument();
    expect(screen.getByText("Urban Farming")).toBeInTheDocument();
    expect(screen.getByText("Urban farming improves local food supply.")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "选择题作答区" })).toBeInTheDocument();
    expect(screen.getByText("已答 0/1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "提交答案" })).toBeInTheDocument();
  });
});
