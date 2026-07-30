import type {
  ContextLabAnswer as ContextLabAnswerContract,
  ContextLabAnswerValue as ContextLabAnswerValueContract,
  ContextLabAttemptResult as ContextLabAttemptResultContract,
  ContextLabAttemptResultInput as ContextLabAttemptResultInputContract,
  ContextLabAttemptResultPayload as ContextLabAttemptResultPayloadContract,
  ContextLabLegacyAttemptResult as ContextLabLegacyAttemptResultContract,
  ContextLabLegacyQuestion as ContextLabLegacyQuestionContract,
  ContextLabQuestion as ContextLabQuestionContract,
  ContextLabQuestionGroup as ContextLabQuestionGroupContract,
  ContextLabQuestionInput as ContextLabQuestionInputContract,
  ContextLabQuestionPayload as ContextLabQuestionPayloadContract,
  ContextLabTfngValue,
} from "@/server/exerciseAgent/exerciseAgent";

export type ContextLabAnswer = ContextLabAnswerContract;
export type ContextLabAnswerValue = ContextLabAnswerValueContract;
export type ContextLabAnswerState = Record<string, ContextLabAnswerValue>;
export type ContextLabAttemptResult = ContextLabAttemptResultContract;
export type ContextLabAttemptResultInput = ContextLabAttemptResultInputContract;
export type ContextLabAttemptResultPayload =
  ContextLabAttemptResultPayloadContract;
export type ContextLabLegacyAttemptResult =
  ContextLabLegacyAttemptResultContract;
export type ContextLabLegacyQuestion = ContextLabLegacyQuestionContract;
export type ContextLabQuestion = ContextLabQuestionContract;
export type ContextLabQuestionGroup = ContextLabQuestionGroupContract;
export type ContextLabQuestionInput = ContextLabQuestionInputContract;
export type ContextLabQuestionPayload = ContextLabQuestionPayloadContract;
export type { ContextLabTfngValue };

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
  questionContractVersion?: ContextLabQuestionContractVersion;
};

export type ContextLabQuestionContractVersion = 1 | 2;

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
  | "summary_completion"
  | "short_answer";

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
  answers: ContextLabAnswer[];
};

export type ContextLabAttempt = {
  id: number;
  attemptId: number;
  taskId: number;
  articleExerciseId?: number;
  score: number;
  correctCount: number;
  wrongCount: number;
  weakWords: string[];
  nextSuggestions: string[];
  answers: ContextLabAnswer[];
  results: ContextLabAttemptResult[];
  elapsedSeconds?: number;
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
  results: ContextLabAttemptResult[];
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

export type ContextLabTask = {
  id: number;
  taskId: number;
  taskUid?: string;
  status: ContextLabTaskStatus;
  sourceType: ContextLabGenerateParams["sourceType"];
  words: string[];
  questionContractVersion?: ContextLabQuestionContractVersion;
  mode?: ContextLabMode;
  reciteSessionId?: number;
  articleExerciseId?: number;
  article?: string;
  groups?: ContextLabQuestionGroup[];
  questions?: ContextLabQuestion[];
  generationWarnings?: string[];
  targetQuestionCount?: number;
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
  questionContractVersion?: ContextLabQuestionContractVersion;
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
  questionContractVersion?: ContextLabQuestionContractVersion;
};
