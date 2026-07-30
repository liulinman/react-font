import { describe, expect, it } from "vitest";
import { detectUnsupportedPastedQuestions } from "./pastedQuestionCompatibility";

describe("detectUnsupportedPastedQuestions", () => {
  it("reports unsupported matching instructions with their question numbers", () => {
    expect(
      detectUnsupportedPastedQuestions(`Questions 14-18\n14. Matching Headings\nWhich paragraph contains the following information?\n16. Match each statement with the correct researcher.`),
    ).toEqual([
      {
        questionNumber: 14,
        questionType: "matching_headings",
        reason: "第一期暂不支持 Matching Headings 批量匹配",
      },
      {
        questionType: "matching_information",
        reason: "第一期暂不支持 Matching Information 批量匹配",
      },
      {
        questionNumber: 16,
        questionType: "matching_features",
        reason: "第一期暂不支持 Matching Features 批量匹配",
      },
    ]);
  });

  it("does not report normal TFNG or summary completion prompts", () => {
    expect(
      detectUnsupportedPastedQuestions(`Questions 1-5\nDo the following statements agree with the information given?\nWrite TRUE, FALSE or NOT GIVEN.\n\nComplete the summary below.\nChoose NO MORE THAN TWO WORDS from the passage for each answer.`),
    ).toEqual([]);
  });
});
