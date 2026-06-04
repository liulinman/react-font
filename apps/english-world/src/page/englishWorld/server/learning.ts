import type { YTRequest } from "@font/api";
import type {
  ContextLabSubmitParams,
  DailyCoachPlan,
  DailyCoachSummary,
  LearningWord,
  MemoryMapOverview,
  MemoryMapUpdateLevelParams,
  MemoryMapWordDetailParams,
} from "../types/learning";
import type { ExerciseSubmitResponse } from "@/server/exerciseAgent/exerciseAgent";

export const dailyCoachSummary = (data: {
  days?: number;
  timezone?: number;
}): YTRequest<DailyCoachSummary> => ({
  url: "/daily-coach/summary",
  method: "POST",
  data,
  __responseType: undefined as unknown as DailyCoachSummary,
});

export const dailyCoachPlan = (data: {
  targetMinutes?: number;
  focus?: "new" | "weak" | "review";
}): YTRequest<DailyCoachPlan> => ({
  url: "/daily-coach/plan",
  method: "POST",
  data,
  __responseType: undefined as unknown as DailyCoachPlan,
});

export const contextLabSubmit = (
  data: ContextLabSubmitParams,
): YTRequest<
  ExerciseSubmitResponse & {
    score?: number;
    weakWords?: string[];
    nextSuggestions?: string[];
  }
> => ({
  url: "/context-lab/submit",
  method: "POST",
  data,
  __responseType: undefined as unknown as ExerciseSubmitResponse & {
    score?: number;
    weakWords?: string[];
    nextSuggestions?: string[];
  },
});

export const memoryMapOverview = (data: {
  days?: number;
}): YTRequest<MemoryMapOverview> => ({
  url: "/memory-map/overview",
  method: "POST",
  data,
  __responseType: undefined as unknown as MemoryMapOverview,
});

export const memoryMapWordDetail = (
  data: MemoryMapWordDetailParams,
): YTRequest<LearningWord> => ({
  url: "/memory-map/word-detail",
  method: "POST",
  data,
  __responseType: undefined as unknown as LearningWord,
});

export const memoryMapUpdateLevel = (
  data: MemoryMapUpdateLevelParams,
): YTRequest<boolean> => ({
  url: "/memory-map/update-level",
  method: "POST",
  data,
  __responseType: undefined as unknown as boolean,
});
