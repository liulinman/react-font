import { describe, expect, it } from "vitest";
import {
  formatEnglishWorldDate,
  getEnglishWorldSectionLabel,
} from "./englishWorldContext";

describe("Freewing desktop context", () => {
  it("maps primary and contextual routes to stable product sections", () => {
    expect(getEnglishWorldSectionLabel("cockpit")).toBe("今天");
    expect(getEnglishWorldSectionLabel("words")).toBe("词库");
    expect(getEnglishWorldSectionLabel("bulkImport")).toBe("批量导入");
    expect(getEnglishWorldSectionLabel("overwriteStats")).toBe("覆盖统计");
    expect(getEnglishWorldSectionLabel("memoryMap")).toBe("词汇掌握情况");
    expect(getEnglishWorldSectionLabel("contextLab")).toBe("语境练习");
    expect(getEnglishWorldSectionLabel("ieltsCore")).toBe("单词复习");
    expect(getEnglishWorldSectionLabel("readingPractices")).toBe("阅读练习");
    expect(getEnglishWorldSectionLabel("intensiveReading")).toBe("文章精读");
    expect(getEnglishWorldSectionLabel("recite")).toBe("单词复习");
    expect(getEnglishWorldSectionLabel("wordBooks")).toBe("复习手册");
    expect(getEnglishWorldSectionLabel("stats")).toBe("数据统计");
    expect(getEnglishWorldSectionLabel("unknown")).toBe("Freewing");
  });

  it("formats the local desktop date in Chinese", () => {
    expect(
      formatEnglishWorldDate(new Date("2026-07-17T08:00:00+08:00")),
    ).toBe("7 月 17 日 · 星期五");
  });
});
