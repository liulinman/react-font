export type WordList = {
  id: number;
  englishWord: string;
  englishPhonetic?: string;
  englishType?: string;
  englishChinese?: string;
  englishNote?: string;
  englishLevel?: string;
  englishReference?: string;
  englishCreateTime?: string;
  englishUpdateTime?: string;
  englishImg?: string;
};

export type FilterWordList = {
  englishChinese?: string;
  englishWord?: string;
  englishType?: string;
  englishLevel?: string;
  startTime?: string;
  endTime?: string;
};
