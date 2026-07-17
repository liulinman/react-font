import type { AnswerResult, Statistics } from "@/server/recite/recite";

export type ReviewProgress = {
  totalCount: number;
  answeredCount: number;
  remainingCount: number;
  percent: number;
};

export type ReviewInsight = {
  tone: "success" | "warning" | "danger";
  title: string;
  description: string;
  nextAction: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  priority: "repair" | "complete";
};

export type ReviewCardState = {
  displayIndex: number;
  totalCount: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  isLast: boolean;
};

export function createReviewProgress({
  totalCount,
  answeredCount,
}: {
  totalCount: number;
  answeredCount: number;
}): ReviewProgress {
  if (totalCount <= 0) {
    return {
      totalCount: 0,
      answeredCount: 0,
      remainingCount: 0,
      percent: 0,
    };
  }

  const safeAnsweredCount = Math.min(Math.max(answeredCount, 0), totalCount);

  return {
    totalCount,
    answeredCount: safeAnsweredCount,
    remainingCount: totalCount - safeAnsweredCount,
    percent: Math.round((safeAnsweredCount / totalCount) * 100),
  };
}

export function createReviewResultInsight(
  statistics: Statistics,
): ReviewInsight {
  if (statistics.accuracy >= 80) {
    return {
      tone: "success",
      title: "今天状态不错",
      description: `${statistics.totalCount} 个词完成复习，${statistics.errorCount} 个词需要下次优先巩固。`,
      nextAction: "保持节奏，完成今日任务，明天继续。",
      primaryCtaLabel: "完成今日任务",
      secondaryCtaLabel: "明天继续",
      priority: "complete",
    };
  }

  if (statistics.accuracy >= 60) {
    return {
      tone: "warning",
      title: "还有几个词不稳",
      description: `${statistics.totalCount} 个词里有 ${statistics.errorCount} 个没答准，适合今天再巩固一次。`,
      nextAction: "再来一组短复习，再用语境练习确认是否真的会用。",
      primaryCtaLabel: "不稳定词再练一组",
      secondaryCtaLabel: "语境练习",
      priority: "repair",
    };
  }

  return {
    tone: "danger",
    title: "今天先把基础拉回来",
    description: `${statistics.errorCount} 个词还不熟，系统已经帮你标出来了。`,
      nextAction: "先别加新词，建议再来一组短复习，再用语境练习补一遍。",
      primaryCtaLabel: "不稳定词再练一组",
    secondaryCtaLabel: "语境练习",
    priority: "repair",
  };
}

export function createReviewCardState({
  totalCount,
  currentIndex,
}: {
  totalCount: number;
  currentIndex: number;
}): ReviewCardState {
  const safeTotalCount = Math.max(totalCount, 0);
  const maxIndex = Math.max(safeTotalCount - 1, 0);
  const safeIndex = Math.min(Math.max(currentIndex, 0), maxIndex);

  return {
    displayIndex: safeTotalCount === 0 ? 0 : safeIndex + 1,
    totalCount: safeTotalCount,
    canGoPrev: safeIndex > 0,
    canGoNext: safeIndex < maxIndex,
    isLast: safeTotalCount === 0 || safeIndex === maxIndex,
  };
}

export function getWrongWordIds(results: AnswerResult[]): number[] {
  const seen = new Set<number>();
  const wordIds: number[] = [];

  results.forEach((result) => {
    if (result.isCorrect || seen.has(result.wordId)) {
      return;
    }
    seen.add(result.wordId);
    wordIds.push(result.wordId);
  });

  return wordIds;
}

export function getContextRepairWords(
  results: AnswerResult[],
  limit = 3,
): string[] {
  const seen = new Set<string>();
  const words: string[] = [];

  for (const result of results) {
    if (result.isCorrect) continue;
    const word = result.englishWord?.trim();
    const key = word?.toLowerCase();
    if (!word || !key || seen.has(key)) continue;
    seen.add(key);
    words.push(word);
    if (words.length >= Math.max(1, limit)) break;
  }
  return words;
}

export function buildMicroContextPath(
  sessionId: number,
  words: string[],
): string {
  const params = new URLSearchParams({
    mode: "micro",
    source: "recite-result",
    reciteSessionId: String(sessionId),
    words: words.join(","),
  });
  return `/englishWorld/context-lab?${params.toString().replace(/\+/g, "%20")}`;
}

export function orderResultsForReview(
  results: AnswerResult[],
): AnswerResult[] {
  return [...results].sort((a, b) => {
    if (a.isCorrect === b.isCorrect) {
      return 0;
    }
    return a.isCorrect ? 1 : -1;
  });
}
