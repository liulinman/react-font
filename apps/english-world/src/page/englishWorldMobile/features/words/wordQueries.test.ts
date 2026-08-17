import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WordList } from "@/server/word/word.type";
import {
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

  it("returns one word from the fallback detail response", async () => {
    const word: WordList = { id: 4, englishWord: "retain" };
    requestMock.mockResolvedValue([word]);

    await expect(fetchMobileWordDetail(4)).resolves.toEqual(word);
    expect(requestMock).toHaveBeenCalledWith({
      url: "/english/findWordList",
      method: "GET",
    });
  });

  it("uses a stable Chinese error when a valid detail ID is absent", async () => {
    requestMock.mockResolvedValue([{ id: 8, englishWord: "other" }]);

    await expect(fetchMobileWordDetail(4)).rejects.toThrow(
      "单词不存在或已被删除。",
    );
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
