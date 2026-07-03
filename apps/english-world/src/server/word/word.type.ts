export type WordList = {
  id: number;
  englishWord: string;
  englishPhonetic?: string;
  englishType?: number;
  englishChinese?: string;
  englishNote?: string;
  englishLevel?: number;
  englishReference?: string;
  englishCreateTime?: string;
  englishUpdateTime?: string;
  englishImg?: string;
  englishPartSpeech?: number[];
};

export type FilterWordList = {
  page: number;
  pageSize: number;
  englishChinese?: string;
  englishWord?: string;
  englishType?: number;
  englishLevel?: number;
  startTime?: string;
  endTime?: string;
};

export type DailyStat = {
  date: string;
  count: number;
};

export type ImportMissingWordsResult = {
  received: number;
  normalized: number;
  inserted: number;
  skippedExisting: number;
  skippedDuplicate: number;
  insertedWords: string[];
  skippedWords: string[];
};
