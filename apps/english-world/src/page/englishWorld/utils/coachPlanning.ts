import type {
  CoachInsight,
  DailyCoachSummary,
  LearningWord,
} from "../types/learning";

type FallbackCoachInput = {
  totalWords: number;
  weakWords: LearningWord[];
  todayNewWords?: number;
  reciteAccuracy?: number;
};

export function createFallbackCoachSummary({
  totalWords,
  weakWords,
  todayNewWords = 0,
  reciteAccuracy = 0,
}: FallbackCoachInput): DailyCoachSummary {
  const wordIds = weakWords.map((word) => word.id);

  return {
    totalWords,
    todayNewWords,
    reciteAccuracy,
    levelDistribution: summarizeWeakLevels(weakWords),
    weakWords,
    suggestedActions: [
      {
        type: "review",
        title: "完成今日薄弱词复习",
        description: "先用一组短复习稳定住低掌握度单词。",
        wordIds,
        estimatedMinutes: Math.max(3, Math.min(12, weakWords.length)),
      },
      {
        type: "context",
        title: "把薄弱词放进语境练习",
        description: "用这些词生成雅思阅读和选择题，避免只背中文释义。",
        wordIds: wordIds.slice(0, 8),
        estimatedMinutes: 6,
      },
    ],
  };
}

export function createCoachInsight(input: {
  reciteAccuracy: number;
  weakWords: LearningWord[];
}): CoachInsight {
  const weakCount = input.weakWords.length;

  if (weakCount > 0) {
    return {
      title: `还有 ${weakCount} 个薄弱词需要修复`,
      description: "今天先处理低掌握度单词，完成一轮短复习后再进入语境练习。",
      nextAction: "把薄弱词送进 AI 语境实验室，生成阅读和选择题。",
      tone: input.reciteAccuracy >= 70 ? "warning" : "danger",
    };
  }

  return {
    title: "今天的复习状态稳定",
    description: "当前没有明显薄弱词，可以用随机词做一轮语境练习保持手感。",
    nextAction: "进入语境练习，挑战一组随机词。",
    tone: "success",
  };
}

function summarizeWeakLevels(words: LearningWord[]): DailyCoachSummary["levelDistribution"] {
  return ([0, 1, 2, 3] as const).map((level) => ({
    level,
    count: words.filter((word) => word.level === level).length,
  }));
}
