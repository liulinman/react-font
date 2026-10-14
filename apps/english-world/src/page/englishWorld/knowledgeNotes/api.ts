import request from "@font/api";
export const NOTE_CATEGORIES = [
  "语法",
  "句型",
  "词语辨析",
  "阅读技巧",
  "易错点",
  "其他",
] as const;
export type NoteWord = { id: number; englishWord: string };
export type NoteFields = {
  title: string;
  body: string;
  category: string;
  examples: string;
  source: string;
  wordIds: number[];
};
export type KnowledgeNote = Omit<NoteFields, "wordIds"> & {
  id: number;
  version: number;
  words: NoteWord[];
  createdAt: string;
  updatedAt: string;
};
export type NotePage = {
  list: KnowledgeNote[];
  total: number;
  page: number;
  pageSize: number;
};
export type NoteFilters = {
  q?: string;
  category?: string;
  page?: number;
  wordId?: number;
};
export const notesApi = {
  list: (data: NoteFilters) =>
    request<NotePage>({ url: "/knowledge-notes", method: "GET", data }),
  get: (id: number) =>
    request<KnowledgeNote>({ url: `/knowledge-notes/${id}`, method: "GET" }),
  create: (data: NoteFields & { requestId: string }) =>
    request<KnowledgeNote>({
      url: "/knowledge-notes",
      method: "POST",
      data,
      config: { suppressErrorMessage: true },
    }),
  update: (id: number, data: NoteFields & { version: number }) =>
    request<KnowledgeNote>({
      url: `/knowledge-notes/${id}`,
      method: "PUT",
      data,
      config: { suppressErrorMessage: true },
    }),
  remove: (id: number) =>
    request({ url: `/knowledge-notes/${id}`, method: "DELETE" }),
  words: (q: string) =>
    request<NoteWord[]>({
      url: "/knowledge-notes/words",
      method: "GET",
      data: { q },
    }),
  copy: (id: number) =>
    request<NoteWord & { englishNote: string; englishReference: string }>({
      url: `/knowledge-notes/copy-source/${id}`,
      method: "GET",
    }),
};
export function noteError(error: unknown) {
  const message = (error as { message?: unknown })?.message;
  return typeof message === "string"
    ? message
    : "保存失败，请检查网络后重试。输入已保留。";
}
export function newRequestId() {
  // getRandomValues is available on HTTP origins where randomUUID may be unavailable.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
