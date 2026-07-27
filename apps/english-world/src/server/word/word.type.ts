export type WordList = {
  id: number;
  englishWord: string;
  englishPhonetic?: string;
  englishType?: number;
  englishChinese?: string;
  englishNote?: string;
  englishLevel?: number;
  englishReference?: string;
  englishOverwriteCount?: number;
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
  updated?: number;
  updatedWords?: string[];
};

export type BulkImportWordsParams = {
  rawText: string;
  defaultLevel?: number;
  maxItems?: number;
  useAi?: boolean;
};

export type BulkImportAiFallbackReason =
  | "disabled"
  | "missing_api_key"
  | "empty_ai_response"
  | "invalid_ai_response"
  | "ai_request_failed";

export type BulkImportWordItem = Omit<WordList, "id"> & {
  status: "inserted" | "updated" | "existing" | "duplicate";
};

export type BulkImportPreviewItem = Omit<WordList, "id">;

export type BulkImportWordsPreviewResult = {
  receivedTextLength: number;
  extracted: number;
  aiEnhanced: boolean;
  aiFallbackReason?: BulkImportAiFallbackReason;
  items: BulkImportPreviewItem[];
};

export type BulkImportWordsResult = ImportMissingWordsResult & {
  receivedTextLength: number;
  extracted: number;
  aiEnhanced: boolean;
  aiFallbackReason?: BulkImportAiFallbackReason;
  items: BulkImportWordItem[];
  message: string;
};

export type OverwriteStatsParams = {
  page?: number;
  pageSize?: number;
};

export type OverwriteStatsResponse = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  list: WordList[];
};

export type IeltsCoreBand = "core" | "high" | "topic";

export type IeltsCoreSourceVerification =
  | "verified"
  | "ai_suggested"
  | "format_reference";

export type IeltsCoreSourceType =
  | "official-ielts"
  | "official-sample"
  | "journal"
  | "magazine"
  | "newspaper"
  | "online-resource"
  | "recent-event"
  | "topic-cluster"
  | "ai-analysis";

export type IeltsCoreSourceRef = {
  sourceType: IeltsCoreSourceType;
  title: string;
  publisher?: string;
  publishedAt?: string;
  url?: string;
  evidenceNote?: string;
  verificationStatus: IeltsCoreSourceVerification;
};

export type IeltsCoreReviewCandidate = {
  id: number;
  word: string;
  meaning?: string;
  level: number;
  coreBand: IeltsCoreBand;
  coreScore: number;
  examFrequencyScore?: number;
  reviewScore: number;
  matchedTopics: string[];
  sourceWindow?: string;
  sourceType?: string;
  sourceRefs?: IeltsCoreSourceRef[];
  reason: string;
};

export type IeltsCoreReviewParams = {
  proficiencyLevels?: number[];
  count?: number;
  useAi?: boolean;
};

export type IeltsCoreReviewResponse = {
  sourceType: "ielts-core";
  selectedLevels: number[];
  count: number;
  totalMatched: number;
  vocabulary?: IeltsCoreVocabularySummary;
  candidates: IeltsCoreReviewCandidate[];
};

export type IeltsCoreVocabularySummary = {
  totalActive: number;
  lastCollectedAt: string | null;
  sourceWindow: string | null;
};

export type IeltsCoreVocabularyRefreshParams = {
  limit?: number;
};

export type IeltsCoreVocabularyRefreshResult = {
  sourceType: "ai-daily" | "ai-manual" | "seed";
  requested: number;
  received: number;
  inserted: number;
  updated: number;
  skippedInvalid: number;
  totalActive: number;
  sourceWindow: string;
  message: string;
};

export type IeltsCoreVocabularyListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  band?: IeltsCoreBand;
  sourceType?: IeltsCoreSourceType;
  verificationStatus?: IeltsCoreSourceVerification;
  topic?: string;
};

export type IeltsCoreVocabularyItem = {
  word: string;
  translation?: string;
  definition?: string;
  exampleSentence?: string;
  band: IeltsCoreBand;
  importanceScore?: number;
  examFrequencyScore?: number;
  topics: string[];
  sourceWindow?: string;
  sourceType: string;
  sourceRefs: IeltsCoreSourceRef[];
  collectedAt: string | null;
  lastSeenAt: string | null;
};

export type IeltsCoreVocabularyListResponse = {
  page: number;
  pageSize: number;
  total: number;
  list: IeltsCoreVocabularyItem[];
};
