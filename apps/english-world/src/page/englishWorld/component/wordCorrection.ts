import type { WordAgentItem } from "@/server/wordAgent/wordAgent";

export interface WordCompletionFormValues {
  englishWord: string;
  englishLevel: number;
  englishType: number;
  englishPhonetic?: string;
  englishPartSpeech?: number[];
  englishChinese?: string;
}

export type WordAgentResolution =
  | { kind: "auto-complete"; item: WordAgentItem }
  | {
      kind: "suggestion";
      input: string;
      candidate: string;
      status: "inflected" | "misspelled";
      reason: string;
      item: WordAgentItem;
    }
  | { kind: "ignore" };

export function normalizeWordInput(value: unknown) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getWordType(word: string) {
  return word.includes(" ") ? 1 : 0;
}

export function isLikelyEnglishLookupInput(value: string) {
  const text = normalizeWordInput(value);
  if (!text) return false;
  if (!/^[A-Za-z][A-Za-z\s'-]*$/.test(text)) return false;

  const letters = text.replace(/[^A-Za-z]/g, "");
  if (/^[aAiI]$/.test(letters)) return true;
  if (/^[A-Z]{2,8}$/.test(letters)) return true;
  if (["hmm", "shh", "psst"].includes(letters.toLocaleLowerCase())) {
    return true;
  }

  return /[aeiouy]/i.test(letters);
}

function hasFieldValue(value: unknown) {
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null && String(value).trim() !== "";
}

export function resolveWordAgentResult(
  item: WordAgentItem,
  lookupWord: string,
): WordAgentResolution {
  const input = normalizeWordInput(lookupWord);
  const candidate = normalizeWordInput(item.word);
  if (!input || !candidate) return { kind: "ignore" };

  const same = input.toLowerCase() === candidate.toLowerCase();
  if (item.inputStatus === undefined) {
    return same ? { kind: "auto-complete", item } : { kind: "ignore" };
  }
  if (item.inputStatus === "exact") {
    return same ? { kind: "auto-complete", item } : { kind: "ignore" };
  }
  if (item.inputStatus === "uncertain") return { kind: "ignore" };
  if (same || !/^[A-Za-z][A-Za-z'-]*$/.test(candidate)) {
    return { kind: "ignore" };
  }
  return {
    kind: "suggestion",
    input,
    candidate,
    status: item.inputStatus,
    reason:
      item.correctionReason?.trim() ||
      (item.inputStatus === "inflected"
        ? `建议使用词典原形 ${candidate}`
        : `建议检查拼写并使用 ${candidate}`),
    item,
  };
}

export function buildAiCompletionPatch(
  item: WordAgentItem,
  lookupWord: string,
  currentValues: WordCompletionFormValues,
  options: { preserveWordType: boolean },
): Partial<WordCompletionFormValues> {
  const patch: Partial<WordCompletionFormValues> = {};

  if (!hasFieldValue(currentValues.englishPhonetic) && item.phonetic) {
    patch.englishPhonetic = item.phonetic;
  }
  if (!hasFieldValue(currentValues.englishChinese) && item.meaning) {
    patch.englishChinese = item.meaning;
  }
  if (!hasFieldValue(currentValues.englishPartSpeech) && item.partOfSpeech?.length) {
    patch.englishPartSpeech = item.partOfSpeech;
  }
  if (currentValues.englishLevel === undefined || currentValues.englishLevel === null) {
    patch.englishLevel = 0;
  }
  if (!options.preserveWordType) {
    patch.englishType = getWordType(item.word || lookupWord);
  }

  return patch;
}
