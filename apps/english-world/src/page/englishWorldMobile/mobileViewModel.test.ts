import { describe, expect, it } from "vitest";
import {
  createDailyStatsBarOption,
  createPartSpeechData,
  createPartSpeechPieOption,
  createSummaryStats,
  getMobileViewTitle,
} from "./mobileViewModel";

describe("mobile view model helpers", () => {
  it("formats summary stats without changing labels", () => {
    expect(
      createSummaryStats({
        totalCount: 12,
        levelCount: 3,
        percentage: 25,
      }),
    ).toEqual([
      { label: "总学习单词", value: 12, color: "#1677ff" },
      { label: "已掌握单词", value: 3, color: "#52c41a" },
      { label: "掌握率", value: "25.00", color: "#faad14" },
    ]);
  });

  it("builds part speech chart data from backend records", () => {
    expect(createPartSpeechData({ 1: 2, 9: 1 })).toEqual([
      { value: 2, name: "动词", color: "#1677ff" },
      { value: 1, name: "未分类", color: "#8c8c8c" },
    ]);
  });

  it("keeps chart option data derived from current state", () => {
    const barOption = createDailyStatsBarOption([
      { date: "2026-06-17", count: 5 },
    ]);
    const pieOption = createPartSpeechPieOption([
      { value: 2, name: "动词", color: "#1677ff" },
    ]);

    expect(barOption.xAxis.data).toEqual(["2026-06-17"]);
    expect(barOption.series[0].data).toEqual([5]);
    expect(pieOption.series[0].data[0]).toMatchObject({
      value: 2,
      name: "动词",
    });
  });

  it("maps mobile view state to existing titles", () => {
    expect(getMobileViewTitle("review")).toBe("今日学习");
    expect(getMobileViewTitle("list")).toBe("词库");
    expect(getMobileViewTitle("stats")).toBe("学习统计");
    expect(getMobileViewTitle("aiTool")).toBe("学习工具");
  });
});
