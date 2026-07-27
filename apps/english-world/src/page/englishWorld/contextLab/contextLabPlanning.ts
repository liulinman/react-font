import type {
  ContextLabGenerateParams,
  ContextLabModelProvider,
} from "../types/learning";

export type ContextLabSourceMode =
  | "weak"
  | "proficiency"
  | "ielts-core"
  | "ielts-random"
  | "random"
  | "custom";

export const DEFAULT_IELTS_BAND = 7;
export const IELTS_BAND_MIN = 5;
export const IELTS_BAND_MAX = 9;
export const IELTS_BAND_STEP = 0.5;
export const DEFAULT_CONTEXT_LAB_MODEL_PROVIDER: ContextLabModelProvider =
  "deepseek";

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

export function buildContextLabGenerateParams({
  sourceMode,
  count,
  customWords,
  proficiencyLevels,
  ieltsBand,
  modelProvider,
}: {
  sourceMode: ContextLabSourceMode;
  count: number;
  customWords: string;
  proficiencyLevels?: number[];
  ieltsBand?: number | null;
  modelProvider?: ContextLabModelProvider;
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

  return {
    sourceType: "proficiency",
    proficiencyLevels: [0, 1],
    count,
    ieltsBand: normalizedIeltsBand,
    modelProvider: normalizedModelProvider,
  };
}
