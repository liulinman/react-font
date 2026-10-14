import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WordList } from "@/server/word/word.type";
import {
  fetchAllMobileWords,
  fetchMobileWordDetail,
  fetchMobileWords,
  findWordById,
  wordKeys,
} from "./wordQueries";

const { requestMock } = vi.hoisted(() => ({
  requestMock: vi.fn(),
}));

vi.mock("@font/api", () => ({
  default: requestMock,
}));

describe("mobile word queries", () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("copies caller filters into a stable list key", () => {
    const filters = { page: 1, pageSize: 20, search: "retain" };
    const key = wordKeys.list(filters);

    filters.search = "changed";

    expect(key).toEqual([
      "mobile",
      "words",
      "list",
      { page: 1, pageSize: 20, search: "retain" },
    ]);
    expect(key[3]).not.toBe(filters);
  });

  it("sends every explicit mobile filter in the word-list request", async () => {
    const page = {
      list: [{ id: 4, englishWord: "retain", englishChinese: "保留" }],
      total: 1,
      totalPages: 1,
    };
    requestMock.mockResolvedValue(page);

    await expect(
      fetchMobileWords({
        page: 2,
        pageSize: 20,
        search: "search word",
        englishWord: "exact word",
        englishChinese: "释义",
        englishPhonetic: "/ɪɡˈzækt/",
        englishType: 0,
        englishLevel: 3,
        startTime: "2026-08-01",
        endTime: "2026-08-02",
      }),
    ).resolves.toEqual(page);

    expect(requestMock).toHaveBeenCalledWith({
      url: "/english/filterWordList",
      method: "POST",
      data: {
        page: 2,
        pageSize: 20,
        englishWord: "exact word",
        englishChinese: "释义",
        englishPhonetic: "/ɪɡˈzækt/",
        englishType: 0,
        englishLevel: 3,
        startTime: "2026-08-01",
        endTime: "2026-08-02",
      },
    });
  });

  it("maps mobile q truthfully to Chinese, English, or an exact existing label without sending sort to the API", async () => {
    requestMock.mockResolvedValue({ list: [], total: 0, totalPages: 0 });

    await fetchMobileWords({ page: 1, pageSize: 20, search: "保留", sort: "alphabetical" });
    expect(requestMock).toHaveBeenLastCalledWith(expect.objectContaining({
      data: { page: 1, pageSize: 20, englishChinese: "保留" },
    }));

    await fetchMobileWords({ page: 1, pageSize: 20, search: "精通" });
    expect(requestMock).toHaveBeenLastCalledWith(expect.objectContaining({
      data: { page: 1, pageSize: 20, englishLevel: 3 },
    }));

    expect(wordKeys.lists).toEqual(["mobile", "words", "list"]);
    expect(wordKeys.list({ page: 1, pageSize: 20, search: "retain", sort: "alphabetical" })).toEqual([
      "mobile", "words", "list", { page: 1, pageSize: 20, search: "retain", sort: "alphabetical" },
    ]);
  });

  it("rejects invalid detail IDs before requesting the broad fallback", async () => {
    await expect(fetchMobileWordDetail(0)).rejects.toThrow("单词 ID 无效。");
    expect(requestMock).not.toHaveBeenCalled();
  });

  it("returns one word using the supported paginated endpoint", async () => {
    const word: WordList = { id: 4, englishWord: "retain" };
    requestMock.mockResolvedValue({ list: [word], total: 1, totalPages: 1 });

    await expect(fetchMobileWordDetail(4)).resolves.toEqual(word);
    expect(requestMock).toHaveBeenCalledWith({
      url: "/english/filterWordList",
      method: "POST",
      data: { page: 1, pageSize: 100 },
    });
  });

  it("uses a stable Chinese error when a valid detail ID is absent", async () => {
    requestMock.mockResolvedValue({ list: [{ id: 8, englishWord: "other" }], total: 1, totalPages: 1 });

    await expect(fetchMobileWordDetail(4)).rejects.toThrow(
      "单词不存在或已被删除。",
    );
  });


  const firstPage = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, englishWord: "word" + i }));
  it("loads a detail beyond the first 100 words", async () => {
    const target = { id: 101, englishWord: "target" };
    requestMock.mockResolvedValueOnce({ list: firstPage, total: 101, totalPages: 2 })
      .mockResolvedValueOnce({ list: [target], total: 101, totalPages: 2 });
    await expect(fetchMobileWordDetail(101)).resolves.toEqual(target);
    expect(requestMock).toHaveBeenLastCalledWith({
      url: "/english/filterWordList", method: "POST", data: { page: 2, pageSize: 100 },
    });
  });

  it("allows an empty vocabulary", async () => {
    requestMock.mockResolvedValue({ list: [], total: 0, totalPages: 0 });
    await expect(fetchAllMobileWords()).resolves.toEqual([]);
  });

  it("propagates a later-page failure instead of returning partial vocabulary", async () => {
    requestMock.mockResolvedValueOnce({ list: firstPage, total: 101, totalPages: 2 })
      .mockRejectedValueOnce(new Error("network unavailable"));
    await expect(fetchMobileWordDetail(101)).rejects.toThrow("network unavailable");
  });

  it.each([
    { list: [firstPage[0]], total: 101, totalPages: 2 },
    { list: [], total: 101, totalPages: 2 },
    { list: [{ id: 101, englishWord: "target" }], total: 102, totalPages: 2 },
  ])("rejects inconsistent later pages without looping: %j", async (secondPage) => {
    requestMock.mockResolvedValueOnce({ list: firstPage, total: 101, totalPages: 2 })
      .mockResolvedValueOnce(secondPage);
    await expect(fetchAllMobileWords()).rejects.toThrow("请重新加载");
    expect(requestMock).toHaveBeenCalledTimes(2);
  });

  it("finds a cached word across pages or returns null", () => {
    const first: WordList = { id: 1, englishWord: "first" };
    const second: WordList = { id: 2, englishWord: "second" };
    const pages = [
      { list: [first], total: 2, totalPages: 2 },
      { list: [second], total: 2, totalPages: 2 },
    ];

    expect(findWordById(pages, 2)).toBe(second);
    expect(findWordById(pages, 3)).toBeNull();
  });
});
