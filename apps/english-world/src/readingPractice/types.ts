export interface Question {
  instructions?: string;
  id: string;
  kind: "choice" | "true_false_not_given";
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
  ieltsBand: number;
  status: "published" | "withdrawn";
  submitted: boolean;
}
export interface PracticeSummary {
  id: number;
  title: string;
  ieltsBand: number;
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
    selectedIndex: number;
    correctIndex: number;
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
  answers: { questionId: string; selectedIndex: number }[];
}
