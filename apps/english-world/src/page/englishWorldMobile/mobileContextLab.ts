import type { ExerciseResultItem } from "@/server/exerciseAgent/exerciseAgent";
import type { WordAgentItem } from "@/server/wordAgent/wordAgent";
import type { WordList } from "@/server/word/word.type";
import type { ContextLabTask } from "@/page/englishWorld/types/learning";

export type MobileArticleContent = {
  topic: string;
  paragraphs: string[];
};

export type MobileMarkedWord = Omit<WordList, "id"> & {
  key: string;
};

const EDGE_PUNCTUATION =
  /^[\s"'“”‘’.,!?;:()[\]{}<>，。！？；：（）【】]+|[\s"'“”‘’.,!?;:()[\]{}<>，。！？；：（）【】]+$/g;

export function parseMobileContextArticle(
  article: string,
): MobileArticleContent {
  const blocks = String(article ?? "")
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length <= 1) {
    return {
      topic: "",
      paragraphs: String(article ?? "")
        .split(/\n+/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean),
    };
  }

  return {
    topic: blocks[0],
    paragraphs: blocks.slice(1),
  };
}

export function cleanMobileSelectedText(text: string) {
  return String(text ?? "")
    .replace(/\s+/g, " ")
    .replace(EDGE_PUNCTUATION, "")
    .trim();
}

export function getMobileVocabularyKey(text: string) {
  return cleanMobileSelectedText(text).toLocaleLowerCase();
}

export function getMobileQuestionKey(question: { id?: string }, index: number) {
  const id = String(question.id ?? "").trim();
  return id || `q-${index}`;
}

export function findMobileQuestionResult(
  results: ExerciseResultItem[] | null,
  questionId: string,
) {
  return results?.find((result) => result.questionId === questionId);
}

export function buildMobileContextReference(
  task: ContextLabTask | null | undefined,
  word: string,
) {
  if (!task?.taskId) return "";

  const params = new URLSearchParams({ taskId: String(task.taskId) });
  if (task.articleExerciseId) {
    params.set("articleExerciseId", String(task.articleExerciseId));
  }
  params.set("word", cleanMobileSelectedText(word));
  return `/englishWorld/context-lab?${params.toString()}`;
}

export function buildMobileMarkedWord(
  text: string,
  task: ContextLabTask | null | undefined,
): MobileMarkedWord {
  const englishWord = cleanMobileSelectedText(text);

  return {
    key: getMobileVocabularyKey(englishWord),
    englishWord,
    englishType: englishWord.includes(" ") ? 1 : 0,
    englishLevel: 0,
    englishReference: buildMobileContextReference(task, englishWord),
    englishPartSpeech: [],
  };
}

export function mergeMobileImportPreview(
  base: MobileMarkedWord[],
  aiWords: WordAgentItem[],
): MobileMarkedWord[] {
  const aiByKey = new Map(
    aiWords.map((item) => [getMobileVocabularyKey(item.word), item]),
  );

  return base.map((item) => {
    const ai = aiByKey.get(item.key);
    if (!ai) return item;

    return {
      ...item,
      englishPhonetic: ai.phonetic || item.englishPhonetic,
      englishChinese: ai.meaning || item.englishChinese,
      englishPartSpeech: Array.isArray(ai.partOfSpeech)
        ? ai.partOfSpeech
        : item.englishPartSpeech,
    };
  });
}

export function toMobileImportPayload(
  item: MobileMarkedWord,
): Omit<WordList, "id"> {
  const englishWord = cleanMobileSelectedText(item.englishWord);

  return {
    englishWord,
    englishPhonetic: item.englishPhonetic,
    englishType: item.englishType ?? (englishWord.includes(" ") ? 1 : 0),
    englishChinese: item.englishChinese,
    englishNote: item.englishNote,
    englishLevel: item.englishLevel ?? 0,
    englishReference: item.englishReference,
    englishImg: item.englishImg,
    englishPartSpeech: item.englishPartSpeech,
  };
}
