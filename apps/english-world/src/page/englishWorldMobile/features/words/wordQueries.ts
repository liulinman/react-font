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
  sort?: "newest" | "oldest" | "alphabetical";
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
    ...(filters.sort !== undefined ? { sort: filters.sort } : {}),
  });
}

export const wordKeys = {
  all: ["mobile", "words"] as const,
  lists: ["mobile", "words", "list"] as const,
  list: (filters: MobileWordFilters) =>
    [...wordKeys.lists, canonicalizeFilters(filters)] as const,
  detail: (id: number) => [...wordKeys.all, "detail", id] as const,
};

export async function fetchMobileWords(
  filters: MobileWordFilters,
): Promise<MobileWordPage> {
  const search = filters.search?.trim() ?? "";
  const exactType = search === "单词" ? 0 : search === "短语" ? 1 : search === "句子" ? 2 : undefined;
  const exactLevel = search === "不会" ? 0 : search === "一般" ? 1 : search === "熟练" ? 2 : search === "精通" ? 3 : undefined;
  const isChineseSearch = /[\u3400-\u9fff]/.test(search);
  const quickFilters = normalizeMobileWordFilters(
    {
      englishType: filters.englishType ?? exactType,
      englishLevel: filters.englishLevel ?? exactLevel,
    },
    isChineseSearch || exactType !== undefined || exactLevel !== undefined ? "" : search,
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
        : isChineseSearch && exactType === undefined && exactLevel === undefined
          ? { englishChinese: search }
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
