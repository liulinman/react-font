export interface AnalyticsLearner {
  userId: number;
  username: string;
  accountStatus: string;
  status: "completed" | "in_progress" | "not_started";
  startedAt: string | null;
  submittedAt: string | null;
  score: number | null;
  correctCount: number | null;
  total: number | null;
  wrongCount: number | null;
  errorRate: number | null;
  dataIssue: string | null;
}
export interface AnalyticsQuestion {
  id: string;
  number: number;
  kind: string;
  stem: string;
  correctIndex: number;
  voided: boolean;
  submittedCount: number;
  correctCount: number | null;
  wrongCount: number | null;
  errorRate: number | null;
  wrongUserIds: number[];
  options: { text: string; count: number; percentage: number | null }[];
}
export interface ReadingAnalytics {
  practiceId: number;
  title: string;
  version: number;
  status: string;
  gradingRevision: number;
  generatedAt: string;
  summary: {
    assignedCount: number;
    completedCount: number;
    incompleteCount: number;
    notStartedCount: number;
    inProgressCount: number;
    completionRate: number | null;
    averageScore: number | null;
    validAttempts: number;
    wrongAttempts: number;
    errorRate: number | null;
    dataIssueCount: number;
  };
  learners: AnalyticsLearner[];
  questions: AnalyticsQuestion[];
}
export interface ReadingAnalyticsDetail {
  practiceId: number;
  title: string;
  version: number;
  gradingRevision: number;
  generatedAt: string;
  learner: AnalyticsLearner;
  paragraphs: string[];
  questions: {
    id: string;
    number: number;
    stem: string;
    options: string[];
    selectedIndex: number;
    correctIndex: number;
    correct: boolean;
    voided: boolean;
    explanation: string;
    evidence: {
      paragraph: number;
      quote?: string;
      missingInformation?: string;
    };
  }[];
}
export const getReadingAnalytics = (id: number) => ({
  url: `/admin/reading-practices/${id}/analytics`,
  method: "GET",
  __responseType: undefined as unknown as ReadingAnalytics,
});
export const getReadingAnalyticsDetail = (id: number, userId: number) => ({
  url: `/admin/reading-practices/${id}/analytics/users/${userId}`,
  method: "GET",
  __responseType: undefined as unknown as ReadingAnalyticsDetail,
});
