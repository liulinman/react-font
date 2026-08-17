import request from "@font/api";
import { wordFilter, wordFindList } from "@/server/word/word";
import type { FilterWordList, WordList } from "@/server/word/word.type";
import { normalizeMobileWordFilters } from "@/page/englishWorld/utils/wordFilters";

export type MobileWordFilters = {
  page: number;
  pageSize: number;
  search?: string;
  englishWord?: string;
  englishChinese?: string;
  englishPhonetic?: string;
  englishType?: number;
  englishLevel?: number;
  startTime?: string;
  endTime?: string;
};

type MobileWordFilterRequest = FilterWordList & {
  englishPhonetic?: string;
};

export type MobileWordPage = {
  list: WordList[];
  total: number;
  totalPages: number;
};

function canonicalizeFilters(filters: MobileWordFilters) {
  return Object.freeze({
    page: filters.page,
    pageSize: filters.pageSize,
    ...(filters.search !== undefined ? { search: filters.search } : {}),
    ...(filters.englishWord !== undefined
      ? { englishWord: filters.englishWord }
      : {}),
    ...(filters.englishChinese !== undefined
      ? { englishChinese: filters.englishChinese }
      : {}),
    ...(filters.englishPhonetic !== undefined
      ? { englishPhonetic: filters.englishPhonetic }
      : {}),
    ...(filters.englishType !== undefined
      ? { englishType: filters.englishType }
      : {}),
    ...(filters.englishLevel !== undefined
      ? { englishLevel: filters.englishLevel }
      : {}),
    ...(filters.startTime !== undefined ? { startTime: filters.startTime } : {}),
    ...(filters.endTime !== undefined ? { endTime: filters.endTime } : {}),
  });
}

export const wordKeys = {
  all: ["mobile", "words"] as const,
  list: (filters: MobileWordFilters) =>
    [...wordKeys.all, "list", canonicalizeFilters(filters)] as const,
  detail: (id: number) => [...wordKeys.all, "detail", id] as const,
};

export async function fetchMobileWords(
  filters: MobileWordFilters,
): Promise<MobileWordPage> {
  const quickFilters = normalizeMobileWordFilters(
    {
      englishType: filters.englishType,
      englishLevel: filters.englishLevel,
    },
    filters.search ?? "",
  );
  return request<MobileWordPage>(
    wordFilter({
      page: filters.page,
      pageSize: filters.pageSize,
      ...quickFilters,
      ...(filters.englishWord !== undefined
        ? { englishWord: filters.englishWord }
        : {}),
      ...(filters.englishChinese !== undefined
        ? { englishChinese: filters.englishChinese }
        : {}),
      ...(filters.englishPhonetic !== undefined
        ? { englishPhonetic: filters.englishPhonetic }
        : {}),
      ...(filters.englishType !== undefined
        ? { englishType: filters.englishType }
        : {}),
      ...(filters.englishLevel !== undefined
        ? { englishLevel: filters.englishLevel }
        : {}),
      ...(filters.startTime !== undefined
        ? { startTime: filters.startTime }
        : {}),
      ...(filters.endTime !== undefined ? { endTime: filters.endTime } : {}),
    } as MobileWordFilterRequest),
  );
}

export async function fetchMobileWordDetail(id: number): Promise<WordList> {
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("单词 ID 无效。");
  }

  const words = await request<WordList[]>(wordFindList());
  const word = words.find((item) => item.id === id);

  if (!word) {
    throw new Error("单词不存在或已被删除。");
  }

  return word;
}

export function findWordById(pages: MobileWordPage[], id: number) {
  return pages.flatMap((page) => page.list).find((word) => word.id === id) ?? null;
}
