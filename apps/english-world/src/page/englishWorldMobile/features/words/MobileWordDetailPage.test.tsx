import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WordList } from "@/server/word/word.type";
import { MobileActivityLockProvider } from "../../offline/MobileActivityLockContext";
import { MobileWordDetailPage } from "./MobileWordDetailPage";

const { requestMock, fetchDetailMock, recordMock, listMock } = vi.hoisted(() => ({
  requestMock: vi.fn(),
  fetchDetailMock: vi.fn(),
  recordMock: vi.fn(),
  listMock: vi.fn(),
}));

const auth = { user: { id: 7, username: "mobile-user" } };
let online = true;

vi.mock("@font/api", () => ({ default: requestMock }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("antd-mobile", async (importOriginal) => {
  const actual = await importOriginal<typeof import("antd-mobile")>();
  return {
    ...actual,
    PullToRefresh: ({ children }: { children: ReactNode }) => <>{children}</>,
  };
});
vi.mock("../../offline/useConnectivity", () => ({ useConnectivity: () => online }));
vi.mock("@/page/englishWorld/utils/pronunciation", () => ({
  playBritishPronunciation: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../features/home/recentWordStore", () => ({
  recentWordStore: { record: recordMock, list: listMock },
}));
vi.mock("./wordQueries", async () => {
  const actual = await vi.importActual<typeof import("./wordQueries")>("./wordQueries");
  return { ...actual, fetchMobileWordDetail: fetchDetailMock };
});

const retain: WordList = {
  id: 4,
  englishWord: "retain",
  englishChinese: "保留",
  englishPhonetic: "/rɪˈteɪn/",
  englishType: 0,
  englishLevel: 1,
  englishPartSpeech: [1],
  englishNote: "keep or continue to have",
  englishReference: "https://example.com/retain",
  englishImg: "https://example.com/retain.png",
  englishCreateTime: "2026-08-01 10:00:00",
  englishUpdateTime: "2026-08-10 12:00:00",
};

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

function renderDetail(route = "/mobile/words/4") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MobileActivityLockProvider>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="/mobile/words/:wordId" element={<MobileWordDetailPage />} />
            <Route path="/mobile/words" element={<LocationProbe />} />
            <Route path="/mobile/words/:wordId/edit" element={<LocationProbe />} />
            <Route path="/mobile/learn" element={<LocationProbe />} />
          </Routes>
        </MemoryRouter>
      </MobileActivityLockProvider>
    </QueryClientProvider>,
  );
}

describe("MobileWordDetailPage", () => {
  beforeEach(() => {
    online = true;
    requestMock.mockReset();
    fetchDetailMock.mockReset();
    recordMock.mockReset();
    listMock.mockReset();
    fetchDetailMock.mockResolvedValue(retain);
    requestMock.mockResolvedValue(true);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders complete detail sections after loading and records a recent view", async () => {
    renderDetail();

    expect(await screen.findByRole("heading", { name: "retain" })).toBeVisible();
    expect(screen.getByText("/rɪˈteɪn/")).toBeVisible();
    expect(screen.getByText("保留")).toBeVisible();
    expect(screen.getByText("来源")).toBeVisible();
    expect(screen.getByText("keep or continue to have")).toBeVisible();
    expect(screen.getByText("动词")).toBeVisible();
    expect(screen.getByRole("button", { name: "播放 retain 的英式发音" })).toBeVisible();
    expect(screen.getByRole("link", { name: "百度查询" })).toHaveAttribute(
      "href",
      "https://www.baidu.com/s?wd=retain",
    );

    // A successful load records the word in the recent-word store once.
    await waitFor(() => expect(recordMock).toHaveBeenCalledTimes(1));
    expect(recordMock).toHaveBeenCalledWith(auth.user.id, retain);
    expect(listMock).not.toHaveBeenCalled();
  });

  it("prefers the list cache before falling back to the broad detail fetch", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const cacheWord: WordList = { ...retain, englishChinese: "缓存释义" };
    // Seed the list cache so the detail page can resolve the word without a network call.
    await act(async () => {
      client.setQueryData(
        ["mobile", "words", "list", { page: 1, pageSize: 20 }],
        { list: [cacheWord], total: 1, totalPages: 1 },
      );
    });

    render(
      <QueryClientProvider client={client}>
        <MobileActivityLockProvider>
          <MemoryRouter initialEntries={["/mobile/words/4"]}>
            <Routes>
              <Route path="/mobile/words/:wordId" element={<MobileWordDetailPage />} />
            </Routes>
          </MemoryRouter>
        </MobileActivityLockProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("缓存释义")).toBeVisible();
    expect(fetchDetailMock).not.toHaveBeenCalled();
  });

  it("shows a named destructive confirmation and never deletes before confirm", async () => {
    const user = userEvent.setup();
    renderDetail();
    await screen.findByRole("heading", { name: "retain" });

    await user.click(screen.getByRole("button", { name: "删除单词" }));
    const dialog = screen.getByRole("dialog", { name: "删除 retain？" });
    expect(dialog).toBeVisible();
    expect(dialog).toHaveTextContent("删除后无法恢复");
    // Opening the dialog must not yet fire the delete request.
    expect(requestMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ url: "/english/delEnglishWord" }),
    );
  });

  it("deletes on confirm, invalidates the word, and returns to the library", async () => {
    const user = userEvent.setup();
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidate = vi.fn();
    client.invalidateQueries = invalidate;

    render(
      <QueryClientProvider client={client}>
        <MobileActivityLockProvider>
          <MemoryRouter initialEntries={["/mobile/words/4"]}>
            <Routes>
              <Route path="/mobile/words/:wordId" element={<MobileWordDetailPage />} />
              <Route path="/mobile/words" element={<LocationProbe />} />
            </Routes>
          </MemoryRouter>
        </MobileActivityLockProvider>
      </QueryClientProvider>,
    );
    await screen.findByRole("heading", { name: "retain" });

    await user.click(screen.getByRole("button", { name: "删除单词" }));
    // antd-mobile's Dialog action-row keeps `pointer-events: none` until the
    // open animation finishes; jsdom never fires that animation, so userEvent
    // (which checks pointer-events) rejects the click. fireEvent bypasses that
    // guard — the same approach the desktop Dialog tests rely on.
    fireEvent.click(screen.getByRole("button", { name: "确认删除" }));

    await waitFor(() =>
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/english/delEnglishWord", data: { id: 4 } }),
      ),
    );
    await waitFor(() => expect(invalidate).toHaveBeenCalled());
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["mobile", "words"] });
    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("/mobile/words"),
    );
  });

  it("blocks delete while offline and never drafts or queues it", async () => {
    online = false;
    renderDetail();
    await screen.findByRole("heading", { name: "retain" });

    expect(screen.getByRole("button", { name: "删除单词" })).toBeDisabled();
    expect(requestMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ url: "/english/delEnglishWord" }),
    );
  });

  it("opens the full-screen image viewer when the word image is tapped", async () => {
    const user = userEvent.setup();
    renderDetail();
    await screen.findByRole("heading", { name: "retain" });

    await user.click(screen.getByRole("button", { name: "查看 retain 图片" }));
    expect(await screen.findByRole("dialog", { name: "retain 图片" })).toBeVisible();
  });

  it("shows an offline-aware error and a retry when the word cannot be loaded", async () => {
    fetchDetailMock.mockRejectedValue(new Error("单词不存在或已被删除。"));
    renderDetail();

    expect(await screen.findByText(/单词不存在或已被删除/)).toBeVisible();
    expect(screen.getByRole("button", { name: "重试" })).toBeVisible();
    expect(recordMock).not.toHaveBeenCalled();
  });
});
