import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { DailyCoachSummary } from "../types/learning";
import { LearningSnapshot } from "./LearningSnapshot";

const summary: DailyCoachSummary = {
  totalWords: 513,
  todayNewWords: 4,
  reciteAccuracy: 84,
  levelDistribution: [],
  weakWords: [],
  suggestedActions: [],
};

describe("LearningSnapshot", () => {
  it("shows the already-loaded daily learning metrics", () => {
    render(<LearningSnapshot summary={summary} />);

    expect(
      screen.getByRole("region", { name: "学习概览" }),
    ).toBeInTheDocument();
    expect(screen.getByText("513")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("84%")).toBeInTheDocument();
  });
});
