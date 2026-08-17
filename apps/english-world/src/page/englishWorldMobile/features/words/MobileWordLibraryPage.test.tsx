import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WordList } from "@/server/word/word.type";
import { MobileActivityLockProvider } from "../../offline/MobileActivityLockContext";
import { MobileWordLibraryPage } from "./MobileWordLibraryPage";

const { requestMock, fetchWordsMock } = vi.hoisted(() => ({
  requestMock: vi.fn(),
  fetchWordsMock: vi.fn(),
}));

let online = true;

vi.mock("@font/api", () => ({ default: requestMock }));
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
  return render(
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

  it("enters explicit selection mode and exposes a bottom-safe selection toolbar", async () => {
    const user = userEvent.setup();
    renderLibrary();

    await screen.findByRole("link", { name: /retain/ });
    await user.click(screen.getByRole("button", { name: "选择" }));
    await user.click(screen.getByRole("checkbox", { name: "选择 retain" }));

    expect(screen.getByRole("toolbar", { name: "已选择 1 个词" })).toBeVisible();
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

  it("rejects a changed current-filter result before batch actions", async () => {
    const user = userEvent.setup();
    fetchWordsMock
      .mockResolvedValueOnce({ list: [retain], total: 1, totalPages: 1 })
      .mockResolvedValueOnce({ list: [retain], total: 2, totalPages: 1 });
    renderLibrary();

    await screen.findByRole("link", { name: /retain/ });
    await user.click(screen.getByRole("button", { name: "选择" }));
    await user.click(screen.getByRole("button", { name: "使用当前筛选结果" }));
    await user.click(screen.getByRole("button", { name: "开始混合记忆" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("筛选结果已变化，请重新选择。");
    expect(fetchWordsMock).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, pageSize: 1 }));
  });

  it("rolls optimistic mastery changes back when a batch request fails without invalidating the list", async () => {
    const user = userEvent.setup();
    requestMock.mockRejectedValueOnce(new Error("network"));
    renderLibrary();

    await screen.findByRole("link", { name: /retain/ });
    await user.click(screen.getByRole("button", { name: "选择" }));
    await user.click(screen.getByRole("checkbox", { name: "选择 retain" }));
    await user.selectOptions(screen.getByLabelText("批量掌握程度"), "3");
    await user.click(screen.getByRole("button", { name: "确认批量设置" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("批量设置失败，已恢复原来的掌握程度。");
    expect(screen.getByLabelText("掌握程度：一般")).toBeVisible();
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
