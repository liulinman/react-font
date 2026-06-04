import { describe, expect, it } from "vitest";
import { createCoachInsight, createFallbackCoachSummary } from "./coachPlanning";
import type { LearningWord } from "../types/learning";

describe("coachPlanning", () => {
  it("creates a useful fallback mission from weak words", () => {
    const weakWords: LearningWord[] = [
      { id: 1, word: "fragile", meaning: "脆弱的", level: 0 },
      { id: 2, word: "steady", meaning: "稳定的", level: 1 },
    ];

    const mission = createFallbackCoachSummary({
      totalWords: 2,
      weakWords,
    });

    expect(mission.totalWords).toBe(2);
    expect(mission.weakWords).toEqual(weakWords);
    expect(mission.suggestedActions[0]).toEqual(
      expect.objectContaining({
        type: "review",
        wordIds: [1, 2],
      }),
    );
  });

  it("creates a coach insight that reflects weak word pressure", () => {
    const insight = createCoachInsight({
      reciteAccuracy: 62,
      weakWords: [
        { id: 1, word: "resilient", level: 0 },
        { id: 2, word: "recover", level: 1 },
      ],
    });

    expect(insight.title).toContain("薄弱词");
    expect(insight.nextAction).toContain("语境");
  });
});
