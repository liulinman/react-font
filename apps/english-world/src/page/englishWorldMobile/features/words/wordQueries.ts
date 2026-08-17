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
  const canonical: MobileWordFilters = {
    page: filters.page,
    pageSize: filters.pageSize,
  };

  for (const key of [
    "search",
    "englishWord",
    "englishChinese",
    "englishPhonetic",
    "englishType",
    "englishLevel",
    "startTime",
    "endTime",
  ] as const) {
    if (filters[key] !== undefined) {
      canonical[key] = filters[key];
    }
  }

  return Object.freeze(canonical);
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
  const explicitFilters: Omit<MobileWordFilters, "page" | "pageSize" | "search"> = {};

  for (const key of [
    "englishWord",
    "englishChinese",
    "englishPhonetic",
    "englishType",
    "englishLevel",
    "startTime",
    "endTime",
  ] as const) {
    if (filters[key] !== undefined) {
      explicitFilters[key] = filters[key];
    }
  }

  return request<MobileWordPage>(
    wordFilter({
      page: filters.page,
      pageSize: filters.pageSize,
      ...quickFilters,
      ...explicitFilters,
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
