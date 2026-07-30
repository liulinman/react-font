import type {
  ContextLabAnswer,
  ContextLabAnswerState,
  ContextLabAnswerValue,
  ContextLabQuestionInput,
  ContextLabTfngValue,
} from "../types/learning";
import { normalizeContextLabQuestion } from "./contextLabContract";

const TFNG_VALUES = new Set<ContextLabTfngValue>([
  "True",
  "False",
  "Yes",
  "No",
  "Not Given",
]);

const getDraftKey = (sessionId: number) => `context-lab:draft:v2:${sessionId}`;

function isAnswerValue(value: unknown): value is ContextLabAnswerValue {
  if (!isPlainRecord(value)) return false;
  if (Object.keys(value).length !== 1) return false;
  if (typeof value.selectedIndex === "number") {
    return Number.isInteger(value.selectedIndex);
  }
  if (typeof value.selectedValue === "string") {
    return TFNG_VALUES.has(value.selectedValue as ContextLabTfngValue);
  }
  return typeof value.text === "string";
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeAnswerState(value: unknown): ContextLabAnswerState {
  if (!isPlainRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value).filter(([, answer]) => isAnswerValue(answer)),
  ) as ContextLabAnswerState;
}

function getLocalStorage() {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

export function isQuestionAnswered(
  questionInput: ContextLabQuestionInput,
  value: ContextLabAnswerValue | undefined,
) {
  if (!value) return false;
  const question = normalizeContextLabQuestion(questionInput);

  switch (question.responseType) {
    case "single_choice":
      return (
        typeof value.selectedIndex === "number" &&
        Number.isInteger(value.selectedIndex)
      );
    case "true_false_not_given":
      return (
        typeof value.selectedValue === "string" &&
        (question.options as readonly string[]).includes(value.selectedValue) &&
        TFNG_VALUES.has(value.selectedValue)
      );
    case "text_completion":
    case "short_answer":
      return typeof value.text === "string" && value.text.trim().length > 0;
    default:
      return false;
  }
}

export function buildSubmitAnswers(
  questions: ContextLabQuestionInput[],
  state: ContextLabAnswerState,
): ContextLabAnswer[] {
  return questions.flatMap<ContextLabAnswer>((questionInput) => {
    const question = normalizeContextLabQuestion(questionInput);
    const value = state[question.id];
    const responseType = question.responseType;
    if (!isQuestionAnswered(question, value)) return [];

    switch (responseType) {
      case "single_choice":
        return [
          {
            questionId: question.id,
            responseType,
            selectedIndex: (value as { selectedIndex: number }).selectedIndex,
          },
        ];
      case "true_false_not_given":
        return [
          {
            questionId: question.id,
            responseType,
            selectedValue: (value as { selectedValue: ContextLabTfngValue })
              .selectedValue,
          },
        ];
      case "text_completion":
      case "short_answer":
        return [
          {
            questionId: question.id,
            responseType,
            text: (value as { text: string }).text,
          },
        ];
    }
  });
}

export function countAnsweredQuestions(
  questions: ContextLabQuestionInput[],
  state: ContextLabAnswerState,
) {
  return questions.filter((question) =>
    isQuestionAnswered(question, state[question.id]),
  ).length;
}

export function loadContextLabDraft(sessionId: number): ContextLabAnswerState {
  const storage = getLocalStorage();
  if (!storage) return {};

  try {
    const raw = storage.getItem(getDraftKey(sessionId));
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return sanitizeAnswerState(parsed);
  } catch {
    return {};
  }
}

export function saveContextLabDraft(
  sessionId: number,
  state: ContextLabAnswerState,
) {
  const storage = getLocalStorage();
  if (!storage) return;

  try {
    storage.setItem(
      getDraftKey(sessionId),
      JSON.stringify(sanitizeAnswerState(state)),
    );
  } catch {
    // Storage can be unavailable in private browsing or when it is full.
  }
}

export function clearContextLabDraft(sessionId: number) {
  const storage = getLocalStorage();
  if (!storage) return;

  try {
    storage.removeItem(getDraftKey(sessionId));
  } catch {
    // Clearing a failed draft must not block submission or deletion.
  }
}
