export interface StartReciteParams {
  wordCount?: number;
  proficiencyLevels?: number[];
  types?: number[];
  direction?: number;
  wordIds?: number[];
}

export interface Question {
  wordId: number;
  question: string;
  direction: number;
}

export interface StartReciteResponse {
  questions: Question[];
  direction: number;
  totalCount: number;
}

export interface AnswerItem {
  wordId: number;
  userAnswer: string;
}

export interface SubmitAnswerParams {
  answers: AnswerItem[];
  direction: number;
}

export interface AnswerResult {
  wordId: number;
  englishWord: string;
  correctAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
}

export interface Statistics {
  totalCount: number;
  correctCount: number;
  errorCount: number;
  accuracy: number;
}

export interface DirectionStat {
  total: number;
  correct: number;
  accuracy: number;
}

export interface SubmitAnswerResponse {
  sessionId: number;
  direction?: number;
  results: AnswerResult[];
  statistics: Statistics;
}

export interface GetReciteSessionResultParams {
  sessionId: number;
}

export interface HistoryWordItem {
  id: number;
  wordId: number;
  englishWord: string;
  correctAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
  direction: number;
  createTime: string;
}

export interface ReciteSession {
  sessionId: number;
  wordCount: number;
  correctCount: number;
  errorCount: number;
  accuracy: number;
  direction: number;
  createTime: string;
  words: HistoryWordItem[];
}

export interface HistoryItem {
  id: number;
  userId: number;
  wordId: number;
  englishWord: string;
  correctAnswer: string;
  userAnswer: string;
  isCorrect: number;
  direction: number;
  createTime: string;
}

export interface GetHistoryParams {
  page: number;
  pageSize: number;
  direction?: number;
}

export interface GetHistoryResponse {
  list: ReciteSession[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface GetStatsParams {
  days?: number;
}

export interface GetStatsResponse {
  statistics: Statistics;
  directionStats: {
    [key: string]: DirectionStat;
  };
}
