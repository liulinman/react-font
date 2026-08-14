import type { YTRequest } from "@font/api";
import type {
  ContextLabAttempt,
  ContextLabAttemptDetailParams,
  ContextLabAttemptHistoryParams,
  ContextLabAttemptHistoryResponse,
  ContextLabDeleteAttemptParams,
  ContextLabDeleteResponse,
  ContextLabDeleteTaskParams,
  ContextLabDetailParams,
  ContextLabSubmitParams,
  ContextLabSubmitResult,
  ContextLabGenerateParams,
  ContextLabHistoryParams,
  ContextLabHistoryResponse,
  ContextLabModelProvider,
  ContextLabTask,
  DailyCoachPlan,
  DailyCoachSummary,
  LearningWord,
  MemoryMapOverview,
  MemoryMapUpdateLevelParams,
  MemoryMapWordDetailParams,
} from "../types/learning";
import { getApiBaseUrl } from "@font/api";

export {
  completeLearningSession,
  createLearningSession,
  learningCapabilities,
  learningSessionDetail,
  pauseLearningSession,
  previewLearningSession,
  submitLearningAttempt,
} from "../learning/api/learningApi";
export { learningKeys } from "../learning/api/learningKeys";

export const dailyCoachSummary = (data: {
  days?: number;
  timezone?: number;
  timezoneOffsetMinutes?: number;
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

export const contextLabTranslateArticle = (data: {
  article: string;
  modelProvider?: ContextLabModelProvider;
}): YTRequest<{ translations: string[] }> => ({
  url: "/context-lab/translate-article",
  method: "POST",
  data,
  __responseType: undefined as unknown as { translations: string[] },
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

type ContextLabTaskStreamPayload =
  | { type: "task-updated"; task?: ContextLabTask }
  | { type: "connected" | "heartbeat"; data?: unknown }
  | { type: string; task?: ContextLabTask; data?: unknown };

function parseContextLabTaskStreamLine(
  line: string,
): ContextLabTaskStreamPayload | null {
  if (!line.startsWith("data: ")) return null;
  const payload = line.slice(6).trim();
  if (!payload) return null;
  try {
    return JSON.parse(payload) as ContextLabTaskStreamPayload;
  } catch {
    return null;
  }
}

export function subscribeContextLabTaskEvents(
  onTaskUpdate: (task: ContextLabTask) => void,
  onError?: (error: Error) => void,
) {
  const controller = new AbortController();
  let active = true;

  void (async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/context-lab/task-events`, {
        method: "GET",
        credentials: "include",
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        throw new Error("任务状态订阅失败");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (active) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const event = parseContextLabTaskStreamLine(line);
          if (event?.type === "task-updated" && event.task) {
            onTaskUpdate(event.task);
          }
        }
      }
    } catch (error) {
      if ((error as { name?: string }).name !== "AbortError") {
        onError?.(error instanceof Error ? error : new Error("任务状态订阅失败"));
      }
    }
  })();

  return () => {
    active = false;
    controller.abort();
  };
}

export const contextLabAttemptHistory = (
  data: ContextLabAttemptHistoryParams,
): YTRequest<ContextLabAttemptHistoryResponse> => ({
  url: "/context-lab/attempt-history",
  method: "POST",
  data,
  __responseType: undefined as unknown as ContextLabAttemptHistoryResponse,
});

export const contextLabAttemptDetail = (
  data: ContextLabAttemptDetailParams,
): YTRequest<ContextLabAttempt> => ({
  url: "/context-lab/attempt-detail",
  method: "POST",
  data,
  __responseType: undefined as unknown as ContextLabAttempt,
});

export const contextLabDeleteAttempt = (
  data: ContextLabDeleteAttemptParams,
): YTRequest<ContextLabDeleteResponse> => ({
  url: "/context-lab/delete-attempt",
  method: "POST",
  data,
  __responseType: undefined as unknown as ContextLabDeleteResponse,
});

export const contextLabDeleteTask = (
  data: ContextLabDeleteTaskParams,
): YTRequest<ContextLabDeleteResponse> => ({
  url: "/context-lab/delete-task",
  method: "POST",
  data,
  __responseType: undefined as unknown as ContextLabDeleteResponse,
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
