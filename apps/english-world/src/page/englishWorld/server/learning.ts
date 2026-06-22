import type { YTRequest } from "@font/api";
import type {
  ContextLabDetailParams,
  ContextLabSubmitParams,
  ContextLabSubmitResult,
  ContextLabGenerateParams,
  ContextLabHistoryParams,
  ContextLabHistoryResponse,
  ContextLabTask,
  DailyCoachPlan,
  DailyCoachSummary,
  LearningWord,
  MemoryMapOverview,
  MemoryMapUpdateLevelParams,
  MemoryMapWordDetailParams,
} from "../types/learning";
import { getApiBaseUrl } from "@font/api";

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
): YTRequest<ContextLabSubmitResult> => ({
  url: "/context-lab/submit",
  method: "POST",
  data,
  __responseType: undefined as unknown as ContextLabSubmitResult,
});

export const contextLabCreateTask = (
  data: ContextLabGenerateParams,
): YTRequest<ContextLabTask> => ({
  url: "/context-lab/generate-task",
  method: "POST",
  data,
  __responseType: undefined as unknown as ContextLabTask,
});

export const contextLabHistory = (
  data: ContextLabHistoryParams = {},
): YTRequest<ContextLabHistoryResponse> => ({
  url: "/context-lab/history",
  method: "POST",
  data,
  __responseType: undefined as unknown as ContextLabHistoryResponse,
});

export const contextLabDetail = (
  data: ContextLabDetailParams,
): YTRequest<ContextLabTask> => ({
  url: "/context-lab/detail",
  method: "POST",
  data,
  __responseType: undefined as unknown as ContextLabTask,
});

export async function downloadContextLabPdfTemplate() {
  const response = await fetch(`${getApiBaseUrl()}/context-lab/pdf-template`, {
    method: "GET",
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("PDF 模板下载失败");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ai-article-exercise-template.pdf";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function downloadContextLabTaskPdf(taskId: number) {
  const response = await fetch(
    `${getApiBaseUrl()}/context-lab/pdf-task?taskId=${encodeURIComponent(
      taskId,
    )}`,
    {
      method: "GET",
      credentials: "include",
    },
  );
  if (!response.ok) {
    throw new Error("本次练习 PDF 下载失败");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ai-article-exercise-${taskId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

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
