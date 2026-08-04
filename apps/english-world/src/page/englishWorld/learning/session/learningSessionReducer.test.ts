import { describe, expect, it } from "vitest";
import type { LearningSessionSnapshotV1 } from "../contracts/learning-session";
import {
  createLearningSessionState,
  learningSessionReducer,
  type LearningSessionState,
} from "./learningSessionReducer";

const spellingSnapshot: LearningSessionSnapshotV1 = {
  sessionId: 42,
  status: "active",
  sessionVersion: 1,
  submittedResults: [],
  currentItem: {
    schemaVersion: 1,
    mode: "listening",
    phase: "recall",
    itemId: 7,
    item: {
      itemType: "listening_spelling",
      itemUid: "spelling-7",
      wordId: 7,
      audio: { britishUrl: "/audio/7-uk.mp3" },
    },
  },
};

const meaningSnapshot: LearningSessionSnapshotV1 = {
  ...spellingSnapshot,
  sessionVersion: 2,
  currentItem: {
    schemaVersion: 1,
    mode: "listening",
    phase: "verify",
    itemId: 8,
    item: {
      itemType: "listening_meaning",
      itemUid: "meaning-8",
      wordId: 8,
      audio: { americanUrl: "/audio/8-us.mp3" },
      meaningChoices: [
        { value: "choice-a", label: "检查" },
        { value: "choice-b", label: "忽略" },
      ],
    },
  },
};

describe("learningSessionReducer", () => {
  it("replaces the item without carrying its draft or hints and accepts only the supplied matching recovery", () => {
    const previous: LearningSessionState = {
      snapshot: spellingSnapshot,
      interaction: {
        status: "editing",
        itemUid: "spelling-7",
        draft: { kind: "spelling", text: "insp" },
        hints: ["show_spelling"],
      },
    };

    const replaced = learningSessionReducer(previous, {
      type: "snapshot_replaced",
      snapshot: meaningSnapshot,
    });

    expect(replaced.interaction).toEqual({
      status: "editing",
      itemUid: "meaning-8",
      draft: { kind: "choice", selectedValue: "" },
      hints: [],
    });

    const restored = learningSessionReducer(previous, {
      type: "snapshot_replaced",
      snapshot: meaningSnapshot,
      restoredDraft: { kind: "choice", selectedValue: "choice-b" },
    });
    expect(restored.interaction).toEqual({
      status: "editing",
      itemUid: "meaning-8",
      draft: { kind: "choice", selectedValue: "choice-b" },
      hints: [],
    });
  });

  it("deduplicates hints and rejects a second submit while preserving a failed attempt for retry", () => {
    let state = createLearningSessionState(spellingSnapshot);
    state = learningSessionReducer(state, {
      type: "draft_changed",
      draft: { kind: "spelling", text: "inspect" },
    });
    state = learningSessionReducer(state, {
      type: "hint_revealed",
      hint: "replay_slow",
    });
    state = learningSessionReducer(state, {
      type: "hint_revealed",
      hint: "replay_slow",
    });
    expect(state.interaction).toMatchObject({ hints: ["replay_slow"] });

    const submitting = learningSessionReducer(state, {
      type: "submit_started",
      attemptUid: "attempt-original",
    });
    const duplicate = learningSessionReducer(submitting, {
      type: "submit_started",
      attemptUid: "attempt-duplicate",
    });
    expect(duplicate).toBe(submitting);

    const failed = learningSessionReducer(duplicate, {
      type: "submit_failed",
      errorCode: "NETWORK_ERROR",
    });
    expect(failed.interaction).toEqual({
      status: "sync_failed",
      itemUid: "spelling-7",
      draft: { kind: "spelling", text: "inspect" },
      attemptUid: "attempt-original",
      errorCode: "NETWORK_ERROR",
    });

    const retried = learningSessionReducer(failed, {
      type: "submit_started",
      attemptUid: "must-not-replace-original",
    });
    expect(retried.interaction).toEqual({
      status: "submitting",
      itemUid: "spelling-7",
      draft: { kind: "spelling", text: "inspect" },
      attemptUid: "attempt-original",
    });
  });

  it("drops the in-memory draft only after submit_succeeded enters final feedback", () => {
    const editing = createLearningSessionState(spellingSnapshot);
    const submitting = learningSessionReducer(editing, {
      type: "submit_started",
      attemptUid: "attempt-final",
    });
    const feedback = learningSessionReducer(submitting, {
      type: "submit_succeeded",
      result: {
        attemptId: 91,
        status: "final",
        outcome: "correct",
        dimensionResults: [
          { dimension: "spelling", outcome: "correct" },
          { dimension: "listening", outcome: "correct" },
        ],
        feedback: {
          kind: "spelling",
          expected: "inspect",
          diff: [{ text: "inspect", kind: "same" }],
        },
        sessionVersion: 2,
      },
    });

    expect(feedback.interaction?.status).toBe("feedback");
    expect(feedback.interaction).not.toHaveProperty("draft");
  });
});
