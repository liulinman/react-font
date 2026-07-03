import { describe, expect, it } from "vitest";
import {
  buildContextLabReference,
  getContextLabReferenceLabel,
  parseContextLabReference,
} from "./contextLabReference";

describe("contextLabReference", () => {
  it("builds an internal context lab reference with task, article, and word", () => {
    const reference = buildContextLabReference(
      {
        taskId: 12,
        articleExerciseId: 88,
      },
      "urban farming",
    );

    expect(reference).toBe(
      "/englishWorld/context-lab?taskId=12&articleExerciseId=88&word=urban+farming",
    );
  });

  it("parses internal references while rejecting external links and plain text", () => {
    expect(
      parseContextLabReference(
        "/englishWorld/context-lab?taskId=12&articleExerciseId=88&word=urban+farming",
      ),
    ).toEqual({
      taskId: 12,
      articleExerciseId: 88,
      word: "urban farming",
      href: "/englishWorld/context-lab?taskId=12&articleExerciseId=88&word=urban+farming",
    });
    expect(parseContextLabReference("https://example.com/article")).toBeNull();
    expect(parseContextLabReference("manual note")).toBeNull();
    expect(parseContextLabReference("/englishWorld/context-lab")).toBeNull();
  });

  it("formats a compact word-library source label", () => {
    const parsed = parseContextLabReference(
      "/englishWorld/context-lab?taskId=12&word=missed+my+stop",
    );

    expect(parsed).not.toBeNull();
    expect(getContextLabReferenceLabel(parsed)).toBe("来自阅读 · 练习包 #12");
  });
});
