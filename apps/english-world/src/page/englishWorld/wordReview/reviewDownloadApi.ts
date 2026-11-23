import { getApiBaseUrl } from "@font/api";

export type ReviewScope = "selected" | "filtered" | "all";
export type ReviewFormat = "pdf" | "docx" | "xlsx";
export type ReviewRow = [string, string, string];
export type ReviewPreview = { count: number; rows: ReviewRow[]; revision: string };

export type ReviewSource =
  | { scope: "selected"; ids: number[] }
  | { scope: "filtered"; filters: Record<string, unknown> }
  | { scope: "all" };

const mime: Record<ReviewFormat, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function post<T extends ReviewSource>(
  path: "preview" | "download",
  body: T,
  signal: AbortSignal,
) {
  const base = getApiBaseUrl().replace(/\/$/, "");
  return fetch(base + "/english/word-review/" + path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
}

export const REVIEW_CHANGED = "复习内容有变化，请刷新预览后再下载。";

function requireSuccess(response: Response, message: string) {
  if (response.ok) return;
  if (response.status === 401 || response.status === 403) {
    throw new Error("登录已失效，请重新登录后再试。");
  }
  if (response.status === 409) {
    throw new Error(REVIEW_CHANGED);
  }
  throw new Error(message);
}

export async function previewReview(source: ReviewSource, signal: AbortSignal): Promise<ReviewPreview> {
  const response = await post("preview", source, signal);
  const message = "加载预览失败，请重试。";
  requireSuccess(response, message);
  const body = await response.json();
  if (body.code !== 200 || !body.data) throw new Error(message);
  return body.data;
}

export async function downloadReview(
  source: ReviewSource,
  format: ReviewFormat,
  revision: string,
  signal: AbortSignal,
) {
  const response = await post("download", { ...source, format, revision }, signal);
  const message = "生成下载文件失败，请重试。";
  requireSuccess(response, message);
  if (response.headers.get("Content-Type")?.split(";")[0] !== mime[format]) {
    throw new Error(message);
  }
  const blob = await response.blob();
  if (!blob.size) throw new Error(message);

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = "freewing-word-review." + format;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
