import { describe, expect, it } from "vitest";
import dayjs from "dayjs";
import {
  normalizeDesktopWordFilters,
  normalizeMobileWordFilters,
  removeEmptyValues,
} from "./wordFilters";

describe("removeEmptyValues", () => {
  it("移除 undefined、null 和空字符串，但保留 0", () => {
    expect(
      removeEmptyValues({
        englishWord: "test",
        englishChinese: "",
        englishType: 0,
        englishLevel: undefined,
        startTime: null,
      }),
    ).toEqual({
      englishWord: "test",
      englishType: 0,
    });
  });
});

describe("normalizeDesktopWordFilters", () => {
  it("把桌面端时间范围转换为后端筛选参数", () => {
    expect(
      normalizeDesktopWordFilters({
        englishWord: "hello",
        englishChinese: "",
        englishType: 0,
        time: [dayjs("2026-05-01"), dayjs("2026-05-02")],
      }),
    ).toMatchObject({
      englishWord: "hello",
      englishType: 0,
      startTime: "2026-05-01 00:00:00",
      endTime: "2026-05-02 23:59:59",
    });
  });
});

describe("normalizeMobileWordFilters", () => {
  it("把移动端搜索词合并到 englishWord", () => {
    expect(
      normalizeMobileWordFilters(
        { englishType: 1, englishChinese: "" },
        "apple",
      ),
    ).toEqual({
      englishType: 1,
      englishWord: "apple",
    });
  });
});
