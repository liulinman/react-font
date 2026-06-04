export type LearningLevel = 0 | 1 | 2 | 3;

export type LearningWord = {
  id: number;
  word: string;
  meaning?: string;
  level: LearningLevel;
  accuracy?: number;
  lastPracticedAt?: string | null;
};

export type LearningActionType = "review" | "listening" | "context" | "repair";

export type DailyCoachAction = {
  type: LearningActionType;
  title: string;
  description: string;
  wordIds: number[];
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

export type ContextLabGenerateParams =
  | {
      sourceType: "proficiency";
      proficiencyLevels: number[];
      count?: number;
    }
  | {
      sourceType: "random";
      count?: number;
    }
  | {
      sourceType: "custom";
      words: string[];
    };

export type ContextLabSubmitParams = {
  sessionId: number;
  answers: Array<{ questionId: string; selectedIndex: number }>;
};
