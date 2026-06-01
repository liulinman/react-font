import { describe, expect, it } from "vitest";
import {
  createReviewCardState,
  createReviewProgress,
  createReviewResultInsight,
} from "./reviewExperience";

describe("reviewExperience", () => {
  it("生成今日复习进度", () => {
    expect(createReviewProgress({ totalCount: 10, answeredCount: 4 })).toEqual({
      totalCount: 10,
      answeredCount: 4,
      remainingCount: 6,
      percent: 40,
    });
  });

  it("空题目时进度保持为 0", () => {
    expect(createReviewProgress({ totalCount: 0, answeredCount: 4 })).toEqual({
      totalCount: 0,
      answeredCount: 0,
      remainingCount: 0,
      percent: 0,
    });
  });

  it("根据正确率生成复习反馈", () => {
    expect(
      createReviewResultInsight({
        totalCount: 10,
        correctCount: 8,
        errorCount: 2,
        accuracy: 80,
      }),
    ).toEqual({
      tone: "success",
      title: "今天状态不错",
      description: "10 个词完成复习，2 个词需要下次优先巩固。",
      nextAction: "保持节奏，明天继续复习薄弱词。",
    });
  });

  it("低正确率时给出降低挫败感的建议", () => {
    expect(
      createReviewResultInsight({
        totalCount: 10,
        correctCount: 3,
        errorCount: 7,
        accuracy: 30,
      }).nextAction,
    ).toBe("先别加新词，建议再来一轮短复习。");
  });

  it("生成单题卡片导航状态", () => {
    expect(createReviewCardState({ totalCount: 10, currentIndex: 0 })).toEqual({
      displayIndex: 1,
      totalCount: 10,
      canGoPrev: false,
      canGoNext: true,
      isLast: false,
    });

    expect(createReviewCardState({ totalCount: 10, currentIndex: 9 })).toEqual({
      displayIndex: 10,
      totalCount: 10,
      canGoPrev: true,
      canGoNext: false,
      isLast: true,
    });
  });
});
