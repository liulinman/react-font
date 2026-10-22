import { afterEach, expect, it, vi } from "vitest";
import request from "@font/api";
import { booksApi, bookError } from "./api";
vi.mock("@font/api", () => ({ default: vi.fn() }));
afterEach(() => vi.resetAllMocks());
it("uses short job requests and polls persisted result instead of one long generation request", async () => {
  vi.mocked(request)
    .mockResolvedValueOnce({ jobId: "job", status: "pending" })
    .mockResolvedValueOnce({
      jobId: "job",
      status: "ready",
      preview: { previewId: "p", words: [], groups: [], wordCount: 0 },
    });
  const result = await booksApi.preview({ scope: "all", mode: "organized" });
  expect(result.previewId).toBe("p");
  expect(request).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({ url: "/word-books/jobs", method: "POST" }),
  );
  expect(request).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({ url: "/word-books/jobs/job", method: "GET" }),
  );
});
it("preserves actionable backend errors returned as plain objects", () => {
  expect(bookError({ message: "词库数量已变化" })).toBe("词库数量已变化");
});
