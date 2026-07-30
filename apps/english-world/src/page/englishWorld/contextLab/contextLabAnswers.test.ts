import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  ContextLabAnswerState,
  ContextLabQuestionInput,
} from "../types/learning";
import {
  buildSubmitAnswers,
  clearContextLabDraft,
  countAnsweredQuestions,
  loadContextLabDraft,
  saveContextLabDraft,
} from "./contextLabAnswers";

describe("contextLabAnswers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds the mixed submit union and omits blank text", () => {
    const questions: ContextLabQuestionInput[] = [
      {
        id: "q1",
        groupId: "choice",
        stem: "Choose one.",
        questionType: "detail",
        responseType: "single_choice",
        options: ["A", "B"],
      },
      {
        id: "q2",
        groupId: "completion",
        stem: "Complete it.",
        questionType: "summary_completion",
        responseType: "text_completion",
        wordLimit: 2,
      },
      {
        id: "q3",
        groupId: "blank",
        stem: "Leave blank.",
        questionType: "summary_completion",
        responseType: "text_completion",
        wordLimit: 2,
      },
    ];

    const state = {
      q1: { selectedIndex: 1 },
      q2: { text: " solar panels " },
      q3: { text: "   " },
    };

    expect(buildSubmitAnswers(questions, state)).toEqual([
      { questionId: "q1", responseType: "single_choice", selectedIndex: 1 },
      {
        questionId: "q2",
        responseType: "text_completion",
        text: " solar panels ",
      },
    ]);
    expect(countAnsweredQuestions(questions, state)).toBe(2);
  });

  it("accepts legacy options questions as single choice and validates TFNG values", () => {
    const questions: ContextLabQuestionInput[] = [
      {
        id: "legacy",
        groupId: "legacy",
        stem: "Legacy choice.",
        options: ["A", "B"],
      },
      {
        id: "tfng",
        groupId: "tfng",
        stem: "Decide.",
        questionType: "true_false_not_given",
        responseType: "true_false_not_given",
        options: ["True", "False", "Not Given"],
      },
    ];

    expect(
      buildSubmitAnswers(questions, {
        legacy: { selectedIndex: 0 },
        tfng: { selectedValue: "Yes" },
      }),
    ).toEqual([{ questionId: "legacy", responseType: "single_choice", selectedIndex: 0 }]);

    expect(
      buildSubmitAnswers(questions, {
        legacy: { selectedIndex: 1.5 },
        tfng: { selectedValue: "Not Given" },
      }),
    ).toEqual([
      {
        questionId: "tfng",
        responseType: "true_false_not_given",
        selectedValue: "Not Given",
      },
    ]);
  });

  it("submits a historical V1 TFNG choice as a semantic selected value", () => {
    const questions: ContextLabQuestionInput[] = [
      {
        id: "q2",
        stem: "The project began in 2018.",
        questionType: "true_false_not_given",
        options: ["True", "False", "Not Given"],
      },
    ];

    expect(
      buildSubmitAnswers(questions, {
        q2: { selectedValue: "Not Given" },
      }),
    ).toEqual([
      {
        questionId: "q2",
        responseType: "true_false_not_given",
        selectedValue: "Not Given",
      },
    ]);
  });

  it("does not count or submit a choice index outside the available options", () => {
    const questions: ContextLabQuestionInput[] = [
      {
        id: "q1",
        groupId: "choice",
        stem: "Choose one.",
        questionType: "detail",
        responseType: "single_choice",
        options: ["A", "B"],
      },
    ];
    const state: ContextLabAnswerState = {
      q1: { selectedIndex: 99 },
    };

    expect(countAnsweredQuestions(questions, state)).toBe(0);
    expect(buildSubmitAnswers(questions, state)).toEqual([]);
  });

  it("safely omits a malformed discriminated question from submit helpers", () => {
    const questions = [
      {
        id: "broken",
        groupId: "choice",
        stem: "Missing options.",
        questionType: "detail",
        responseType: "single_choice",
      },
    ] as unknown as ContextLabQuestionInput[];

    expect(() =>
      buildSubmitAnswers(questions, {
        broken: { selectedIndex: 0 },
      }),
    ).not.toThrow();
    expect(
      buildSubmitAnswers(questions, {
        broken: { selectedIndex: 0 },
      }),
    ).toEqual([]);
    expect(
      countAnsweredQuestions(questions, {
        broken: { selectedIndex: 0 },
      }),
    ).toBe(0);
  });

  it("stores drafts by session and clears only the submitted session", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });

    saveContextLabDraft(88, { q1: { selectedValue: "True" } });
    saveContextLabDraft(89, { q2: { text: "keep me" } });

    expect(loadContextLabDraft(88)).toEqual({
      q1: { selectedValue: "True" },
    });
    clearContextLabDraft(88);
    expect(loadContextLabDraft(88)).toEqual({});
    expect(loadContextLabDraft(89)).toEqual({ q2: { text: "keep me" } });
  });

  it("persists only valid mutually exclusive answer values", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });

    saveContextLabDraft(
      90,
      {
        validChoice: { selectedIndex: 0 },
        validTfng: { selectedValue: "Not Given" },
        validText: { text: " solar panels " },
        mixedShape: { selectedIndex: 1, text: "also text" },
        extraAnswerField: { text: "answer", acceptedAnswers: ["answer"] },
        decimalChoice: { selectedIndex: 1.5 },
        unknownValue: { selectedValue: "Maybe" },
        invalidText: { text: 42 },
      } as unknown as ContextLabAnswerState,
    );

    expect(
      JSON.parse(storage.get("context-lab:draft:v2:90") ?? "{}"),
    ).toEqual({
      validChoice: { selectedIndex: 0 },
      validTfng: { selectedValue: "Not Given" },
      validText: { text: " solar panels " },
    });
  });

  it("rejects malformed saved draft values", () => {
    vi.stubGlobal("localStorage", {
      getItem: () =>
        JSON.stringify({
          validChoice: { selectedIndex: 0 },
          validText: { text: "kept" },
          decimalChoice: { selectedIndex: 1.5 },
          unknownValue: { selectedValue: "Maybe" },
          invalidShape: { selectedIndex: "0" },
          mixedShape: { selectedIndex: 1, text: "also text" },
          extraAnswerField: { text: "answer", acceptedAnswers: ["answer"] },
        }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });

    expect(loadContextLabDraft(88)).toEqual({
      validChoice: { selectedIndex: 0 },
      validText: { text: "kept" },
    });
  });
});
