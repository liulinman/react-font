import { afterEach, describe, expect, it, vi } from "vitest";
import type { LearningAnswerDraft } from "../activities/shared/answerDraft";
import { createLearningDraftStore } from "./learningDraftStorage";

describe("createLearningDraftStore", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("uses the exact item key and stores a versioned, privacy-safe envelope", () => {
    const store = createLearningDraftStore(42, "listening-spelling-7");
    const draftWithPrivateFields = {
      kind: "spelling",
      text: "insp",
      correctAnswer: "inspect",
      answerContract: { correctValue: "inspect" },
    } as unknown as LearningAnswerDraft;

    store.save(draftWithPrivateFields);

    expect(store.key).toBe(
      "english-world.learning-draft.v1.42.listening-spelling-7",
    );
    expect(JSON.parse(localStorage.getItem(store.key) ?? "null")).toEqual({
      schemaVersion: 1,
      sessionId: 42,
      itemUid: "listening-spelling-7",
      draft: { kind: "spelling", text: "insp" },
    });
    expect(store.load()).toEqual({ kind: "spelling", text: "insp" });
  });

  it("ignores malformed, mismatched, and over-limit drafts", () => {
    const store = createLearningDraftStore(42, "item-a");
    const invalidPayloads = [
      "not-json",
      JSON.stringify({
        schemaVersion: 2,
        sessionId: 42,
        itemUid: "item-a",
        draft: { kind: "spelling", text: "valid" },
      }),
      JSON.stringify({
        schemaVersion: 1,
        sessionId: 99,
        itemUid: "item-a",
        draft: { kind: "spelling", text: "valid" },
      }),
      JSON.stringify({
        schemaVersion: 1,
        sessionId: 42,
        itemUid: "item-b",
        draft: { kind: "spelling", text: "valid" },
      }),
      JSON.stringify({
        schemaVersion: 1,
        sessionId: 42,
        itemUid: "item-a",
        draft: { kind: "spelling", text: "x".repeat(257) },
      }),
      JSON.stringify({
        schemaVersion: 1,
        sessionId: 42,
        itemUid: "item-a",
        draft: { kind: "skip", reason: "server_answer" },
      }),
    ];

    for (const payload of invalidPayloads) {
      localStorage.setItem(store.key, payload);
      expect(store.load()).toBeNull();
    }
  });

  it("keeps a draft until explicit success cleanup and handles storage failures safely", () => {
    const store = createLearningDraftStore(42, "item-a");
    store.save({ kind: "choice", selectedValue: "choice-a" });
    expect(store.load()).toEqual({ kind: "choice", selectedValue: "choice-a" });

    store.clear();
    expect(store.load()).toBeNull();

    const throwingStorage: Storage = {
      get length(): number {
        throw new Error("blocked");
      },
      clear: vi.fn(() => {
        throw new Error("blocked");
      }),
      getItem: vi.fn(() => {
        throw new Error("blocked");
      }),
      key: vi.fn(() => {
        throw new Error("blocked");
      }),
      removeItem: vi.fn(() => {
        throw new Error("blocked");
      }),
      setItem: vi.fn(() => {
        throw new Error("blocked");
      }),
    };
    const unavailable = createLearningDraftStore(42, "item-a", throwingStorage);
    expect(() => unavailable.save({ kind: "spelling", text: "x" })).not.toThrow();
    expect(unavailable.load()).toBeNull();
    expect(() => unavailable.clear()).not.toThrow();
  });
});
