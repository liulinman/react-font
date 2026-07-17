import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WordList } from "@/server/word/word.type";
import { applyWordLevelUpdates, useWordList } from "./useWordList";

const { requestMock } = vi.hoisted(() => ({
  requestMock: vi.fn(),
}));

vi.mock("@font/api", () => ({
  default: requestMock,
}));

type WordListResponse = {
  list: WordList[];
  total: number;
  totalPages: number;
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

beforeEach(() => {
  requestMock.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("applyWordLevelUpdates", () => {
  it("patches matching words without changing other records", () => {
    const first = { id: 1, englishWord: "humor", englishLevel: 1 };
    const second = { id: 2, englishWord: "march", englishLevel: 0 };

    const result = applyWordLevelUpdates([first, second], [
      { id: 1, englishLevel: 3 },
    ]);

    expect(result).toEqual([
      { ...first, englishLevel: 3 },
      second,
    ]);
    expect(result[1]).toBe(second);
  });
});

describe("useWordList", () => {
  it("ignores an older response that finishes after the current page", async () => {
    const firstPage = deferred<WordListResponse>();
    const secondPage = deferred<WordListResponse>();
    requestMock
      .mockImplementationOnce(() => firstPage.promise)
      .mockImplementationOnce(() => secondPage.promise);

    const { result } = renderHook(() => useWordList(10));

    await waitFor(() => expect(requestMock).toHaveBeenCalledTimes(1));
    act(() => result.current.changePage(2, 10));
    await waitFor(() => expect(requestMock).toHaveBeenCalledTimes(2));

    await act(async () => {
      secondPage.resolve({
        list: [{ id: 20, englishWord: "second-page" }],
        total: 20,
        totalPages: 2,
      });
      await secondPage.promise;
    });

    await act(async () => {
      firstPage.resolve({
        list: [{ id: 1, englishWord: "stale-first-page" }],
        total: 20,
        totalPages: 2,
      });
      await firstPage.promise;
    });

    expect(result.current.page).toBe(2);
    expect(result.current.wordList).toEqual([
      { id: 20, englishWord: "second-page" },
    ]);
  });

  it("issues one filtered request when searching from another page", async () => {
    requestMock.mockResolvedValue({ list: [], total: 0, totalPages: 0 });
    const { result } = renderHook(() => useWordList(10));

    await waitFor(() => expect(requestMock).toHaveBeenCalledTimes(1));
    act(() => result.current.changePage(2, 10));
    await waitFor(() => expect(requestMock).toHaveBeenCalledTimes(2));

    await act(async () => {
      await result.current.search({ englishWord: "humor" });
    });
    await waitFor(() => expect(result.current.page).toBe(1));
    await waitFor(() => {
      const filteredCalls = requestMock.mock.calls.filter(
        ([config]) => config.data?.englishWord === "humor",
      );
      expect(filteredCalls).toHaveLength(1);
    });
  });

  it("returns to page one when page size changes", async () => {
    requestMock.mockResolvedValue({ list: [], total: 100, totalPages: 10 });
    const { result } = renderHook(() => useWordList(10));

    await waitFor(() => expect(requestMock).toHaveBeenCalledTimes(1));
    act(() => result.current.changePage(4, 10));
    await waitFor(() => expect(result.current.page).toBe(4));

    act(() => result.current.changePage(4, 20));

    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(20);
  });

  it("moves to the last valid page when refresh reduces the total", async () => {
    let secondPageRequests = 0;
    requestMock.mockImplementation((config) => {
      if (config.data?.page === 2) {
        secondPageRequests += 1;
        return Promise.resolve(
          secondPageRequests === 1
            ? {
                list: [{ id: 11, englishWord: "last-item" }],
                total: 11,
                totalPages: 2,
              }
            : { list: [], total: 10, totalPages: 1 },
        );
      }
      return Promise.resolve({
        list: [{ id: 1, englishWord: "first-page" }],
        total: secondPageRequests > 0 ? 10 : 11,
        totalPages: secondPageRequests > 0 ? 1 : 2,
      });
    });
    const { result } = renderHook(() => useWordList(10));

    await waitFor(() => expect(requestMock).toHaveBeenCalledTimes(1));
    act(() => result.current.changePage(2, 10));
    await waitFor(() => expect(result.current.wordList[0]?.id).toBe(11));

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => expect(result.current.page).toBe(1));
    await waitFor(() =>
      expect(result.current.wordList).toEqual([
        { id: 1, englishWord: "first-page" },
      ]),
    );
  });
});
