import { describe, expect, it } from "vitest";
import {
  buildContextLabGenerateParams,
  normalizePastedQuestionTypes,
} from "./contextLabPlanning";

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

  it("keeps short answer in the supported pasted-question request", () => {
    expect(
      normalizePastedQuestionTypes([
        "detail",
        "Short answer",
        "short_answer",
        "matching information",
      ]),
    ).toEqual(["detail", "short_answer", "matching_information"]);

    expect(
      buildContextLabGenerateParams({
        sourceMode: "pasted-article",
        count: 20,
        customWords: "",
        pastedContent: "A passage with questions.",
        pastedQuestionMode: "generate",
        pastedQuestionTypes: ["short_answer"],
        pastedQuestionCount: 4,
      }),
    ).toEqual(
      expect.objectContaining({
        questionTypes: ["short_answer"],
      }),
    );
  });
});
