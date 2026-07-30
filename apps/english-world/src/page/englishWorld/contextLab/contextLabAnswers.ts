import type {
  ContextLabAnswer,
  ContextLabAnswerState,
  ContextLabAnswerValue,
  ContextLabQuestion,
  ContextLabTfngValue,
} from "../types/learning";

const TFNG_VALUES = new Set<ContextLabTfngValue>([
  "True",
  "False",
  "Yes",
  "No",
  "Not Given",
]);

const getDraftKey = (sessionId: number) => `context-lab:draft:v2:${sessionId}`;

function getResponseType(question: ContextLabQuestion) {
  if (question.responseType) return question.responseType;
  return "options" in question && Array.isArray(question.options)
    ? "single_choice"
    : undefined;
}

function isAnswerValue(value: unknown): value is ContextLabAnswerValue {
  if (!isPlainRecord(value)) return false;
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

function getLocalStorage() {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

export function isQuestionAnswered(
  question: ContextLabQuestion,
  value: ContextLabAnswerValue | undefined,
) {
  if (!value) return false;

  switch (getResponseType(question)) {
    case "single_choice":
      return "selectedIndex" in value && Number.isInteger(value.selectedIndex);
    case "true_false_not_given":
      return (
        "selectedValue" in value &&
        "options" in question &&
        (question.options as readonly string[]).includes(value.selectedValue) &&
        TFNG_VALUES.has(value.selectedValue)
      );
    case "text_completion":
    case "short_answer":
      return "text" in value && value.text.trim().length > 0;
    default:
      return false;
  }
}

export function buildSubmitAnswers(
  questions: ContextLabQuestion[],
  state: ContextLabAnswerState,
): ContextLabAnswer[] {
  return questions.flatMap<ContextLabAnswer>((question) => {
    const value = state[question.id];
    const responseType = getResponseType(question);
    if (!responseType || !isQuestionAnswered(question, value)) return [];

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
  questions: ContextLabQuestion[],
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
    if (!isPlainRecord(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => isAnswerValue(value)),
    ) as ContextLabAnswerState;
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
    storage.setItem(getDraftKey(sessionId), JSON.stringify(state));
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
