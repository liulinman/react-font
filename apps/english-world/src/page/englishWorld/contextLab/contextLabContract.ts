import type {
  ContextLabAttemptResult,
  ContextLabAttemptResultInput,
  ContextLabQuestion,
  ContextLabQuestionInput,
} from "../types/learning";

const LEGACY_UNKNOWN_INDEX = -1;

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

export function normalizeContextLabQuestion(
  question: ContextLabQuestionInput,
): ContextLabQuestion {
  if (!question.responseType) {
    return {
      ...question,
      groupId: question.groupId || `legacy-${question.id}`,
      questionType: question.questionType || "detail",
      responseType: "single_choice",
    };
  }

  if (
    question.responseType === "text_completion" ||
    question.responseType === "short_answer"
  ) {
    return {
      ...question,
      options: [],
    };
  }

  return question;
}

export function normalizeContextLabQuestions(
  questions: ContextLabQuestionInput[],
) {
  return questions.map(normalizeContextLabQuestion);
}

export function normalizeContextLabAttemptResult(
  result: ContextLabAttemptResultInput,
): ContextLabAttemptResult {
  if (!result.responseType) {
    const correctIndex = isInteger(result.correctIndex)
      ? result.correctIndex
      : LEGACY_UNKNOWN_INDEX;
    const userSelectedIndex = isInteger(result.userSelectedIndex)
      ? result.userSelectedIndex
      : LEGACY_UNKNOWN_INDEX;

    return {
      questionId: result.questionId,
      responseType: "single_choice",
      correct: result.correct,
      status: result.correct ? "correct" : "incorrect",
      userAnswer:
        userSelectedIndex === LEGACY_UNKNOWN_INDEX
          ? null
          : { selectedIndex: userSelectedIndex },
      correctAnswer: { correctIndex },
      correctIndex,
      userSelectedIndex,
      explanation: result.explanation || "",
    };
  }

  switch (result.responseType) {
    case "single_choice": {
      const correctIndex = result.correctAnswer.correctIndex;
      const userSelectedIndex =
        result.userAnswer?.selectedIndex ?? LEGACY_UNKNOWN_INDEX;
      return {
        ...result,
        correctIndex,
        userSelectedIndex,
      };
    }
    case "true_false_not_given":
    case "text_completion":
    case "short_answer":
      return {
        ...result,
        correctIndex: LEGACY_UNKNOWN_INDEX,
        userSelectedIndex: LEGACY_UNKNOWN_INDEX,
      };
  }
}

export function normalizeContextLabAttemptResults(
  results: ContextLabAttemptResultInput[],
) {
  return results.map(normalizeContextLabAttemptResult);
}
