import { describe, expect, it } from "vitest";
import {
  aggregateDailyStats,
  getDefaultStatsGranularity,
} from "./statsTimeline";

describe("stats timeline aggregation", () => {
  it("selects a readable default granularity from the history length", () => {
    expect(getDefaultStatsGranularity(Array.from({ length: 60 }))).toBe("day");
    expect(getDefaultStatsGranularity(Array.from({ length: 61 }))).toBe(
      "week",
    );
    expect(getDefaultStatsGranularity(Array.from({ length: 180 }))).toBe(
      "week",
    );
    expect(getDefaultStatsGranularity(Array.from({ length: 181 }))).toBe(
      "month",
    );
  });

  it("combines daily values into calendar months", () => {
    expect(
      aggregateDailyStats(
        [
          { date: "2026-01-01", count: 2 },
          { date: "2026-01-31", count: 3 },
          { date: "2026-02-01", count: 4 },
        ],
        "month",
      ),
    ).toEqual([
      {
        key: "2026-01",
        label: "2026-01",
        rangeLabel: "2026 年 1 月",
        count: 5,
      },
      {
        key: "2026-02",
        label: "2026-02",
        rangeLabel: "2026 年 2 月",
        count: 4,
      },
    ]);
  });

  it("uses Monday-to-Sunday calendar weeks", () => {
    expect(
      aggregateDailyStats(
        [
          { date: "2026-01-05", count: 2 },
          { date: "2026-01-11", count: 3 },
          { date: "2026-01-12", count: 4 },
        ],
        "week",
      ),
    ).toEqual([
      {
        key: "2026-01-05",
        label: "01-05",
        rangeLabel: "2026-01-05 至 2026-01-11",
        count: 5,
      },
      {
        key: "2026-01-12",
        label: "01-12",
        rangeLabel: "2026-01-12 至 2026-01-18",
        count: 4,
      },
    ]);
  });
});
