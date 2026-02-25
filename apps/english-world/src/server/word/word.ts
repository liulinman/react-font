import { YTRequest, type CommonRecord } from "@font/api";
import { DailyStat, FilterWordList, WordList } from "./word.type";

export const wordFindList = () => {
  return {
    url: "/english/findWordList",
    method: "GET",
  };
};

export const wordAdd = (
  data: Omit<WordList, "id">
): YTRequest<CommonRecord> => {
  return {
    url: "/english/AddEnglishWord",
    data,
    method: "POST",
  };
};

export const wordDel = (data: { id: number }) => {
  return {
    url: "/english/delEnglishWord",
    method: "POST",
    data,
  };
};

export const wordExist = (data: { englishWord: string }) => {
  return {
    url: "/english/existEnglishWord",
    method: "POST",
    data,
  };
};

export const wordUpdate = (data: WordList) => {
  return {
    url: "/english/updateEnglishWord",
    method: "POST",
    data,
  };
};

export const wordFilter = (data: FilterWordList) => {
  return {
    url: "/english/filterWordList",
    method: "POST",
    data,
  };
};

export const uploadFile = (data: FormData) => {
  return {
    url: "/upload/file",
    method: "POST",
    data,
  };
};

export const englishStats = (data: {
  level: number;
}): YTRequest<{
  levelCount: number;
  totalCount: number;
  percentage: number;
  dailyStats: DailyStat[];
  partSpeechStatisticalClass: CommonRecord;
}> => {
  return {
    url: "/english/englishStats",
    method: "POST",
    data,
    __responseType: {} as {
      levelCount: number;
      totalCount: number;
      percentage: number;
      dailyStats: DailyStat[];
      partSpeechStatisticalClass: CommonRecord;
    },
  };
};
