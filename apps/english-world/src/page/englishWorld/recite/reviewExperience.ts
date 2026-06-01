import type { Statistics } from "@/server/recite/recite";

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
      nextAction: "保持节奏，明天继续复习薄弱词。",
    };
  }

  if (statistics.accuracy >= 60) {
    return {
      tone: "warning",
      title: "还有几个词不稳",
      description: `${statistics.totalCount} 个词里有 ${statistics.errorCount} 个没答准，适合今天再巩固一次。`,
      nextAction: "把错词再过一遍，复习效果会更稳。",
    };
  }

  return {
    tone: "danger",
    title: "今天先把基础拉回来",
    description: `${statistics.errorCount} 个词还不熟，系统已经帮你标出来了。`,
    nextAction: "先别加新词，建议再来一轮短复习。",
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
