import request from "@font/api";

export type LearningEventType =
  | "recite_started"
  | "recite_completed"
  | "eligible_wrong_result_viewed"
  | "micro_context_started"
  | "micro_context_generated"
  | "micro_context_completed"
  | "next_day_repair_started"
  | "next_day_repair_correct";

export type LearningEventPayload = {
  eventUid: string;
  eventType: LearningEventType;
  flowId?: string;
  reciteSessionId?: number;
  contextTaskId?: number;
  attemptId?: number;
  wordCount?: number;
  correctCount?: number;
  elapsedSeconds?: number;
  timezoneOffsetMinutes?: number;
  status?: string;
};

export function buildLearningEventUid(
  eventType: LearningEventType,
  identity: string | number,
) {
  return `${eventType}:${identity}`;
}

export async function recordLearningEvent(payload: LearningEventPayload) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await request({
        url: "/learning-loop/events",
        method: "POST",
        data: payload,
      });
      return true;
    } catch {
      // A short retry absorbs transient failures without blocking the core flow.
    }
  }
  return false;
}
