import { describe, expect, it } from "vitest";
import { wordUpdateLevel } from "./word";

describe("wordUpdateLevel", () => {
  it("uses the narrow mastery update endpoint", () => {
    expect(wordUpdateLevel({ id: 21, englishLevel: 3 })).toEqual({
      url: "/english/updateEnglishWordLevel",
      method: "POST",
      data: { id: 21, englishLevel: 3 },
    });
  });
});
