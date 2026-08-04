import type { YTRequest } from "@font/api";
import type {
  CreateLearningSessionCommandV1,
  LearningCapabilitiesV1,
  LearningPlanPreviewV1,
  LearningSessionCommandV1,
  LearningSessionCreateResultV1,
  LearningSessionDetailCommandV1,
  LearningSessionDetailV1,
  LearningSessionTransitionResultV1,
  PreviewLearningSessionCommandV1,
  SubmitLearningAttemptCommandV1,
  SubmitLearningAttemptResultV1,
} from "../contracts/learning-session";

export const learningCapabilities = (): YTRequest<LearningCapabilitiesV1> => ({
  url: "/learning-session/capabilities",
  method: "POST",
  __responseType: undefined as unknown as LearningCapabilitiesV1,
});

export const previewLearningSession = (
  data: PreviewLearningSessionCommandV1,
): YTRequest<LearningPlanPreviewV1> => ({
  url: "/learning-session/preview",
  method: "POST",
  data,
  __responseType: undefined as unknown as LearningPlanPreviewV1,
});

export const createLearningSession = (
  data: CreateLearningSessionCommandV1,
): YTRequest<LearningSessionCreateResultV1> => ({
  url: "/learning-session/create",
  method: "POST",
  data,
  __responseType: undefined as unknown as LearningSessionCreateResultV1,
});

export const learningSessionDetail = (
  data: LearningSessionDetailCommandV1,
): YTRequest<LearningSessionDetailV1> => ({
  url: "/learning-session/detail",
  method: "POST",
  data,
  __responseType: undefined as unknown as LearningSessionDetailV1,
});

export const submitLearningAttempt = (
  data: SubmitLearningAttemptCommandV1,
): YTRequest<SubmitLearningAttemptResultV1> => ({
  url: "/learning-session/submit",
  method: "POST",
  data,
  __responseType: undefined as unknown as SubmitLearningAttemptResultV1,
});

export const pauseLearningSession = (
  data: LearningSessionCommandV1,
): YTRequest<LearningSessionTransitionResultV1> => ({
  url: "/learning-session/pause",
  method: "POST",
  data,
  __responseType: undefined as unknown as LearningSessionTransitionResultV1,
});

export const completeLearningSession = (
  data: LearningSessionCommandV1,
): YTRequest<LearningSessionTransitionResultV1> => ({
  url: "/learning-session/complete",
  method: "POST",
  data,
  __responseType: undefined as unknown as LearningSessionTransitionResultV1,
});
