import type { ContextLabGenerateParams } from "../types/learning";

export type ContextLabSourceMode = "weak" | "random" | "custom";

export function buildContextLabGenerateParams({
  sourceMode,
  count,
  customWords,
}: {
  sourceMode: ContextLabSourceMode;
  count: number;
  customWords: string;
}): ContextLabGenerateParams {
  if (sourceMode === "random") {
    return { sourceType: "random", count };
  }

  if (sourceMode === "custom") {
    return {
      sourceType: "custom",
      words: customWords
        .trim()
        .split(/[\s,，]+/)
        .filter(Boolean),
    };
  }

  return {
    sourceType: "proficiency",
    proficiencyLevels: [0, 1],
    count,
  };
}
