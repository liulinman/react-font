import { describe, expect, it } from "vitest";
import { buildContextLabGenerateParams } from "./contextLabPlanning";

describe("buildContextLabGenerateParams", () => {
  it("builds a pasted article request with optional parsed questions", () => {
    expect(
      buildContextLabGenerateParams({
        sourceMode: "pasted-article",
        count: 20,
        customWords: "",
        pastedContent:
          "The passage explains how urban planners are adapting public transport to changing commuting habits.\n\nQuestions\n1. What trend does the passage describe?",
        pastedQuestionMode: "parse",
        pastedQuestionTypes: ["detail", "true_false_not_given"],
        pastedQuestionCount: 6,
        ieltsBand: 7.5,
        modelProvider: "gpt",
      }),
    ).toEqual({
      sourceType: "pasted-article",
      pastedContent:
        "The passage explains how urban planners are adapting public transport to changing commuting habits.\n\nQuestions\n1. What trend does the passage describe?",
      pastedQuestionMode: "parse",
      questionTypes: ["detail", "true_false_not_given"],
      questionCount: 6,
      ieltsBand: 7.5,
      modelProvider: "gpt",
    });
  });
});
