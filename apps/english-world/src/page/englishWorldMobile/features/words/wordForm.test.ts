import { describe, expect, it } from "vitest";
import {
  isWordFormDraftWorthSaving,
  toWordAddPayload,
  toWordUpdatePayload,
  WORD_FORM_NEW_DRAFT_KEY,
  wordFormEditDraftKey,
} from "./wordForm";

describe("wordForm payload builders", () => {
  it("trims the word and fills default type, level and part of speech", () => {
    expect(
      toWordAddPayload({ englishWord: " retain ", englishPartSpeech: [] }),
    ).toMatchObject({
      englishWord: "retain",
      englishLevel: 0,
      englishType: 0,
      englishPartSpeech: [],
    });
  });

  it("classifies a multi-token word as a phrase when the type is unset", () => {
    expect(
      toWordAddPayload({ englishWord: "take off" }).englishType,
    ).toBe(1);
  });

  it("preserves an explicitly chosen type over the inferred default", () => {
    expect(
      toWordAddPayload({ englishWord: "take off", englishType: 2 }).englishType,
    ).toBe(2);
  });

  it("builds an update payload that keeps the existing id", () => {
    expect(toWordUpdatePayload({ englishWord: "retain" }, 7)).toMatchObject({
      id: 7,
      englishWord: "retain",
      englishLevel: 0,
      englishType: 0,
      englishPartSpeech: [],
    });
  });

  it("exposes stable new/edit draft keys", () => {
    expect(WORD_FORM_NEW_DRAFT_KEY).toBe("word-form:new");
    expect(wordFormEditDraftKey(9)).toBe("word-form:9");
  });

  it("only treats a non-empty word as worth saving as a draft", () => {
    expect(isWordFormDraftWorthSaving({ englishWord: "   " })).toBe(false);
    expect(isWordFormDraftWorthSaving({ englishWord: "retain" })).toBe(true);
  });
});
