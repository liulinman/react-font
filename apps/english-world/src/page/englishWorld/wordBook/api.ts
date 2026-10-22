import request from "@font/api";
import type { WordList } from "@/server/word/word.type";
export type BookWord = WordList & { keyPoints?: string[] };
export type BookGroup = {
  id: string;
  title: string;
  wordIds: number[];
  notes?: { text: string; sourceWordIds: number[] }[];
};
export type BookScope = "selected" | "filtered" | "all";
export type BookSource = {
  scope: BookScope;
  ids?: number[];
  filters?: Record<string, unknown>;
  mode: "organized" | "basic";
  expectedCount?: number;
};
export type BookPreview = {
  previewId: string;
  wordCount: number;
  words: BookWord[];
  groups: BookGroup[];
  mode: "organized" | "basic";
  scope: BookScope;
};
export type Book = Omit<BookPreview, "previewId"> & {
  id: string;
  title: string;
  progress: { groupId: string; wordId?: number };
  createdAt: string;
  updatedAt: string;
};
export type BookSummary = Pick<
  Book,
  "id" | "title" | "wordCount" | "mode" | "createdAt" | "updatedAt" | "progress"
>;
export type BookJob = {
  savedBookId?: string;
  jobId: string;
  status: "pending" | "ready" | "failed";
  preview?: BookPreview;
  error?: string;
};
export async function waitForBookJob(
  jobId: string,
  signal?: AbortSignal,
): Promise<BookPreview> {
  for (;;) {
    signal?.throwIfAborted();
    const job = await request<BookJob>({
      url: `/word-books/jobs/${encodeURIComponent(jobId)}`,
      method: "GET",
      config: { suppressErrorMessage: true, signal },
    });
    if (job.savedBookId)
      throw Object.assign(new Error("这份整理已保存"), {
        savedBookId: job.savedBookId,
      });
    if (job.status === "ready" && job.preview) return job.preview;
    if (job.status === "failed")
      throw new Error(job.error || "整理失败，请重试。");
    await new Promise<void>((resolve, reject) => {
      const done = () => {
        signal?.removeEventListener("abort", abort);
        resolve();
      };
      const timer = setTimeout(done, 2000);
      const abort = () => {
        clearTimeout(timer);
        reject(new Error("已停止等待，后台任务仍保留。"));
      };
      signal?.addEventListener("abort", abort, { once: true });
    });
  }
}
const options = { suppressErrorMessage: true };
export const booksApi = {
  counts: (data: { ids?: number[]; filters?: Record<string, unknown> }) =>
    request<{ selected: number; filtered: number; all: number }>({
      url: "/word-books/counts",
      method: "POST",
      data,
      config: options,
    }),
  currentJob: () =>
    request<BookJob | null>({
      url: "/word-books/jobs/current",
      method: "GET",
      config: options,
    }),
  preview: async (data: BookSource, signal?: AbortSignal) => {
    const job = await request<BookJob>({
      url: "/word-books/jobs",
      method: "POST",
      data,
      config: { ...options, signal },
    });
    return waitForBookJob(job.jobId, signal);
  },
  create: (data: {
    requestId: string;
    title: string;
    previewId: string;
    groups: BookGroup[];
  }) =>
    request<Book>({
      url: "/word-books",
      method: "POST",
      data,
      config: options,
    }),
  list: () =>
    request<{ list: BookSummary[]; total: number }>({
      url: "/word-books",
      method: "GET",
      config: options,
    }),
  get: (id: string) =>
    request<Book>({
      url: `/word-books/${encodeURIComponent(id)}`,
      method: "GET",
      config: options,
    }),
  update: (
    id: string,
    data: { title?: string; groups?: BookGroup[]; progress?: Book["progress"] },
  ) =>
    request<Book>({
      url: `/word-books/${encodeURIComponent(id)}`,
      method: "PUT",
      data,
      config: options,
    }),
  remove: (id: string) =>
    request({
      url: `/word-books/${encodeURIComponent(id)}`,
      method: "DELETE",
      config: options,
    }),
};
export const bookError = (error: unknown) => {
  const message = (error as { message?: unknown })?.message;
  return typeof message === "string" ? message : "操作失败，请重试。";
};
