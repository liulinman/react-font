import type { ContextLabGenerateParams } from "../types/learning";

export type MicroContextEntry = {
  mode: "micro";
  source: "recite-result";
  reciteSessionId: number;
  words: string[];
};

export function parseMicroContextEntry(search: string): MicroContextEntry | null {
  const params = new URLSearchParams(search);
  if (
    params.get("mode") !== "micro" ||
    params.get("source") !== "recite-result"
  ) {
    return null;
  }
  const reciteSessionId = Number(params.get("reciteSessionId"));
  const words = (params.get("words") ?? "")
    .split(",")
    .map((word) => word.trim())
    .filter(Boolean);
  const normalized = words.map((word) => word.toLowerCase());
  if (
    !Number.isInteger(reciteSessionId) ||
    reciteSessionId < 1 ||
    words.length < 1 ||
    words.length > 3 ||
    new Set(normalized).size !== words.length
  ) {
    return null;
  }
  return {
    mode: "micro",
    source: "recite-result",
    reciteSessionId,
    words,
  };
}

export function isInvalidMicroContextEntry(search: string) {
  const params = new URLSearchParams(search);
  return params.get("mode") === "micro" && parseMicroContextEntry(search) === null;
}

export function buildMicroGenerateParams(
  reciteSessionId: number,
  words: string[],
  requestUid?: string,
): ContextLabGenerateParams {
  return {
    sourceType: "custom",
    mode: "micro",
    reciteSessionId,
    words,
    ...(requestUid ? { requestUid } : {}),
  };
}
