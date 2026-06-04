import { describe, expect, it } from "vitest";
import { createMemoryClusters, summarizeMasteryLevels } from "./memoryMapAdapters";
import type { LearningWord } from "../types/learning";

describe("memoryMapAdapters", () => {
  it("turns weak words into low-mastery clusters", () => {
    const clusters = createMemoryClusters([
      { id: 1, word: "resilient", level: 0 },
      { id: 2, word: "recover", level: 2 },
    ]);

    expect(clusters).toEqual([
      expect.objectContaining({ wordId: 1, cluster: "low-mastery" }),
    ]);
  });

  it("summarizes mastery levels with all levels present", () => {
    const words: LearningWord[] = [
      { id: 1, word: "fragile", level: 0 },
      { id: 2, word: "steady", level: 3 },
    ];

    expect(summarizeMasteryLevels(words)).toEqual([
      { level: 0, count: 1 },
      { level: 1, count: 0 },
      { level: 2, count: 0 },
      { level: 3, count: 1 },
    ]);
  });
});
