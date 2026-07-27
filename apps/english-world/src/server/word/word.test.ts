import { describe, expect, it } from "vitest";
import {
  wordBulkImport,
  wordBulkImportPreview,
  wordOverwriteStats,
  wordIeltsCoreReview,
  wordIeltsCoreVocabularyList,
  wordIeltsCoreVocabularyRefresh,
  wordUpdateLevel,
} from "./word";

describe("wordUpdateLevel", () => {
  it("uses the narrow mastery update endpoint", () => {
    expect(wordUpdateLevel({ id: 21, englishLevel: 3 })).toEqual({
      url: "/english/updateEnglishWordLevel",
      method: "POST",
      data: { id: 21, englishLevel: 3 },
    });
  });
});

describe("wordBulkImport", () => {
  it("uses the AI bulk import endpoint", () => {
    expect(
      wordBulkImport({
        rawText: "mitigate\nresilient",
        defaultLevel: 0,
        maxItems: 80,
        useAi: true,
      }),
    ).toEqual({
      url: "/english/bulkImportWords",
      method: "POST",
      data: {
        rawText: "mitigate\nresilient",
        defaultLevel: 0,
        maxItems: 80,
        useAi: true,
      },
      __responseType: undefined,
    });
  });
});

describe("wordBulkImportPreview", () => {
  it("uses the AI bulk import preview endpoint", () => {
    expect(
      wordBulkImportPreview({
        rawText: "mitigate",
        defaultLevel: 0,
        useAi: true,
      }),
    ).toEqual({
      url: "/english/bulkImportWords/preview",
      method: "POST",
      data: {
        rawText: "mitigate",
        defaultLevel: 0,
        useAi: true,
      },
      __responseType: undefined,
    });
  });
});

describe("wordOverwriteStats", () => {
  it("uses the overwrite frequency stats endpoint", () => {
    expect(wordOverwriteStats({ page: 2, pageSize: 20 })).toEqual({
      url: "/english/overwriteStats",
      method: "POST",
      data: { page: 2, pageSize: 20 },
      __responseType: undefined,
    });
  });
});

describe("wordIeltsCoreReview", () => {
  it("uses the IELTS core review endpoint", () => {
    expect(
      wordIeltsCoreReview({
        proficiencyLevels: [0, 1],
        count: 8,
        useAi: true,
      }),
    ).toEqual({
      url: "/english/ieltsCoreReview",
      method: "POST",
      data: {
        proficiencyLevels: [0, 1],
        count: 8,
        useAi: true,
      },
      __responseType: undefined,
    });
  });
});

describe("wordIeltsCoreVocabularyRefresh", () => {
  it("uses the manual IELTS vocabulary refresh endpoint", () => {
    expect(wordIeltsCoreVocabularyRefresh({ limit: 120 })).toEqual({
      url: "/english/ieltsCoreVocabulary/refresh",
      method: "POST",
      data: { limit: 120 },
      __responseType: undefined,
    });
  });
});

describe("wordIeltsCoreVocabularyList", () => {
  it("uses the IELTS vocabulary source list endpoint", () => {
    expect(
      wordIeltsCoreVocabularyList({
        page: 1,
        pageSize: 10,
        search: "mitigate",
        band: "core",
        sourceType: "newspaper",
        verificationStatus: "verified",
      }),
    ).toEqual({
      url: "/english/ieltsCoreVocabulary/list",
      method: "POST",
      data: {
        page: 1,
        pageSize: 10,
        search: "mitigate",
        band: "core",
        sourceType: "newspaper",
        verificationStatus: "verified",
      },
      __responseType: undefined,
    });
  });
});
