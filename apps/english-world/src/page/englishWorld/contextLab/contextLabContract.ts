import type {
  ContextLabAnswer,
  ContextLabAttemptResult,
  ContextLabAttemptResultInput,
  ContextLabQuestion,
  ContextLabQuestionInput,
  ContextLabTfngValue,
} from "../types/learning";

const LEGACY_UNKNOWN_INDEX = -1;
const RESPONSE_TYPES = new Set([
  "single_choice",
  "true_false_not_given",
  "text_completion",
  "short_answer",
]);
const RESULT_STATUSES = new Set(["correct", "incorrect", "unanswered"]);
const RESULT_REASON_CODES = new Set([
  "word_limit_exceeded",
  "answer_mismatch",
]);
const TFNG_VALUES = new Set<ContextLabTfngValue>([
  "True",
  "False",
  "Yes",
  "No",
  "Not Given",
]);
const WORD_LIMITS = new Set([1, 2, 3]);

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return isInteger(value) && value >= 0;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === "string")
  );
}

function isOptionalString(value: unknown) {
  return value === undefined || typeof value === "string";
}

function isValidCompletionStem(stem: string) {
  return (stem.match(/_{3,}/g)?.length ?? 0) === 1;
}

function isSummaryCompletionType(value: unknown) {
  return (
    typeof value === "string" &&
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") === "summary_completion"
  );
}

function isTfngValue(value: unknown): value is ContextLabTfngValue {
  return (
    typeof value === "string" &&
    TFNG_VALUES.has(value as ContextLabTfngValue)
  );
}

function isTfngOptions(
  value: unknown,
): value is
  | ["True", "False", "Not Given"]
  | ["Yes", "No", "Not Given"] {
  if (!Array.isArray(value) || value.length !== 3) return false;
  return (
    (value[0] === "True" &&
      value[1] === "False" &&
      value[2] === "Not Given") ||
    (value[0] === "Yes" &&
      value[1] === "No" &&
      value[2] === "Not Given")
  );
}

function hasQuestionBase(value: Record<string, unknown>) {
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.stem === "string" &&
    value.stem.length > 0 &&
    isOptionalString(value.targetWord)
  );
}

function hasTypedQuestionBase(value: Record<string, unknown>) {
  return (
    hasQuestionBase(value) &&
    typeof value.groupId === "string" &&
    value.groupId.length > 0 &&
    typeof value.questionType === "string" &&
    value.questionType.length > 0
  );
}

export function parseContextLabQuestion(
  value: unknown,
): ContextLabQuestion | null {
  if (
    !isPlainRecord(value) ||
    typeof value.id !== "string" ||
    value.id.length === 0 ||
    !isOptionalString(value.targetWord)
  ) {
    return null;
  }

  const targetWord =
    typeof value.targetWord === "string"
      ? { targetWord: value.targetWord }
      : {};

  if (value.responseType === undefined) {
    const stem =
      typeof value.stem === "string" && value.stem
        ? value.stem
        : typeof value.question === "string" && value.question
          ? value.question
          : null;
    if (!stem || !isStringArray(value.options)) return null;
    if (
      isSummaryCompletionType(value.questionType) &&
      !isValidCompletionStem(stem)
    ) {
      return null;
    }
    if (
      value.questionType === "true_false_not_given" &&
      isTfngOptions(value.options)
    ) {
      return {
        id: value.id,
        groupId:
          typeof value.groupId === "string" && value.groupId
            ? value.groupId
            : `legacy-${String(value.id)}`,
        stem,
        questionType: "true_false_not_given",
        responseType: "true_false_not_given",
        options: value.options,
        ...targetWord,
      };
    }
    return {
      id: value.id,
      groupId:
        typeof value.groupId === "string" && value.groupId
          ? value.groupId
          : `legacy-${String(value.id)}`,
      stem,
      questionType:
        typeof value.questionType === "string" && value.questionType
          ? value.questionType
          : "detail",
      responseType: "single_choice",
      options: value.options,
      ...targetWord,
    };
  }

  if (
    typeof value.responseType !== "string" ||
    !RESPONSE_TYPES.has(value.responseType) ||
    !hasTypedQuestionBase(value)
  ) {
    return null;
  }

  const base = {
    id: value.id as string,
    groupId: value.groupId as string,
    stem: value.stem as string,
    questionType: value.questionType as string,
    ...targetWord,
  };

  switch (value.responseType) {
    case "single_choice":
      return isStringArray(value.options)
        ? {
            ...base,
            responseType: "single_choice",
            options: value.options,
          }
        : null;
    case "true_false_not_given":
      return isTfngOptions(value.options)
        ? {
            ...base,
            responseType: "true_false_not_given",
            options: value.options,
          }
        : null;
    case "text_completion":
      if (!isValidCompletionStem(base.stem)) return null;
      return isInteger(value.wordLimit) && WORD_LIMITS.has(value.wordLimit)
        ? {
            ...base,
            responseType: value.responseType,
            wordLimit: value.wordLimit as 1 | 2 | 3,
            options: [],
          }
        : null;
    case "short_answer":
      return isInteger(value.wordLimit) && WORD_LIMITS.has(value.wordLimit)
        ? {
            ...base,
            responseType: value.responseType,
            wordLimit: value.wordLimit as 1 | 2 | 3,
            options: [],
          }
        : null;
    default:
      return null;
  }
}

export function parseContextLabQuestions(value: unknown): ContextLabQuestion[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const question = parseContextLabQuestion(item);
    return question ? [question] : [];
  });
}

export function normalizeContextLabQuestion(
  question: ContextLabQuestionInput,
): ContextLabQuestion {
  const normalized = parseContextLabQuestion(question);
  if (!normalized) {
    throw new TypeError("Invalid Context Lab question");
  }
  return normalized;
}

export const normalizeContextLabQuestions = parseContextLabQuestions;

function findQuestion(
  questionId: string,
  questions: ContextLabQuestion[],
) {
  return questions.find((question) => question.id === questionId);
}

function isChoiceIndexValid(
  questionId: string,
  selectedIndex: unknown,
  questions: ContextLabQuestion[],
): selectedIndex is number {
  if (!isNonNegativeInteger(selectedIndex)) return false;
  const question = findQuestion(questionId, questions);
  if (!question) return true;
  return (
    question.responseType === "single_choice" &&
    selectedIndex < question.options.length
  );
}

export function parseContextLabAttemptAnswers(
  value: unknown,
  questionsInput?: unknown,
): ContextLabAnswer[] {
  if (!Array.isArray(value)) return [];
  const questions = parseContextLabQuestions(questionsInput);

  return value.flatMap<ContextLabAnswer>((item) => {
    if (
      !isPlainRecord(item) ||
      typeof item.questionId !== "string" ||
      item.questionId.length === 0
    ) {
      return [];
    }

    const questionId = item.questionId;
    if (item.responseType === undefined) {
      const question = findQuestion(questionId, questions);
      if (
        question?.responseType === "true_false_not_given" &&
        isNonNegativeInteger(item.selectedIndex) &&
        item.selectedIndex < question.options.length
      ) {
        return [
          {
            questionId,
            responseType: "true_false_not_given",
            selectedValue: question.options[
              item.selectedIndex
            ] as ContextLabTfngValue,
          },
        ];
      }
      return isChoiceIndexValid(
        questionId,
        item.selectedIndex,
        questions,
      )
        ? [
            {
              questionId,
              responseType: "single_choice",
              selectedIndex: item.selectedIndex as number,
            },
          ]
        : [];
    }

    switch (item.responseType) {
      case "single_choice":
        return isChoiceIndexValid(
          questionId,
          item.selectedIndex,
          questions,
        )
          ? [
              {
                questionId,
                responseType: "single_choice",
                selectedIndex: item.selectedIndex as number,
              },
            ]
          : [];
      case "true_false_not_given": {
        if (!isTfngValue(item.selectedValue)) return [];
        const question = findQuestion(questionId, questions);
        if (
          question &&
          (question.responseType !== "true_false_not_given" ||
            !(question.options as readonly ContextLabTfngValue[]).includes(
              item.selectedValue,
            ))
        ) {
          return [];
        }
        return [
          {
            questionId,
            responseType: "true_false_not_given",
            selectedValue: item.selectedValue,
          },
        ];
      }
      case "text_completion":
        return typeof item.text === "string" &&
          (!findQuestion(questionId, questions) ||
            findQuestion(questionId, questions)?.responseType ===
              "text_completion")
          ? [
              {
                questionId,
                responseType: "text_completion",
                text: item.text,
              },
            ]
          : [];
      case "short_answer":
        return typeof item.text === "string" &&
          (!findQuestion(questionId, questions) ||
            findQuestion(questionId, questions)?.responseType ===
              "short_answer")
          ? [
              {
                questionId,
                responseType: "short_answer",
                text: item.text,
              },
            ]
          : [];
      default:
        return [];
    }
  });
}

function getResultBase(value: Record<string, unknown>) {
  if (
    typeof value.questionId !== "string" ||
    value.questionId.length === 0 ||
    typeof value.correct !== "boolean" ||
    typeof value.status !== "string" ||
    !RESULT_STATUSES.has(value.status) ||
    typeof value.explanation !== "string" ||
    !isOptionalString(value.targetWord) ||
    (value.reasonCode !== undefined &&
      (typeof value.reasonCode !== "string" ||
        !RESULT_REASON_CODES.has(value.reasonCode)))
  ) {
    return null;
  }

  return {
    questionId: value.questionId,
    correct: value.correct,
    status: value.status as ContextLabAttemptResult["status"],
    explanation: value.explanation,
    ...(typeof value.targetWord === "string"
      ? { targetWord: value.targetWord }
      : {}),
    ...(typeof value.reasonCode === "string"
      ? {
          reasonCode: value.reasonCode as NonNullable<
            ContextLabAttemptResult["reasonCode"]
          >,
        }
      : {}),
  };
}

function findChoiceAnswer(
  questionId: string,
  answers: ContextLabAnswer[],
) {
  return answers.find(
    (answer) =>
      answer.questionId === questionId &&
      answer.responseType === "single_choice",
  );
}

function parseLegacyResult(
  value: Record<string, unknown>,
  answers: ContextLabAnswer[],
  questions: ContextLabQuestion[],
): ContextLabAttemptResult | null {
  if (
    typeof value.questionId !== "string" ||
    value.questionId.length === 0 ||
    typeof value.correct !== "boolean" ||
    !isOptionalString(value.explanation)
  ) {
    return null;
  }

  const fallbackAnswer = findChoiceAnswer(value.questionId, answers);
  const userSelectedIndex = isChoiceIndexValid(
    value.questionId,
    value.userSelectedIndex,
    questions,
  )
    ? value.userSelectedIndex
    : fallbackAnswer?.selectedIndex;
  const correctIndex = isChoiceIndexValid(
    value.questionId,
    value.correctIndex,
    questions,
  )
    ? value.correctIndex
    : LEGACY_UNKNOWN_INDEX;

  return {
    questionId: value.questionId,
    responseType: "single_choice",
    correct: value.correct,
    status: value.correct ? "correct" : "incorrect",
    userAnswer:
      userSelectedIndex === undefined ? null : { selectedIndex: userSelectedIndex },
    correctAnswer: { correctIndex },
    correctIndex,
    userSelectedIndex: userSelectedIndex ?? LEGACY_UNKNOWN_INDEX,
    explanation:
      typeof value.explanation === "string" ? value.explanation : "",
  };
}

function parseTypedResult(
  value: Record<string, unknown>,
  questions: ContextLabQuestion[],
): ContextLabAttemptResult | null {
  const base = getResultBase(value);
  if (!base) return null;

  switch (value.responseType) {
    case "single_choice": {
      if (
        !isPlainRecord(value.correctAnswer) ||
        !isChoiceIndexValid(
          base.questionId,
          value.correctAnswer.correctIndex,
          questions,
        )
      ) {
        return null;
      }
      if (
        value.userAnswer !== null &&
        (!isPlainRecord(value.userAnswer) ||
          !isChoiceIndexValid(
            base.questionId,
            value.userAnswer.selectedIndex,
            questions,
          ))
      ) {
        return null;
      }
      const correctIndex = value.correctAnswer.correctIndex as number;
      const userSelectedIndex: number =
        value.userAnswer === null
          ? LEGACY_UNKNOWN_INDEX
          : (value.userAnswer.selectedIndex as number);
      return {
        ...base,
        responseType: "single_choice",
        userAnswer:
          value.userAnswer === null ? null : { selectedIndex: userSelectedIndex },
        correctAnswer: { correctIndex },
        correctIndex,
        userSelectedIndex,
      };
    }
    case "true_false_not_given": {
      if (
        !isPlainRecord(value.correctAnswer) ||
        !isTfngValue(value.correctAnswer.correctValue)
      ) {
        return null;
      }
      if (
        value.userAnswer !== null &&
        (!isPlainRecord(value.userAnswer) ||
          !isTfngValue(value.userAnswer.selectedValue))
      ) {
        return null;
      }
      const question = findQuestion(base.questionId, questions);
      const correctValue = value.correctAnswer.correctValue;
      const selectedValue =
        value.userAnswer === null ? undefined : value.userAnswer.selectedValue;
      if (
        question &&
        (question.responseType !== "true_false_not_given" ||
          !(question.options as readonly ContextLabTfngValue[]).includes(
            correctValue,
          ) ||
          (selectedValue !== undefined &&
            !(question.options as readonly ContextLabTfngValue[]).includes(
              selectedValue as ContextLabTfngValue,
            )))
      ) {
        return null;
      }
      return {
        ...base,
        responseType: "true_false_not_given",
        userAnswer:
          selectedValue === undefined
            ? null
            : { selectedValue: selectedValue as ContextLabTfngValue },
        correctAnswer: { correctValue },
        correctIndex: LEGACY_UNKNOWN_INDEX,
        userSelectedIndex: LEGACY_UNKNOWN_INDEX,
      };
    }
    case "text_completion":
    case "short_answer": {
      const question = findQuestion(base.questionId, questions);
      if (
        (question && question.responseType !== value.responseType) ||
        !isPlainRecord(value.correctAnswer) ||
        !isStringArray(value.correctAnswer.acceptedAnswers)
      ) {
        return null;
      }
      if (
        value.userAnswer !== null &&
        (!isPlainRecord(value.userAnswer) ||
          typeof value.userAnswer.text !== "string")
      ) {
        return null;
      }
      return {
        ...base,
        responseType: value.responseType,
        userAnswer:
          value.userAnswer === null
            ? null
            : { text: value.userAnswer.text as string },
        correctAnswer: {
          acceptedAnswers: value.correctAnswer.acceptedAnswers,
        },
        correctIndex: LEGACY_UNKNOWN_INDEX,
        userSelectedIndex: LEGACY_UNKNOWN_INDEX,
      };
    }
    default:
      return null;
  }
}

export function parseContextLabAttemptResults(
  value: unknown,
  answersInput?: unknown,
  questionsInput?: unknown,
): ContextLabAttemptResult[] {
  if (!Array.isArray(value)) return [];
  const questions = parseContextLabQuestions(questionsInput);
  const answers = parseContextLabAttemptAnswers(answersInput, questions);

  return value.flatMap((item) => {
    if (!isPlainRecord(item)) return [];
    const result =
      item.responseType === undefined
        ? parseLegacyResult(item, answers, questions)
        : parseTypedResult(item, questions);
    return result ? [result] : [];
  });
}

export function normalizeContextLabAttemptResult(
  result: ContextLabAttemptResultInput,
): ContextLabAttemptResult {
  const normalized = parseContextLabAttemptResults([result])[0];
  if (!normalized) {
    throw new TypeError("Invalid Context Lab attempt result");
  }
  return normalized;
}

export const normalizeContextLabAttemptResults =
  parseContextLabAttemptResults;
