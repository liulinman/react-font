import { describe, expect, it } from "vitest";
import {
  completeLearningSession,
  createLearningSession,
  learningCapabilities,
  learningSessionDetail,
  pauseLearningSession,
  previewLearningSession,
  submitLearningAttempt,
} from "./learningApi";
import { learningKeys } from "./learningKeys";

describe("learning session request descriptors", () => {
  it("uses the public V1 endpoints and command bodies", () => {
    const preview = { wordIds: [7], selectedModes: ["listening" as const] };
    const create = { ...preview, requestUid: "create-7" };
    const detail = { sessionId: 17 };
    const submit = {
      sessionId: 17,
      itemId: 29,
      sessionVersion: 3,
      attemptUid: "attempt-29",
      answer: { kind: "choice" as const, selectedValue: "choice-2" },
      hintCount: 0,
      hintTypes: [],
    };
    const command = { sessionId: 17, sessionVersion: 3 };

    expect(learningCapabilities()).toEqual({
      url: "/learning-session/capabilities",
      method: "POST",
      __responseType: undefined,
    });
    expect(previewLearningSession(preview)).toEqual({
      url: "/learning-session/preview",
      method: "POST",
      data: preview,
      __responseType: undefined,
    });
    expect(createLearningSession(create)).toEqual({
      url: "/learning-session/create",
      method: "POST",
      data: create,
      __responseType: undefined,
    });
    expect(learningSessionDetail(detail)).toEqual({
      url: "/learning-session/detail",
      method: "POST",
      data: detail,
      __responseType: undefined,
    });
    expect(submitLearningAttempt(submit)).toEqual({
      url: "/learning-session/submit",
      method: "POST",
      data: submit,
      __responseType: undefined,
    });
    expect(pauseLearningSession(command)).toEqual({
      url: "/learning-session/pause",
      method: "POST",
      data: command,
      __responseType: undefined,
    });
    expect(completeLearningSession(command)).toEqual({
      url: "/learning-session/complete",
      method: "POST",
      data: command,
      __responseType: undefined,
    });
  });

  it("builds deterministic learning query keys from caller supplied values", () => {
    expect(learningKeys.capabilities()).toEqual(["learning", "capabilities"]);
    expect(learningKeys.preview("words-7:listening")).toEqual([
      "learning",
      "preview",
      "words-7:listening",
    ]);
    expect(learningKeys.session(17)).toEqual(["learning", "session", 17]);
    expect(learningKeys.mastery(7)).toEqual(["learning", "mastery", 7]);
  });
});
