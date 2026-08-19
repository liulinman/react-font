import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { QueryClient, QueryClientProvider, type InfiniteData } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WordList } from "@/server/word/word.type";
import { MobileActivityLockProvider } from "../../offline/MobileActivityLockContext";
import { wordKeys, type MobileWordPage } from "./wordQueries";
import { MobileWordLibraryPage } from "./MobileWordLibraryPage";

const { requestMock, fetchWordsMock } = vi.hoisted(() => ({
  requestMock: vi.fn(),
  fetchWordsMock: vi.fn(),
}));

let online = true;

vi.mock("@font/api", () => ({ default: requestMock }));
vi.mock("antd-mobile", async (importOriginal) => {
  const actual = await importOriginal<typeof import("antd-mobile")>();
  return {
    ...actual,
    PullToRefresh: ({ children, onRefresh }: { children: ReactNode; onRefresh(): Promise<void> }) => (
      <section>
        <button onClick={() => void onRefresh()} type="button">下拉刷新词库</button>
        {children}
      </section>
    ),
  };
});
vi.mock("../../offline/useConnectivity", () => ({ useConnectivity: () => online }));
vi.mock("@/page/englishWorld/utils/pronunciation", () => ({
  playBritishPronunciation: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("./wordQueries", async () => {
  const actual = await vi.importActual<typeof import("./wordQueries")>("./wordQueries");
  return { ...actual, fetchMobileWords: fetchWordsMock };
});

const retain: WordList = {
  id: 4,
  englishWord: "retain",
  englishChinese: "保留",
  englishPhonetic: "/rɪˈteɪn/",
  englishLevel: 1,
};

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

function LibraryWithLocation() {
  return <><MobileWordLibraryPage /><LocationProbe /></>;
}

function renderLibrary(route = "/mobile/words?q=ret") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const result = render(
    <QueryClientProvider client={client}>
      <MobileActivityLockProvider>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="/mobile/words" element={<LibraryWithLocation />} />
            <Route path="/mobile/words/:wordId" element={<LocationProbe />} />
            <Route path="/mobile/learn" element={<LocationProbe />} />
            <Route path="/mobile/tools/context-lab/new" element={<LocationProbe />} />
          </Routes>
        </MemoryRouter>
      </MobileActivityLockProvider>
    </QueryClientProvider>,
  );
  return { ...result, client };
}

describe("MobileWordLibraryPage", () => {
  beforeEach(() => {
    online = true;
    requestMock.mockReset();
    fetchWordsMock.mockReset();
    fetchWordsMock.mockResolvedValue({ list: [retain], total: 1, totalPages: 1 });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("keeps row columns, wrapping, and selection-sheet reservation under one CSS contract", () => {
    const css = readFileSync(resolve(process.cwd(), "src/page/englishWorldMobile/features/words/MobileWordLibraryPage.css"), "utf8");
    expect(css).toContain("--mobile-word-selection-sheet-height: min(46dvh, 360px)");
    expect(css).toContain("padding-bottom: calc(var(--mobile-word-selection-sheet-height) + 56px + env(safe-area-inset-bottom, 0px))");
    expect(css).toContain("max-height: var(--mobile-word-selection-sheet-height)");
    expect(css).toContain("grid-template-columns: minmax(0, 1fr) auto auto");
    expect(css).toContain("grid-template-columns: auto minmax(0, 1fr) auto auto");
    expect(css).toContain("overflow-wrap: anywhere");
    expect(css).not.toContain("text-overflow: ellipsis");
    expect(css).not.toContain("white-space: nowrap");
  });

  it("renders compact result rows, keeps pronunciation isolated, and opens the full filter sheet", async () => {
    const user = userEvent.setup();
    renderLibrary();

    expect(await screen.findByRole("link", { name: /retain/ })).toHaveAttribute("href", "/mobile/words/4");
    await user.click(screen.getByRole("button", { name: "播放 retain 的英式发音" }));
    expect(screen.getByRole("link", { name: /retain/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "筛选" }));
    expect(screen.getByRole("dialog", { name: "筛选词库" })).toBeVisible();
    expect(screen.getByLabelText("英文单词")).toBeVisible();
    expect(screen.getByLabelText("中文释义")).toBeVisible();
    expect(screen.getByLabelText("音标")).toBeVisible();
  });

  it("owns filters in the URL and replaces navigation while preserving all desktop filters", async () => {
    const user = userEvent.setup();
    renderLibrary();

    await screen.findByRole("link", { name: /retain/ });
    await user.click(screen.getByRole("button", { name: "筛选" }));
    await user.type(screen.getByLabelText("英文单词"), "exact");
    await user.type(screen.getByLabelText("中文释义"), "释义");
    await user.selectOptions(screen.getByLabelText("掌握程度"), "3");
    await user.click(screen.getByRole("button", { name: "应用筛选" }));

    await waitFor(() => expect(fetchWordsMock).toHaveBeenLastCalledWith(expect.objectContaining({
      englishWord: "exact", englishChinese: "释义", englishLevel: 3,
    })));
    expect(screen.getByTestId("location")).toHaveTextContent("/mobile/words?q=ret&word=exact&meaning=%E9%87%8A%E4%B9%89&level=3");
  });

  it("keeps every URL filter including zero, dates, sort, and clear state", async () => {
    const user = userEvent.setup();
    renderLibrary();
    await screen.findByRole("link", { name: /retain/ });
    await user.click(screen.getByRole("button", { name: "筛选" }));
    await user.selectOptions(screen.getByLabelText("词条类型"), "0");
    await user.selectOptions(screen.getByLabelText("掌握程度"), "0");
    await user.type(screen.getByLabelText("开始日期"), "2026-08-01");
    await user.type(screen.getByLabelText("结束日期"), "2026-08-02");
    await user.selectOptions(screen.getByLabelText("排序"), "alphabetical");
    await user.click(screen.getByRole("button", { name: "应用筛选" }));
    expect(screen.getByTestId("location")).toHaveTextContent("type=0&level=0&start=2026-08-01&end=2026-08-02&sort=alphabetical");
    await user.click(screen.getByRole("button", { name: "筛选" }));
    await user.click(screen.getByRole("button", { name: "清除筛选" }));
    await user.click(screen.getByRole("button", { name: "应用筛选" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/mobile/words");
  });

  it("uses a modal bottom sheet that focuses, traps keyboard traversal, and restores focus on Escape", async () => {
    const user = userEvent.setup();
    renderLibrary();
    await screen.findByRole("link", { name: /retain/ });
    const trigger = screen.getByRole("button", { name: "筛选" });
    await user.click(trigger);
    await waitFor(() => expect(screen.getByLabelText("英文单词")).toHaveFocus());
    const close = screen.getByRole("button", { name: "关闭" });
    screen.getByRole("button", { name: "应用筛选" }).focus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "应用筛选" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "筛选词库" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("keeps a non-first filter field focused across parent query rerenders before restoring the trigger", async () => {
    const user = userEvent.setup();
    const { client } = renderLibrary();
    await screen.findByRole("link", { name: /retain/ });
    const trigger = screen.getByRole("button", { name: "筛选" });
    await user.click(trigger);
    const meaning = screen.getByLabelText("中文释义");
    meaning.focus();
    expect(meaning).toHaveFocus();

    const cacheKey = wordKeys.list({ page: 1, pageSize: 20, search: "ret" });
    act(() => {
      client.setQueryData<InfiniteData<MobileWordPage>>(cacheKey, (current) => current ? {
        ...current,
        pages: current.pages.map((page, index) => index === 0 ? {
          ...page,
          list: page.list.map((word) => word.id === retain.id ? { ...word, englishChinese: "重新保留" } : word),
        } : page),
      } : current);
    });
    expect(await screen.findByText(/重新保留/)).toBeVisible();
    await act(async () => {
      await new Promise<void>((resolveFrame) => requestAnimationFrame(() => resolveFrame()));
    });
    expect(meaning).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "筛选词库" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("resolves and globally sorts the complete deduplicated filtered result", async () => {
    const first: WordList = { id: 8, englishWord: "zebra" };
    const second: WordList = { id: 7, englishWord: "apple" };
    fetchWordsMock
      .mockResolvedValueOnce({ list: [first], total: 2, totalPages: 1 })
      .mockResolvedValueOnce({ list: [second], total: 2, totalPages: 1 });
    renderLibrary("/mobile/words?sort=alphabetical");
    await screen.findByRole("link", { name: "apple" });
    expect(screen.getAllByRole("link").slice(0, 2).map((link) => link.getAttribute("aria-label"))).toEqual(["apple", "zebra"]);
    expect(fetchWordsMock).toHaveBeenCalledTimes(2);
  });

  it("enters explicit selection mode and exposes a bottom-safe selection toolbar", async () => {
    const user = userEvent.setup();
    renderLibrary();

    await screen.findByRole("link", { name: /retain/ });
    expect(screen.getByRole("link", { name: /retain/ }).closest("article")).toHaveAttribute("data-selection-mode", "false");
    await user.click(screen.getByRole("button", { name: "选择" }));
    await user.click(screen.getByRole("checkbox", { name: "选择 retain" }));

    expect(screen.getByRole("toolbar", { name: "已选择 1 个词" })).toBeVisible();
    expect(screen.getByRole("link", { name: /retain/ }).closest("article")).toHaveAttribute("data-selection-mode", "true");
    expect(screen.getByRole("toolbar", { name: "已选择 1 个词" })).toHaveClass("mobile-word-selection-bar");
    expect(screen.getByRole("button", { name: "全选当前页" })).toBeVisible();
    expect(screen.getByRole("button", { name: "使用当前筛选结果" })).toBeVisible();
  });

  it("loads a second infinite page only while the server total has not been reached", async () => {
    const user = userEvent.setup();
    const second: WordList = { id: 5, englishWord: "resume", englishChinese: "继续" };
    fetchWordsMock
      .mockResolvedValueOnce({ list: [retain], total: 2, totalPages: 1 })
      .mockResolvedValueOnce({ list: [second], total: 2, totalPages: 1 });
    renderLibrary();

    await screen.findByRole("link", { name: "retain" });
    await user.click(screen.getByRole("button", { name: "加载更多" }));

    expect(await screen.findByRole("link", { name: "resume" })).toHaveAttribute("href", "/mobile/words/5");
    expect(fetchWordsMock).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, pageSize: 20 }));
    expect(screen.queryByRole("button", { name: "加载更多" })).not.toBeInTheDocument();
  });

  it("stops pagination when an overlapping page makes no unique progress", async () => {
    const user = userEvent.setup();
    fetchWordsMock
      .mockResolvedValueOnce({ list: [retain], total: 2, totalPages: 1 })
      .mockResolvedValueOnce({ list: [retain], total: 2, totalPages: 1 });
    renderLibrary();
    await screen.findByRole("link", { name: "retain" });
    await user.click(screen.getByRole("button", { name: "加载更多" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "加载更多" })).not.toBeInTheDocument());
    expect(screen.getAllByRole("link", { name: "retain" })).toHaveLength(1);
  });

  it("rejects a changed current-filter result before batch actions", async () => {
    const user = userEvent.setup();
    fetchWordsMock
      .mockResolvedValueOnce({ list: [retain], total: 1, totalPages: 1 })
      .mockResolvedValueOnce({ list: [retain, retain], total: 2, totalPages: 1 });
    renderLibrary();

    await screen.findByRole("link", { name: /retain/ });
    await user.click(screen.getByRole("button", { name: "选择" }));
    await user.click(screen.getByRole("button", { name: "使用当前筛选结果" }));
    await user.click(screen.getByRole("button", { name: "开始混合记忆" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("筛选结果已变化，请重新选择。");
    expect(fetchWordsMock).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, pageSize: 1 }));
  });

  it("starts mixed learning with one unique ID when a same-total filter response contains duplicates", async () => {
    const user = userEvent.setup();
    fetchWordsMock
      .mockResolvedValueOnce({ list: [retain], total: 1, totalPages: 1 })
      .mockResolvedValueOnce({ list: [retain, retain], total: 1, totalPages: 1 });
    renderLibrary();

    await screen.findByRole("link", { name: /retain/ });
    await user.click(screen.getByRole("button", { name: "选择" }));
    await user.click(screen.getByRole("button", { name: "使用当前筛选结果" }));
    await user.click(screen.getByRole("button", { name: "开始混合记忆" }));

    await waitFor(() => expect(screen.getByTestId("location").textContent).toBe("/mobile/learn?scope=selection&wordIds=4"));
    const selectedIds = new URLSearchParams(screen.getByTestId("location").textContent?.split("?")[1]).get("wordIds")?.split(",");
    expect(selectedIds).toEqual(["4"]);
  });

  it("keeps cached words and recovers with one request per refresh action", async () => {
    const user = userEvent.setup();
    const recovered = { ...retain, englishChinese: "重新保留" };
    fetchWordsMock
      .mockResolvedValueOnce({ list: [retain], total: 1, totalPages: 1 })
      .mockRejectedValueOnce(new Error("refresh failed"))
      .mockResolvedValueOnce({ list: [recovered], total: 1, totalPages: 1 });
    renderLibrary();

    await screen.findByRole("link", { name: /retain/ });
    expect(fetchWordsMock).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "下拉刷新词库" }));
    expect(await screen.findByText("刷新失败，正在显示缓存内容，内容可能不是最新。")).toBeVisible();
    expect(screen.getByRole("link", { name: /retain/ })).toBeVisible();
    expect(screen.getByRole("button", { name: "重试刷新" })).toBeVisible();
    expect(fetchWordsMock).toHaveBeenCalledTimes(2);

    await user.click(screen.getByRole("button", { name: "重试刷新" }));
    expect(await screen.findByText(/重新保留/)).toBeVisible();
    expect(screen.queryByText("刷新失败，正在显示缓存内容，内容可能不是最新。")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "重试刷新" })).not.toBeInTheDocument();
    expect(fetchWordsMock).toHaveBeenCalledTimes(3);
  });

  it("recovers a cold initial failure with one retry request", async () => {
    const user = userEvent.setup();
    fetchWordsMock
      .mockRejectedValueOnce(new Error("initial failed"))
      .mockResolvedValueOnce({ list: [retain], total: 1, totalPages: 1 });
    renderLibrary();

    expect(await screen.findByText("词库暂时无法加载，请检查网络后重试。")).toBeVisible();
    expect(screen.getByRole("button", { name: "重试加载" })).toBeVisible();
    expect(fetchWordsMock).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "重试加载" }));

    expect(await screen.findByRole("link", { name: /retain/ })).toBeVisible();
    expect(screen.queryByText("词库暂时无法加载，请检查网络后重试。")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "重试加载" })).not.toBeInTheDocument();
    expect(fetchWordsMock).toHaveBeenCalledTimes(2);
  });

  it("rolls optimistic mastery changes back when a batch request fails without invalidating the list", async () => {
    const user = userEvent.setup();
    requestMock.mockRejectedValueOnce(new Error("network"));
    const { client } = renderLibrary();
    const detail = { ...retain, englishLevel: 2 };
    client.setQueryData(wordKeys.detail(retain.id), detail);

    await screen.findByRole("link", { name: /retain/ });
    await user.click(screen.getByRole("button", { name: "选择" }));
    await user.click(screen.getByRole("checkbox", { name: "选择 retain" }));
    await user.selectOptions(screen.getByLabelText("批量掌握程度"), "3");
    await user.click(screen.getByRole("button", { name: "确认批量设置" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("批量设置失败，已恢复原来的掌握程度。");
    expect(screen.getByLabelText("掌握程度：一般")).toBeVisible();
    expect(client.getQueryData(wordKeys.detail(retain.id))).toBe(detail);
  });

  it("invalidates the word family only after a successful batch update", async () => {
    const user = userEvent.setup();
    requestMock.mockResolvedValue({});
    renderLibrary();
    await screen.findByRole("link", { name: /retain/ });
    await user.click(screen.getByRole("button", { name: "选择" }));
    await user.click(screen.getByRole("checkbox", { name: "选择 retain" }));
    await user.selectOptions(screen.getByLabelText("批量掌握程度"), "3");
    await user.click(screen.getByRole("button", { name: "确认批量设置" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("已更新所选词条的掌握程度。");
    await waitFor(() => expect(fetchWordsMock).toHaveBeenCalledTimes(2));
  });

  it("shows a precise offline cached state and never enables batch mutations offline", async () => {
    const user = userEvent.setup();
    online = false;
    renderLibrary();

    await screen.findByRole("link", { name: /retain/ });
    await user.click(screen.getByRole("button", { name: "选择" }));
    await user.click(screen.getByRole("checkbox", { name: "选择 retain" }));

    expect(screen.getByText("当前离线，正在显示已缓存的词库内容。", { selector: "p" })).toBeVisible();
    expect(screen.getByRole("button", { name: "确认批量设置" })).toBeDisabled();
  });
});
