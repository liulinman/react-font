import { describe, expect, it } from "vitest";
import type { WordAgentItem } from "@/server/wordAgent/wordAgent";
import {
  buildAiCompletionPatch,
  getWordType,
  isLikelyEnglishLookupInput,
  normalizeWordInput,
  resolveWordAgentResult,
} from "./wordCorrection";

const makeItem = (overrides: Partial<WordAgentItem>): WordAgentItem => ({
  word: "confront",
  phonetic: "/kənˈfrʌnt/",
  meaning: "面对；对抗",
  partOfSpeech: [1],
  examples: [],
  ieltsCase: null,
  ...overrides,
});

describe("word correction decisions", () => {
  const exactItem = makeItem({ inputStatus: "exact", correctionReason: "" });
  const inflectedItem = makeItem({
    word: "run",
    inputStatus: "inflected",
    correctionReason: "这是 run 的现在分词",
  });
  const misspelledItem = makeItem({
    word: "receive",
    inputStatus: "misspelled",
    correctionReason: "i 和 e 的顺序错误",
  });
  const uncertainItem = makeItem({
    word: "color",
    inputStatus: "uncertain",
    correctionReason: "",
  });
  const legacySameWordItem = makeItem({});
  const legacyDifferentWordItem = makeItem({ word: "hello" });
  const exactDifferentWordItem = makeItem({
    word: "hello",
    inputStatus: "exact",
    correctionReason: "",
  });

  it.each([
    [exactItem, "confront", { kind: "auto-complete" }],
    [
      inflectedItem,
      "running",
      { kind: "suggestion", input: "running", candidate: "run", status: "inflected" },
    ],
    [
      misspelledItem,
      "recieve",
      { kind: "suggestion", candidate: "receive", status: "misspelled" },
    ],
    [uncertainItem, "colour", { kind: "ignore" }],
    [legacySameWordItem, "confront", { kind: "auto-complete" }],
    [legacyDifferentWordItem, "illustrate", { kind: "ignore" }],
    [exactDifferentWordItem, "illustrate", { kind: "ignore" }],
  ] as const)("classifies %s for %s", (item, lookupWord, expected) => {
    if (expected.kind === "ignore") {
      expect(resolveWordAgentResult(item, lookupWord)).toEqual(expected);
      return;
    }

    expect(resolveWordAgentResult(item, lookupWord)).toMatchObject(expected);
  });

  it("suggests a candidate despite a first-letter typo when the response is tagged", () => {
    expect(
      resolveWordAgentResult(
        makeItem({ word: "receive", inputStatus: "misspelled", correctionReason: "" }),
        "xecieve",
      ),
    ).toMatchObject({ kind: "suggestion", candidate: "receive", status: "misspelled" });
  });

  it("only auto-completes a phrase when its full normalized text matches", () => {
    const item = makeItem({ word: "take off", inputStatus: "exact", correctionReason: "" });

    expect(resolveWordAgentResult(item, " take   off ")).toMatchObject({ kind: "auto-complete" });
    expect(resolveWordAgentResult(item, "take")).toEqual({ kind: "ignore" });
  });

  it("ignores invalid suggestion candidate text", () => {
    expect(
      resolveWordAgentResult(
        makeItem({ word: "two words", inputStatus: "misspelled", correctionReason: "" }),
        "twowords",
      ),
    ).toEqual({ kind: "ignore" });
  });

  it("ignores an unrecognized runtime input status", () => {
    expect(
      resolveWordAgentResult(
        makeItem({
          word: "receive",
          inputStatus: "invalid-status" as never,
          correctionReason: "不应该成为可操作建议",
        }),
        "recieve",
      ),
    ).toEqual({ kind: "ignore" });
  });

  it("normalizes and classifies lookup text", () => {
    expect(normalizeWordInput("  take\n off  ")).toBe("take off");
    expect(getWordType("take off")).toBe(1);
    expect(getWordType("run")).toBe(0);
    expect(isLikelyEnglishLookupInput("shh")).toBe(true);
    expect(isLikelyEnglishLookupInput("123")).toBe(false);
  });

  it("builds a patch only for empty AI-completable fields", () => {
    const item = makeItem({
      word: "run",
      phonetic: "/rʌn/",
      meaning: "跑；运行",
      partOfSpeech: [1],
      inputStatus: "exact",
      correctionReason: "",
    });
    const values = {
      englishWord: "run",
      englishLevel: 0,
      englishType: 0,
      englishChinese: "手填释义",
      englishPhonetic: "",
      englishPartSpeech: [],
    };

    expect(buildAiCompletionPatch(item, "run", values, { preserveWordType: false })).toEqual({
      englishPhonetic: "/rʌn/",
      englishPartSpeech: [1],
      englishType: 0,
    });
    expect(buildAiCompletionPatch(item, "run", values, { preserveWordType: true })).toEqual({
      englishPhonetic: "/rʌn/",
      englishPartSpeech: [1],
    });
  });
});
