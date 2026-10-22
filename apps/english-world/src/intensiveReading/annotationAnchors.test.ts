import { describe, it, expect } from "vitest";
import { segments, overlaps } from "./annotationAnchors";
describe("intensive reading anchors", () => {
  it("preserves UTF16 and repeated sentences without changing text", () => {
    const text = "😀 same same";
    const a = { id: "a", start: 8, end: 12, anchorStatus: "active" };
    const result = segments(text, [a]);
    expect(result.map((p) => p.text).join("")).toBe(text);
    expect(result.filter((p) => p.annotation).map((p) => p.text)).toEqual([
      "same",
    ]);
  });
  it("does not paint stale anchors and rejects overlap", () => {
    expect(
      segments("abc", [
        { id: "a", start: 0, end: 2, anchorStatus: "needs_confirmation" },
      ]).some((s) => s.annotation),
    ).toBe(false);
    expect(overlaps({ start: 1, end: 3 }, [{ start: 2, end: 4 }])).toBe(true);
    expect(overlaps({ start: 0, end: 2 }, [{ start: 2, end: 4 }])).toBe(false);
  });
});
