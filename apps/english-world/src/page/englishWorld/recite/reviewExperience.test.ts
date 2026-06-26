import { describe, expect, it } from "vitest";
import type { AnswerResult } from "@/server/recite/recite";
import {
  createReviewCardState,
  createReviewProgress,
  createReviewResultInsight,
  getWrongWordIds,
  orderResultsForReview,
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
      nextAction: "保持节奏，完成今日任务，明天继续。",
      primaryCtaLabel: "完成今日任务",
      secondaryCtaLabel: "明天继续",
      priority: "complete",
    });
  });

  it("低正确率时把薄弱词短复习作为主要下一步", () => {
    const insight = createReviewResultInsight({
      totalCount: 10,
      correctCount: 3,
      errorCount: 7,
      accuracy: 30,
    });

    expect(insight.nextAction).toBe(
      "先别加新词，建议再来一组短复习，再用语境练习补一遍。",
    );
    expect(insight.primaryCtaLabel).toBe("不稳定词再练一组");
    expect(insight.secondaryCtaLabel).toBe("语境练习");
    expect(insight.priority).toBe("repair");
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

  it("提取错词 id 并去重保序", () => {
    const results = [
      {
        wordId: 2,
        englishWord: "fragile",
        correctAnswer: "fragile",
        userAnswer: "",
        isCorrect: false,
      },
      {
        wordId: 5,
        englishWord: "resilient",
        correctAnswer: "resilient",
        userAnswer: "resilient",
        isCorrect: true,
      },
      {
        wordId: 2,
        englishWord: "fragile",
        correctAnswer: "fragile",
        userAnswer: "fragil",
        isCorrect: false,
      },
    ] satisfies AnswerResult[];

    expect(getWrongWordIds(results)).toEqual([2]);
  });

  it("复盘时把错词排在正确词前面并保持组内顺序", () => {
    const results = [
      {
        wordId: 1,
        englishWord: "alpha",
        correctAnswer: "alpha",
        userAnswer: "alpha",
        isCorrect: true,
      },
      {
        wordId: 2,
        englishWord: "beta",
        correctAnswer: "beta",
        userAnswer: "",
        isCorrect: false,
      },
      {
        wordId: 3,
        englishWord: "gamma",
        correctAnswer: "gamma",
        userAnswer: "gamma",
        isCorrect: true,
      },
      {
        wordId: 4,
        englishWord: "delta",
        correctAnswer: "delta",
        userAnswer: "del",
        isCorrect: false,
      },
    ] satisfies AnswerResult[];

    expect(orderResultsForReview(results).map((item) => item.wordId)).toEqual([
      2, 4, 1, 3,
    ]);
  });
});
