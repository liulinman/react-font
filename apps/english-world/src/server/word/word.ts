import { YTRequest, type CommonRecord } from "@font/api";
import {
  BulkImportWordsParams,
  BulkImportWordsPreviewResult,
  BulkImportWordsResult,
  DailyStat,
  FilterWordList,
  IeltsCoreVocabularyListParams,
  IeltsCoreVocabularyListResponse,
  IeltsCoreVocabularyRefreshParams,
  IeltsCoreVocabularyRefreshResult,
  IeltsCoreReviewParams,
  IeltsCoreReviewResponse,
  ImportMissingWordsResult,
  ImportMissingWordsEnrichPreviewParams,
  ImportMissingWordsEnrichPreviewResult,
  ImportMissingWordsPreviewResult,
  OverwriteStatsParams,
  OverwriteStatsResponse,
  SourceFileDeleteResult,
  SourceFileUploadResult,
  WordList,
} from "./word.type";

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

export const wordImportMissing = (data: {
  words: Array<Omit<WordList, "id">>;
  overwriteExisting?: boolean;
}): YTRequest<ImportMissingWordsResult> => {
  return {
    url: "/english/importMissingWords",
    data,
    method: "POST",
    __responseType: undefined as unknown as ImportMissingWordsResult,
  };
};

export const wordImportMissingPreview = (data: {
  words: Array<Omit<WordList, "id">>;
}): YTRequest<ImportMissingWordsPreviewResult> => {
  return {
    url: "/english/importMissingWords/preview",
    data,
    method: "POST",
    __responseType: undefined as unknown as ImportMissingWordsPreviewResult,
  };
};

export const wordImportMissingEnrichPreview = (
  data: ImportMissingWordsEnrichPreviewParams,
): YTRequest<ImportMissingWordsEnrichPreviewResult> => {
  return {
    url: "/english/importMissingWords/enrich-preview",
    data,
    method: "POST",
    __responseType: undefined as unknown as ImportMissingWordsEnrichPreviewResult,
  };
};

export const wordBulkImport = (
  data: BulkImportWordsParams,
): YTRequest<BulkImportWordsResult> => {
  return {
    url: "/english/bulkImportWords",
    data,
    method: "POST",
    __responseType: undefined as unknown as BulkImportWordsResult,
  };
};

export const wordBulkImportPreview = (
  data: BulkImportWordsParams,
): YTRequest<BulkImportWordsPreviewResult> => {
  return {
    url: "/english/bulkImportWords/preview",
    data,
    method: "POST",
    __responseType: undefined as unknown as BulkImportWordsPreviewResult,
  };
};

export const wordOverwriteStats = (
  data: OverwriteStatsParams,
): YTRequest<OverwriteStatsResponse> => {
  return {
    url: "/english/overwriteStats",
    method: "POST",
    data,
    __responseType: undefined as unknown as OverwriteStatsResponse,
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

export const wordUpdateLevel = (data: {
  id: number;
  englishLevel: number;
}) => {
  return {
    url: "/english/updateEnglishWordLevel",
    method: "POST",
    data,
  };
};

export const wordIeltsCoreReview = (
  data: IeltsCoreReviewParams,
): YTRequest<IeltsCoreReviewResponse> => {
  return {
    url: "/english/ieltsCoreReview",
    method: "POST",
    data,
    __responseType: undefined as unknown as IeltsCoreReviewResponse,
  };
};

export const wordIeltsCoreVocabularyRefresh = (
  data: IeltsCoreVocabularyRefreshParams,
): YTRequest<IeltsCoreVocabularyRefreshResult> => {
  return {
    url: "/english/ieltsCoreVocabulary/refresh",
    method: "POST",
    data,
    __responseType: undefined as unknown as IeltsCoreVocabularyRefreshResult,
  };
};

export const wordIeltsCoreVocabularyList = (
  data: IeltsCoreVocabularyListParams,
): YTRequest<IeltsCoreVocabularyListResponse> => {
  return {
    url: "/english/ieltsCoreVocabulary/list",
    method: "POST",
    data,
    __responseType: undefined as unknown as IeltsCoreVocabularyListResponse,
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

export const sourceFileUpload = (
  data: FormData,
): YTRequest<SourceFileUploadResult> => {
  return {
    url: "/upload/source-file",
    method: "POST",
    data,
    __responseType: undefined as unknown as SourceFileUploadResult,
  };
};

export const sourceFileDelete = (
  storageName: string,
): YTRequest<SourceFileDeleteResult> => {
  return {
    url: `/upload/source-file/${encodeURIComponent(storageName)}`,
    method: "DELETE",
    __responseType: undefined as unknown as SourceFileDeleteResult,
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
