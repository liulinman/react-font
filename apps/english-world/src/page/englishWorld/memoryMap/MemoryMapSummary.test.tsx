import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryMapSummary } from "./MemoryMapSummary";

describe("MemoryMapSummary", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows weak words and memory clusters", () => {
    render(
      <MemoryMapSummary
        overview={{
          levels: [{ level: 0, count: 2 }],
          dueWords: [],
          weakWords: [{ id: 1, word: "fragile", level: 0 }],
          recentMistakes: [
            {
              wordId: 1,
              word: "fragile",
              mistakeCount: 2,
              cluster: "low-mastery",
            },
          ],
          streakLikeStats: { recentSessions: 3, recentAccuracy: 66 },
        }}
      />,
    );

    expect(screen.getByText(/fragile/)).toBeInTheDocument();
    expect(screen.getByText(/低掌握/)).toBeInTheDocument();
  });
});
