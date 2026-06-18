import type { DailyCoachAction } from "../types/learning";

export type PlanReviewParams = {
  source?: string;
  title?: string;
  wordIds: number[];
};

export function createPlanReviewSearch(action: DailyCoachAction): string {
  const params = new URLSearchParams();
  const wordIds = action.wordIds ?? [];
  params.set("source", action.type);
  params.set("title", action.title);
  params.set("wordIds", wordIds.join(","));
  return params.toString();
}

export function parsePlanReviewSearch(search: string): PlanReviewParams {
  const params = new URLSearchParams(search);
  const wordIds = (params.get("wordIds") ?? "")
    .split(",")
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);

  return {
    source: params.get("source") ?? undefined,
    title: params.get("title") ?? undefined,
    wordIds,
  };
}
