import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  ContextLabAnswer,
  ContextLabAnswerValue,
  ContextLabAttempt,
  ContextLabAttemptResult,
  ContextLabQuestion,
  ContextLabQuestionGroup,
  ContextLabSubmitParams,
  ContextLabSubmitResult,
  ContextLabTask,
} from "../types/learning";
import {
  parseContextLabAttemptAnswers,
  normalizeContextLabAttemptResults,
  normalizeContextLabAttemptResult,
  normalizeContextLabQuestion,
  normalizeContextLabQuestions,
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
  it("keeps answer value payloads mutually exclusive at compile time", () => {
    // @ts-expect-error mixed answer payloads are invalid draft values
    const mixedAnswerValue: ContextLabAnswerValue = {
      selectedIndex: 1,
      text: "also text",
    };

    expect(mixedAnswerValue).toBeDefined();
  });

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

  it("normalizes a historical V1 TFNG question to its semantic response type", () => {
    expect(
      normalizeContextLabQuestion({
        id: "q2",
        stem: "The project began in 2018.",
        options: ["True", "False", "Not Given"],
        questionType: "true_false_not_given",
      }),
    ).toEqual({
      id: "q2",
      groupId: "legacy-q2",
      stem: "The project began in 2018.",
      options: ["True", "False", "Not Given"],
      questionType: "true_false_not_given",
      responseType: "true_false_not_given",
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

  it("uses the matching legacy answer when a legacy result omits its user index", () => {
    const normalizeWithAnswers = normalizeContextLabAttemptResults as unknown as (
      results: unknown,
      answers: unknown,
    ) => ContextLabAttemptResult[];

    expect(
      normalizeWithAnswers(
        [
          {
            questionId: "q1",
            correct: false,
            correctIndex: 0,
            explanation: "Review paragraph B.",
          },
        ],
        [{ questionId: "q1", selectedIndex: 1 }],
      ),
    ).toEqual([
      {
        questionId: "q1",
        responseType: "single_choice",
        correct: false,
        status: "incorrect",
        userAnswer: { selectedIndex: 1 },
        correctAnswer: { correctIndex: 0 },
        correctIndex: 0,
        userSelectedIndex: 1,
        explanation: "Review paragraph B.",
      },
    ]);
  });

  it("maps a historical TFNG selected index to its semantic answer", () => {
    expect(
      parseContextLabAttemptAnswers(
        [{ questionId: "q5", selectedIndex: 2 }],
        [
          {
            id: "q5",
            groupId: "legacy-tfng",
            stem: "The policy was introduced in 2018.",
            questionType: "true_false_not_given",
            responseType: "true_false_not_given",
            options: ["True", "False", "Not Given"],
          },
        ],
      ),
    ).toEqual([
      {
        questionId: "q5",
        responseType: "true_false_not_given",
        selectedValue: "Not Given",
      },
    ]);
  });

  it("filters malformed discriminated questions before they enter page state", () => {
    const questions: unknown = [
      {
        id: "broken-choice",
        groupId: "choice",
        stem: "Missing options.",
        questionType: "detail",
        responseType: "single_choice",
      },
      {
        id: "valid-choice",
        groupId: "choice",
        stem: "Choose one.",
        questionType: "detail",
        responseType: "single_choice",
        options: ["A", "B"],
      },
      {
        id: "broken-summary-choice",
        stem:
          "The kiosks use (5) ____ for clarity while (6) ____ consumption is a concern.",
        questionType: "summary_completion",
        options: ["refund", "typography", "energy", "queue"],
      },
      {
        id: "broken-tfng",
        groupId: "tfng",
        stem: "Wrong semantic options.",
        questionType: "true_false_not_given",
        responseType: "true_false_not_given",
        options: ["True", "Maybe", "Not Given"],
      },
      {
        id: "broken-text",
        groupId: "text",
        stem: "Missing word limit.",
        questionType: "summary_completion",
        responseType: "text_completion",
      },
      {
        id: "valid-text",
        groupId: "text",
        stem: "Complete ____.",
        questionType: "summary_completion",
        responseType: "text_completion",
        wordLimit: 2,
      },
    ];

    expect(
      normalizeContextLabQuestions(
        questions as Parameters<typeof normalizeContextLabQuestions>[0],
      ),
    ).toEqual([
      {
        id: "valid-choice",
        groupId: "choice",
        stem: "Choose one.",
        questionType: "detail",
        responseType: "single_choice",
        options: ["A", "B"],
      },
      {
        id: "valid-text",
        groupId: "text",
        stem: "Complete ____.",
        questionType: "summary_completion",
        responseType: "text_completion",
        wordLimit: 2,
        options: [],
      },
    ]);
  });

  it("filters malformed discriminated results without dereferencing missing answers", () => {
    const results: unknown = [
      {
        questionId: "broken-choice",
        responseType: "single_choice",
        correct: false,
        status: "incorrect",
        userAnswer: { selectedIndex: 0 },
        explanation: "Missing correctAnswer.",
      },
      {
        questionId: "broken-tfng",
        responseType: "true_false_not_given",
        correct: false,
        status: "incorrect",
        userAnswer: { selectedValue: "Maybe" },
        correctAnswer: { correctValue: "True" },
        explanation: "Invalid user value.",
      },
      {
        questionId: "broken-status",
        responseType: "text_completion",
        correct: false,
        status: "maybe",
        userAnswer: { text: "solar panels" },
        correctAnswer: { acceptedAnswers: ["solar power"] },
        explanation: "Invalid status.",
      },
      {
        questionId: "broken-explanation",
        responseType: "short_answer",
        correct: false,
        status: "incorrect",
        userAnswer: { text: "solar panels" },
        correctAnswer: { acceptedAnswers: ["solar power"] },
      },
      {
        questionId: "valid-text",
        responseType: "text_completion",
        correct: true,
        status: "correct",
        userAnswer: { text: "solar panels" },
        correctAnswer: { acceptedAnswers: ["solar panels"] },
        explanation: "Found in paragraph A.",
      },
    ];

    expect(() =>
      normalizeContextLabAttemptResults(
        results as Parameters<typeof normalizeContextLabAttemptResults>[0],
      ),
    ).not.toThrow();
    expect(
      normalizeContextLabAttemptResults(
        results as Parameters<typeof normalizeContextLabAttemptResults>[0],
      ),
    ).toEqual([
      {
        questionId: "valid-text",
        responseType: "text_completion",
        correct: true,
        status: "correct",
        userAnswer: { text: "solar panels" },
        correctAnswer: { acceptedAnswers: ["solar panels"] },
        correctIndex: -1,
        userSelectedIndex: -1,
        explanation: "Found in paragraph A.",
      },
    ]);
  });

  it("rejects typed choice result indexes outside the parsed question options", () => {
    expect(
      normalizeContextLabAttemptResults(
        [
          {
            questionId: "q1",
            responseType: "single_choice",
            correct: false,
            status: "incorrect",
            userAnswer: { selectedIndex: 1 },
            correctAnswer: { correctIndex: 2 },
            explanation: "Out of range.",
          },
        ],
        [],
        [
          {
            id: "q1",
            groupId: "choice",
            stem: "Choose one.",
            questionType: "detail",
            responseType: "single_choice",
            options: ["A", "B"],
          },
        ],
      ),
    ).toEqual([]);
  });
});
