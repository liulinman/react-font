import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "@font/api";
import {
  buildLearningEventUid,
  recordLearningEvent,
  type LearningEventPayload,
} from "./learningEvents";

vi.mock("@font/api", () => ({ default: vi.fn() }));

describe("learningEvents", () => {
  beforeEach(() => {
    vi.mocked(request).mockReset().mockResolvedValue({ id: 1 } as never);
  });

  it("builds stable entity-based event uids", () => {
    expect(buildLearningEventUid("micro_context_started", 91)).toBe(
      "micro_context_started:91",
    );
    expect(buildLearningEventUid("micro_context_started", 91)).toBe(
      buildLearningEventUid("micro_context_started", 91),
    );
  });

  it("posts only privacy-minimal typed metadata", async () => {
    const payload: LearningEventPayload = {
      eventUid: "micro_context_completed:21",
      eventType: "micro_context_completed",
      flowId: "flow-91",
      reciteSessionId: 91,
      contextTaskId: 21,
      attemptId: 31,
      wordCount: 2,
      correctCount: 1,
      elapsedSeconds: 72,
      timezoneOffsetMinutes: 480,
      status: "succeeded",
    };

    await expect(recordLearningEvent(payload)).resolves.toBe(true);

    expect(request).toHaveBeenCalledWith({
      url: "/learning-loop/events",
      method: "POST",
      data: payload,
    });
    expect(Object.keys(payload)).not.toEqual(
      expect.arrayContaining(["answer", "article", "question", "explanation"]),
    );
  });

  it("retries analytics writes and keeps final failure non-blocking", async () => {
    vi.mocked(request).mockRejectedValue(new Error("offline"));

    await expect(
      recordLearningEvent({
        eventUid: "recite_started:flow-1",
        eventType: "recite_started",
        flowId: "flow-1",
      }),
    ).resolves.toBe(false);
    expect(request).toHaveBeenCalledTimes(3);
  });
});
