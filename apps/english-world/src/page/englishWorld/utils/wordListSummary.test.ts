import { describe, expect, it } from "vitest";
import { createWordListSummary } from "./wordListSummary";

describe("createWordListSummary", () => {
  it("根据列表分页状态生成桌面概览数据", () => {
    expect(
      createWordListSummary({
        totalNum: 42,
        page: 2,
        pageSize: 10,
        loadedCount: 10,
      }),
    ).toEqual([
      { key: "total", label: "总词条", value: "42" },
      { key: "loaded", label: "当前加载", value: "10" },
      { key: "page", label: "当前页", value: "2 / 5" },
      { key: "pageSize", label: "每页数量", value: "10" },
    ]);
  });

  it("空数据时页码仍保持可读", () => {
    expect(
      createWordListSummary({
        totalNum: 0,
        page: 1,
        pageSize: 10,
        loadedCount: 0,
      }),
    ).toContainEqual({ key: "page", label: "当前页", value: "1 / 1" });
  });
});
