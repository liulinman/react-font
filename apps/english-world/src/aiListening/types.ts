export interface CheckedWord {
  id: number;
  word: string;
  meaning: string;
  partSpeech: string;
  phonetic: string;
  example: string;
  version: string;
  validation?: {
    status: "valid" | "suspect" | "uncertain" | "pending" | "failed";
    reason: string;
    suggestion?: string;
  };
}
export interface Question {
  id: string;
  wordId: number;
  scene: string;
  gap: string;
  status: "ready" | "submitted" | "skipped";
  audioUrl: string;
  played: number;
  slow: number;
  revealed: boolean;
  audioMode?: "single" | "dual";
  attempts?: Array<{
    sequence: number;
    answer: string;
    correct: boolean;
    played: number;
    slow: number;
    revealed: boolean;
  }>;
  feedback?: {
    answer: string;
    transcript: string;
    explanation: string;
    synonyms: unknown;
    userAnswer: string;
    correct: boolean;
    independent: boolean;
  };
}
export interface Session {
  id: string;
  status: "review" | "listening" | "completed" | "failed";
  words: CheckedWord[];
  questions: Question[];
  error?: string;
  createdAt: string;
  updatedAt: string;
}
