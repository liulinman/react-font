import type { ExerciseResultItem } from "@/server/exerciseAgent/exerciseAgent";

export type {
  ActivityEnvelopeV1,
  LearningAnswerV1,
  LearningMode,
  ListeningPublicItemV1,
  MasteryDimension,
  PublicLearningItemV1,
} from "../learning/contracts/activity-contract";
export type {
  CreateLearningSessionCommandV1,
  LearningAttemptResultSummaryV1,
  LearningCapabilitiesV1,
  LearningErrorCodeV1,
  LearningHintTypeV1,
  LearningModeCapabilityV1,
  LearningPlanPreviewV1,
  LearningSessionApiErrorV1,
  LearningSessionCommandV1,
  LearningSessionCreateResultV1,
  LearningSessionDetailCommandV1,
  LearningSessionDetailV1,
  LearningSessionSnapshotV1,
  LearningSessionStatusV1,
  LearningSessionTransitionResultV1,
  PreviewLearningSessionCommandV1,
  SubmitLearningAnswerV1,
  SubmitLearningAttemptCommandV1,
  SubmitLearningAttemptResultV1,
} from "../learning/contracts/learning-session";

export type LearningLevel = 0 | 1 | 2 | 3;

export type LearningWord = {
  id: number;
  word: string;
  meaning?: string;
  phonetic?: string;
  level: LearningLevel;
  accuracy?: number;
  lastPracticedAt?: string | null;
  journey?: WordJourney;
};

export type WordJourneyStage =
  | "needs_review"
  | "repairing"
  | "check_later"
  | "stabilizing"
  | "unavailable";

export type WordJourneyEvidenceType =
  | "recall_correct"
  | "recall_wrong"
  | "context_passed"
  | "context_retry";

export type WordJourneyEvidence = {
  type: WordJourneyEvidenceType;
  title: string;
  detail: string;
  occurredAt: string;
};

export type WordJourney = {
  wordId: number;
  stage: WordJourneyStage;
  label: string;
  reason: string;
  suggestedTiming: string;
  nextAction: {
    type: "review" | "context" | "wait";
    label: string;
    description: string;
  };
  evidence: WordJourneyEvidence[];
};

export type LearningActionType = "review" | "listening" | "context" | "repair";

export type DailyCoachAction = {
  type: LearningActionType;
  title: string;
  description: string;
  wordIds?: number[];
  estimatedMinutes: number;
};

export type DailyCoachSummary = {
  totalWords: number;
  todayNewWords: number;
  levelDistribution: Array<{ level: LearningLevel; count: number }>;
  reciteAccuracy: number;
  weakWords: LearningWord[];
  suggestedActions: DailyCoachAction[];
};

export type DailyCoachPlan = {
  tasks: Array<{
    type: LearningActionType;
    title: string;
    wordIds: number[];
    estimatedMinutes: number;
    reason: string;
  }>;
};

export type CoachInsight = {
  title: string;
  description: string;
  nextAction: string;
  tone: "success" | "warning" | "danger";
};

export type MemoryClusterType = "similar" | "low-mastery" | "recent-error";

export type MemoryMapOverview = {
  levels: Array<{ level: LearningLevel; count: number }>;
  dueWords: LearningWord[];
  weakWords: LearningWord[];
  recentMistakes: Array<{
    wordId: number;
    word: string;
    meaning?: string;
    mistakeCount: number;
    cluster: MemoryClusterType;
  }>;
  streakLikeStats: {
    recentSessions: number;
    recentAccuracy: number;
  };
};

export type MemoryMapWordDetailParams = {
  wordId: number;
};

export type MemoryMapUpdateLevelParams = {
  wordId: number;
  level: LearningLevel;
};

type ContextLabIeltsBandOptions = {
  ieltsBand?: number;
};

export type ContextLabModelProvider = "deepseek" | "gpt";

type ContextLabModelOptions = {
  modelProvider?: ContextLabModelProvider;
};

export type ContextLabQuestionType =
  | "vocabulary"
  | "paraphrase"
  | "detail"
  | "inference"
  | "main_idea"
  | "writer_view"
  | "matching_information"
  | "true_false_not_given"
  | "matching_headings"
  | "summary_completion";

export type ContextLabPastedQuestionMode = "auto" | "generate" | "parse";

export type ContextLabGenerateParams =
  | ({
      sourceType: "proficiency";
      proficiencyLevels: number[];
      count?: number;
    } & ContextLabIeltsBandOptions &
      ContextLabModelOptions)
  | ({
      sourceType: "ielts-core";
      proficiencyLevels?: number[];
      count?: number;
    } & ContextLabIeltsBandOptions &
      ContextLabModelOptions)
  | ({
      sourceType: "random";
      count?: number;
    } & ContextLabIeltsBandOptions &
      ContextLabModelOptions)
  | ({
      sourceType: "custom";
      words: string[];
      mode?: ContextLabMode;
      reciteSessionId?: number;
      requestUid?: string;
    } & ContextLabIeltsBandOptions &
      ContextLabModelOptions)
  | ({
      sourceType: "pasted-article";
      pastedContent: string;
      pastedQuestionMode?: ContextLabPastedQuestionMode;
      questionTypes?: ContextLabQuestionType[];
      questionCount?: number;
    } & ContextLabIeltsBandOptions &
      ContextLabModelOptions);

export type ContextLabMode = "standard" | "micro";

export type ContextLabSubmitParams = {
  sessionId: number;
  elapsedSeconds?: number;
  answers: Array<{ questionId: string; selectedIndex: number }>;
};

export type ContextLabAttempt = {
  id: number;
  attemptId: number;
  taskId: number;
  articleExerciseId: number;
  score: number;
  correctCount: number;
  wrongCount: number;
  weakWords: string[];
  nextSuggestions: string[];
  answers: Array<{ questionId: string; selectedIndex: number }>;
  results: ExerciseResultItem[];
  elapsedSeconds?: number | null;
  createTime?: string;
};

export type ContextLabAttemptHistoryParams = {
  taskId?: number;
  articleExerciseId?: number;
  page?: number;
  pageSize?: number;
};

export type ContextLabAttemptHistoryResponse = {
  list: ContextLabAttempt[];
  total: number;
  page: number;
  pageSize: number;
};

export type ContextLabAttemptDetailParams = {
  attemptId: number;
};

export type ContextLabDeleteAttemptParams = {
  attemptId: number;
};

export type ContextLabDeleteTaskParams = {
  taskId: number;
};

export type ContextLabDeleteResponse = {
  deleted: boolean;
};

export type ContextLabSubmitResult = {
  attemptId?: number;
  results: ExerciseResultItem[];
  score: number;
  correctCount: number;
  wrongCount: number;
  weakWords: string[];
  nextSuggestions: string[];
};

export type ContextLabInitialSource = {
  source?: "cockpit" | "result" | "recite-result";
  words: string[];
};

export type ContextLabTaskStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed";

export type ContextLabQuestion = {
  id: string;
  stem: string;
  options: string[];
  questionType?: string;
  targetWord?: string;
};

export type ContextLabTask = {
  id: number;
  taskId: number;
  taskUid?: string;
  status: ContextLabTaskStatus;
  sourceType: ContextLabGenerateParams["sourceType"];
  words: string[];
  mode?: ContextLabMode;
  reciteSessionId?: number;
  articleExerciseId?: number;
  article?: string;
  questions?: ContextLabQuestion[];
  attemptCount?: number;
  latestAttemptId?: number;
  latestScore?: number;
  latestWrongCount?: number;
  latestAttemptTime?: string;
  latestAttempt?: ContextLabAttempt;
  errorMessage?: string;
  createTime?: string;
  updateTime?: string;
  completeTime?: string;
};

export type ContextLabHistoryParams = {
  page?: number;
  pageSize?: number;
  status?: ContextLabTaskStatus;
  keyword?: string;
  sourceType?: ContextLabGenerateParams["sourceType"];
};

export type ContextLabHistoryResponse = {
  list: ContextLabTask[];
  total: number;
  page: number;
  pageSize: number;
};

export type ContextLabDetailParams = {
  taskId: number;
};
