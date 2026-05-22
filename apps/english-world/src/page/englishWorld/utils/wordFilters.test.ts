import { describe, expect, it } from "vitest";
import { removeEmptyValues } from "./wordFilters";

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
