import { describe, expect, it } from "vitest";
import {
  formatEnglishWorldDate,
  getEnglishWorldSectionLabel,
} from "./englishWorldContext";

describe("English World desktop context", () => {
  it("maps primary and contextual routes to stable product sections", () => {
    expect(getEnglishWorldSectionLabel("cockpit")).toBe("今天");
    expect(getEnglishWorldSectionLabel("words")).toBe("词库");
    expect(getEnglishWorldSectionLabel("memoryMap")).toBe("词库");
    expect(getEnglishWorldSectionLabel("contextLab")).toBe("学习");
    expect(getEnglishWorldSectionLabel("unknown")).toBe("English World");
  });

  it("formats the local desktop date in Chinese", () => {
    expect(
      formatEnglishWorldDate(new Date("2026-07-17T08:00:00+08:00")),
    ).toBe("7 月 17 日 · 星期五");
  });
});
