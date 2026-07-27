import { describe, expect, it } from "vitest";
import { formatContextLabQuestionTypeLabel } from "./contextLabQuestionType";

describe("formatContextLabQuestionTypeLabel", () => {
  it("formats IELTS question type labels for Context Lab question cards", () => {
    expect(formatContextLabQuestionTypeLabel("true_false_not_given")).toBe(
      "True / False / Not Given",
    );
    expect(formatContextLabQuestionTypeLabel("matching_headings")).toBe(
      "Matching headings",
    );
    expect(formatContextLabQuestionTypeLabel("summary_completion")).toBe(
      "Summary completion",
    );
    expect(formatContextLabQuestionTypeLabel("vocabulary")).toBe("Vocabulary");
    expect(formatContextLabQuestionTypeLabel("")).toBe("");
  });
});
