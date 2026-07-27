import { describe, expect, it } from "vitest";
import {
  buildMobileMarkedWord,
  cleanMobileSelectedText,
  findMobileQuestionResult,
  getMobileQuestionKey,
  getMobileVocabularyKey,
  mergeMobileImportPreview,
  parseMobileContextArticle,
  toMobileImportPayload,
} from "./mobileContextLab";

describe("mobileContextLab helpers", () => {
  it("parses a titled article into topic and body paragraphs", () => {
    expect(
      parseMobileContextArticle(
        "Urban Farming\n\nParagraph one.\n\nParagraph two.",
      ),
    ).toEqual({
      topic: "Urban Farming",
      paragraphs: ["Paragraph one.", "Paragraph two."],
    });
  });

  it("strips markdown bold markers when parsing article text", () => {
    expect(
      parseMobileContextArticle(
        "Urban Renewal\n\nA **remarkable** policy response.\n\nThe **plight** remains.",
      ),
    ).toEqual({
      topic: "Urban Renewal",
      paragraphs: [
        "A remarkable policy response.",
        "The plight remains.",
      ],
    });
  });

  it("cleans selected vocabulary text and creates stable keys", () => {
    expect(cleanMobileSelectedText(" “Urban farming,” ")).toBe("Urban farming");
    expect(getMobileVocabularyKey("Urban   Farming")).toBe("urban farming");
  });

  it("creates stable question keys and finds matching results", () => {
    const results = [
      {
        questionId: "q1",
        correct: false,
        correctIndex: 2,
        userSelectedIndex: 0,
        explanation: "定位句说明答案是 C。",
      },
    ];

    expect(getMobileQuestionKey({ id: "q1" }, 0)).toBe("q1");
    expect(getMobileQuestionKey({}, 2)).toBe("q-2");
    expect(findMobileQuestionResult(results, "q1")?.correct).toBe(false);
  });

  it("builds marked words with context references and import payloads", () => {
    const marked = buildMobileMarkedWord("urban farming", {
      id: 12,
      taskId: 12,
      status: "succeeded",
      sourceType: "custom",
      words: ["urban farming"],
      articleExerciseId: 88,
    });

    expect(marked).toMatchObject({
      englishWord: "urban farming",
      englishType: 1,
      englishReference:
        "/englishWorld/context-lab?taskId=12&articleExerciseId=88&word=urban+farming",
    });
    expect(toMobileImportPayload(marked)).toMatchObject({
      englishWord: "urban farming",
      englishType: 1,
      englishLevel: 0,
    });
  });

  it("merges AI completed fields into marked word preview", () => {
    const base = [buildMobileMarkedWord("urban farming", null)];

    expect(
      mergeMobileImportPreview(base, [
        {
          word: "urban farming",
          phonetic: "/ˈɜːbən/",
          meaning: "城市农业",
          partOfSpeech: [1, 2],
          examples: [],
          ieltsCase: null,
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        englishWord: "urban farming",
        englishPhonetic: "/ˈɜːbən/",
        englishChinese: "城市农业",
        englishPartSpeech: [1, 2],
      }),
    ]);
  });
});
