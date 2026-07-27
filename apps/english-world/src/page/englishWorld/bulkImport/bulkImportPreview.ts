import type {
  BulkImportAiFallbackReason,
  BulkImportPreviewItem,
  ImportMissingWordsResult,
  WordList,
} from "@/server/word/word.type";
import { EnglishAbsorb } from "../enum";

export const TYPE_OPTIONS = [
  { value: 0, label: "单词" },
  { value: 1, label: "短语" },
  { value: 2, label: "句子" },
];

export const PART_SPEECH_OPTIONS = [
  { value: 1, label: "动词" },
  { value: 2, label: "名词" },
  { value: 3, label: "形容词" },
  { value: 4, label: "副词" },
  { value: 5, label: "代词" },
  { value: 6, label: "介词" },
  { value: 7, label: "连词" },
  { value: 8, label: "感叹词" },
  { value: 9, label: "未分类" },
];

const AI_FALLBACK_MESSAGES: Record<
  Exclude<BulkImportAiFallbackReason, "disabled">,
  string
> = {
  missing_api_key: "DEEPSEEK_API_KEY 未配置，已先用基础字段预览。",
  empty_ai_response:
    "AI 返回内容为空，已先用基础字段预览。请稍后重试，或先手动补充释义。",
  invalid_ai_response:
    "AI 返回内容不是可解析的词条 JSON，已先用基础字段预览。",
  ai_request_failed: "AI 补全请求失败，已先用基础字段预览。",
};

export function getLevelOptions() {
  return [0, 1, 2, 3].map((value) => ({
    value,
    label: EnglishAbsorb[value],
  }));
}

export function getBulkImportStatus(
  item: BulkImportPreviewItem,
  result: ImportMissingWordsResult,
) {
  if (result.insertedWords.includes(item.englishWord)) return "inserted";
  if (result.updatedWords?.includes(item.englishWord)) return "updated";
  if (result.skippedWords.includes(item.englishWord)) return "existing";
  return "duplicate";
}

export function getBulkImportMessage(result: ImportMissingWordsResult) {
  const updated = result.updated ?? 0;
  if (result.inserted > 0 || updated > 0) {
    return `已导入 ${result.inserted} 个词条，覆盖 ${updated} 个已存在词条，跳过 ${
      result.skippedExisting + result.skippedDuplicate
    } 个已有/重复词`;
  }
  return "这些词条都已存在或重复，无需重复导入";
}

export function getAiFallbackMessage(reason?: BulkImportAiFallbackReason) {
  if (!reason || reason === "disabled") return null;
  return AI_FALLBACK_MESSAGES[reason];
}

export function toBulkImportWordPayload(
  item: BulkImportPreviewItem,
  defaultLevel = 0,
): Omit<WordList, "id"> {
  const englishWord = item.englishWord.trim();

  return {
    englishWord,
    ...(item.englishPhonetic ? { englishPhonetic: item.englishPhonetic } : {}),
    ...(item.englishChinese ? { englishChinese: item.englishChinese } : {}),
    ...(item.englishNote ? { englishNote: item.englishNote } : {}),
    ...(item.englishReference
      ? { englishReference: item.englishReference }
      : {}),
    englishLevel: item.englishLevel ?? defaultLevel,
    englishType:
      item.englishType ?? (englishWord.includes(" ") ? 1 : 0),
    englishPartSpeech: item.englishPartSpeech?.length
      ? item.englishPartSpeech
      : [9],
  };
}
