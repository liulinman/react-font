import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  ContextLabAnswer,
  ContextLabAttempt,
  ContextLabAttemptResult,
  ContextLabQuestion,
  ContextLabQuestionGroup,
  ContextLabSubmitParams,
  ContextLabSubmitResult,
  ContextLabTask,
} from "../types/learning";
import {
  normalizeContextLabAttemptResult,
  normalizeContextLabQuestion,
} from "./contextLabContract";

function describeResult(result: ContextLabAttemptResult) {
  switch (result.responseType) {
    case "single_choice":
      return result.correctAnswer.correctIndex;
    case "true_false_not_given":
      return result.correctAnswer.correctValue;
    case "text_completion":
      return result.correctAnswer.acceptedAnswers.join(", ");
    case "short_answer":
      return result.correctAnswer.acceptedAnswers.join(", ");
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
}

describe("contextLabContract", () => {
  it("connects safe mixed unions to task, attempt, and submit results", () => {
    expectTypeOf<NonNullable<ContextLabTask["questions"]>>().toEqualTypeOf<
      ContextLabQuestion[]
    >();
    expectTypeOf<NonNullable<ContextLabTask["groups"]>>().toEqualTypeOf<
      ContextLabQuestionGroup[]
    >();
    expectTypeOf<ContextLabTask["generationWarnings"]>().toEqualTypeOf<
      string[] | undefined
    >();
    expectTypeOf<ContextLabTask["targetQuestionCount"]>().toEqualTypeOf<
      number | undefined
    >();
    expectTypeOf<ContextLabSubmitParams["answers"]>().toEqualTypeOf<
      ContextLabAnswer[]
    >();
    expectTypeOf<ContextLabAttempt["answers"]>().toEqualTypeOf<
      ContextLabAnswer[]
    >();
    expectTypeOf<ContextLabAttempt["results"]>().toEqualTypeOf<
      ContextLabAttemptResult[]
    >();
    expectTypeOf<ContextLabAttempt["articleExerciseId"]>().toEqualTypeOf<
      number | undefined
    >();
    expectTypeOf<ContextLabAttempt["elapsedSeconds"]>().toEqualTypeOf<
      number | undefined
    >();
    expectTypeOf<ContextLabSubmitResult["results"]>().toEqualTypeOf<
      ContextLabAttemptResult[]
    >();

    const shortAnswer: ContextLabAttemptResult = {
      questionId: "q4",
      responseType: "short_answer",
      correct: true,
      status: "correct",
      userAnswer: { text: "solar panels" },
      correctAnswer: { acceptedAnswers: ["solar panels"] },
      correctIndex: -1,
      userSelectedIndex: -1,
      explanation: "The phrase appears in paragraph C.",
    };

    expect(describeResult(shortAnswer)).toBe("solar panels");
  });

  it("normalizes a legacy options question to typed single choice", () => {
    expect(
      normalizeContextLabQuestion({
        id: "q1",
        stem: "Choose one.",
        options: ["A", "B"],
        questionType: "detail",
      }),
    ).toEqual({
      id: "q1",
      groupId: "legacy-q1",
      stem: "Choose one.",
      options: ["A", "B"],
      questionType: "detail",
      responseType: "single_choice",
    });
  });

  it("normalizes a legacy attempt row outside the safe result union", () => {
    expect(
      normalizeContextLabAttemptResult({
        questionId: "q1",
        correct: false,
        explanation: "Review paragraph B.",
      }),
    ).toEqual({
      questionId: "q1",
      responseType: "single_choice",
      correct: false,
      status: "incorrect",
      userAnswer: null,
      correctAnswer: { correctIndex: -1 },
      correctIndex: -1,
      userSelectedIndex: -1,
      explanation: "Review paragraph B.",
    });
  });
});
