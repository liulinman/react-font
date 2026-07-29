import type {
  ContextLabGenerateParams,
  ContextLabModelProvider,
  ContextLabPastedQuestionMode,
  ContextLabQuestionType,
} from "../types/learning";

export type ContextLabSourceMode =
  | "weak"
  | "proficiency"
  | "ielts-core"
  | "ielts-random"
  | "random"
  | "custom"
  | "pasted-article";

export const DEFAULT_IELTS_BAND = 7;
export const IELTS_BAND_MIN = 5;
export const IELTS_BAND_MAX = 9;
export const IELTS_BAND_STEP = 0.5;
export const DEFAULT_PASTED_QUESTION_COUNT = 8;
export const PASTED_QUESTION_COUNT_MIN = 1;
export const PASTED_QUESTION_COUNT_MAX = 13;
export const DEFAULT_CONTEXT_LAB_MODEL_PROVIDER: ContextLabModelProvider =
  "deepseek";
export const CONTEXT_LAB_SUPPORTED_QUESTION_TYPES: ContextLabQuestionType[] = [
  "detail",
  "paraphrase",
  "inference",
  "main_idea",
  "vocabulary",
  "true_false_not_given",
  "matching_headings",
  "summary_completion",
  "writer_view",
  "matching_information",
];

export function normalizeIeltsBand(value: unknown) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return DEFAULT_IELTS_BAND;

  const stepped = Math.round(numberValue / IELTS_BAND_STEP) * IELTS_BAND_STEP;
  return Math.min(IELTS_BAND_MAX, Math.max(IELTS_BAND_MIN, stepped));
}

export function normalizeContextLabModelProvider(
  value: unknown,
): ContextLabModelProvider {
  return value === "gpt" ? "gpt" : DEFAULT_CONTEXT_LAB_MODEL_PROVIDER;
}

export function normalizePastedQuestionMode(
  value: unknown,
): ContextLabPastedQuestionMode {
  return value === "generate" || value === "parse" ? value : "auto";
}

export function normalizePastedQuestionCount(value: unknown) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return DEFAULT_PASTED_QUESTION_COUNT;

  return Math.min(
    PASTED_QUESTION_COUNT_MAX,
    Math.max(PASTED_QUESTION_COUNT_MIN, Math.round(numberValue)),
  );
}

export function normalizePastedQuestionTypes(
  value: unknown,
): ContextLabQuestionType[] {
  if (!Array.isArray(value)) return [];
  const supported = new Set(CONTEXT_LAB_SUPPORTED_QUESTION_TYPES);
  const seen = new Set<ContextLabQuestionType>();

  value.forEach((item) => {
    const normalized = String(item ?? "")
      .trim()
      .toLowerCase()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    const questionType =
      normalized === "tfng"
        ? "true_false_not_given"
        : normalized === "yes_no_not_given"
          ? "true_false_not_given"
          : normalized;
    if (supported.has(questionType as ContextLabQuestionType)) {
      seen.add(questionType as ContextLabQuestionType);
    }
  });

  return Array.from(seen);
}

export function buildContextLabGenerateParams({
  sourceMode,
  count,
  customWords,
  proficiencyLevels,
  ieltsBand,
  modelProvider,
  pastedContent,
  pastedQuestionMode,
  pastedQuestionTypes,
  pastedQuestionCount,
}: {
  sourceMode: ContextLabSourceMode;
  count: number;
  customWords: string;
  proficiencyLevels?: number[];
  ieltsBand?: number | null;
  modelProvider?: ContextLabModelProvider;
  pastedContent?: string;
  pastedQuestionMode?: ContextLabPastedQuestionMode;
  pastedQuestionTypes?: ContextLabQuestionType[];
  pastedQuestionCount?: number | null;
}): ContextLabGenerateParams {
  const normalizedIeltsBand = normalizeIeltsBand(ieltsBand);
  const normalizedModelProvider =
    normalizeContextLabModelProvider(modelProvider);

  if (sourceMode === "ielts-random" || sourceMode === "random") {
    return {
      sourceType: "random",
      count,
      ieltsBand: normalizedIeltsBand,
      modelProvider: normalizedModelProvider,
    };
  }

  if (sourceMode === "proficiency") {
    return {
      sourceType: "proficiency",
      proficiencyLevels: proficiencyLevels?.length ? proficiencyLevels : [0, 1],
      count,
      ieltsBand: normalizedIeltsBand,
      modelProvider: normalizedModelProvider,
    };
  }

  if (sourceMode === "ielts-core") {
    return {
      sourceType: "ielts-core",
      proficiencyLevels: proficiencyLevels?.length ? proficiencyLevels : [0, 1],
      count,
      ieltsBand: normalizedIeltsBand,
      modelProvider: normalizedModelProvider,
    };
  }

  if (sourceMode === "custom") {
    return {
      sourceType: "custom",
      words: customWords
        .trim()
        .split(/[\s,，]+/)
        .filter(Boolean),
      ieltsBand: normalizedIeltsBand,
      modelProvider: normalizedModelProvider,
    };
  }

  if (sourceMode === "pasted-article") {
    return {
      sourceType: "pasted-article",
      pastedContent: String(pastedContent ?? "").trim(),
      pastedQuestionMode: normalizePastedQuestionMode(pastedQuestionMode),
      questionTypes: normalizePastedQuestionTypes(pastedQuestionTypes),
      questionCount: normalizePastedQuestionCount(pastedQuestionCount),
      ieltsBand: normalizedIeltsBand,
      modelProvider: normalizedModelProvider,
    };
  }

  return {
    sourceType: "proficiency",
    proficiencyLevels: [0, 1],
    count,
    ieltsBand: normalizedIeltsBand,
    modelProvider: normalizedModelProvider,
  };
}
