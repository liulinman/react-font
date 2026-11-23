export interface Question {
  instructions?: string;
  id: string;
  kind: "choice" | "true_false_not_given" | "matching_features" | "sentence_completion";
  maxWords?: number;
  stem: string;
  options: string[];
}
export interface PublicPractice {
  started?: boolean;
  instructions?: string;
  paragraphLabels?: string[];
  id: number;
  title: string;
  paragraphs: string[];
  questions: Question[];
  ieltsBand: number | null;
  status: "published" | "withdrawn";
  submitted: boolean;
}
export interface PracticeSummary {
  classroomName?: string;
  id: number;
  title: string;
  ieltsBand: number | null;
  questionCount: number;
  status: "published" | "withdrawn";
  submitted: boolean;
  publishedAt: string;
  score?: number | null;
}
export interface PracticeResult {
  originalResult?: PracticeResult;
  gradingRevision?: number;
  adjustments?: {
    id: string;
    questionId: string;
    reason: string;
    revision: number;
  }[];
  practiceId: number;
  submittedAt: string;
  score: number | null;
  correctCount: number;
  total: number;
  results: (Question & {
    voided?: boolean;
    selectedIndex?: number;
    correctIndex: number | null;
    answerText?: string;
    acceptedAnswers?: string[];
    correct: boolean;
    explanation: string;
    evidence: {
      paragraph: number;
      quote?: string;
      missingInformation?: string;
    };
  })[];
}
export interface Submission {
  requestUid: string;
  allowUnanswered?: true;
  elapsedSeconds?: number;
  answers: ({ questionId: string; selectedIndex: number } | { questionId: string; answerText: string } | { questionId: string; unanswered: true })[];
}

export function readingOptionLabel(kind: string, option: string, index: number) {
  return kind === "matching_features" && /^[A-T][.)\s]/.test(option)
    ? option : `${String.fromCharCode(65 + index)}. ${option}`;
}
