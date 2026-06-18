import { describe, expect, it } from "vitest";
import { createPlanReviewSearch, parsePlanReviewSearch } from "./planReview";

describe("planReview", () => {
  it("serializes a daily coach action into recite query params", () => {
    const search = createPlanReviewSearch({
      type: "repair",
      title: "修复薄弱词",
      description: "定向复习",
      wordIds: [3, 8],
      estimatedMinutes: 4,
    });

    expect(parsePlanReviewSearch(`?${search}`)).toEqual({
      source: "repair",
      title: "修复薄弱词",
      wordIds: [3, 8],
    });
  });

  it("ignores invalid word ids from query params", () => {
    expect(parsePlanReviewSearch("?wordIds=1,a,-2,5")).toMatchObject({
      wordIds: [1, 5],
    });
  });

  it("allows review actions without word ids to serialize safely", () => {
    const search = createPlanReviewSearch({
      type: "review",
      title: "普通复习",
      description: "按配置开始",
      estimatedMinutes: 3,
    });

    expect(parsePlanReviewSearch(`?${search}`).wordIds).toEqual([]);
  });
});
