export interface PracticeConfig {
  title?: string;
  topic: string;
  wordCount: number;
  questionCount: number;
  ieltsBand: number;
  questionTypes: ("choice" | "true_false_not_given" | "sentence_completion")[];
  targetType: "all" | "selected";
  targetUserIds?: number[];
}
export interface PracticeContent {
  instructions?: string;
  paragraphLabels?: string[];
  title: string;
  paragraphs: string[];
  questions: {
    id: string;
    kind: string;
    stem: string;
    options: string[];
    instructions?: string;
    answerSource?: string;
    sourceRef?: string;
    originalText?: string;
    correctIndex: number | null;
    acceptedAnswers?: string[];
    maxWords?: number;
    explanation: string;
    evidence: {
      paragraph: number;
      quote?: string;
      missingInformation?: string;
    };
  }[];
}
export interface AdminPractice {
  workflow?: any;
  regradeJobs?: any[];
  id: number;
  title: string;
  status:
    | "queued"
    | "generating"
    | "draft"
    | "published"
    | "withdrawn"
    | "failed";
  config: PracticeConfig;
  content?: PracticeContent;
  createdAt: string;
  publishedAt?: string;
  recognizedQuestionCount?: number | null;
  failureSummary?: string;
  assignedCount: number;
  submittedCount: number;
}
export const practiceDefaults: PracticeConfig = {
  topic: "",
  wordCount: 400,
  questionCount: 5,
  ieltsBand: 6,
  questionTypes: ["choice", "true_false_not_given"],
  targetType: "all",
};
