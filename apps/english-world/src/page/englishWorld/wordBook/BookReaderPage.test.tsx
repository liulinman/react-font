import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import BookReaderPage from "./BookReaderPage";
import { booksApi } from "./api";
vi.mock("./api", () => ({
  booksApi: { get: vi.fn(), update: vi.fn() },
  bookError: (e: Error) => e.message,
}));
const book = {
  id: "a",
  title: "测试复习册",
  wordCount: 1,
  words: [{ id: 1, englishWord: "abandon", englishChinese: "放弃" }],
  groups: [{ id: "g1", title: "专题", wordIds: [1] }],
  progress: { groupId: "g1" },
  createdAt: "2026-10-19",
  updatedAt: "2026-10-19",
  mode: "basic" as const,
  scope: "all" as const,
};
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  localStorage.clear();
});
function mount() {
  return render(
    <MemoryRouter initialEntries={["/book/a"]}>
      <Routes>
        <Route path="/book/:id" element={<BookReaderPage />} />
      </Routes>
    </MemoryRouter>,
  );
}
it("首次打开默认标准字号", async () => {
  vi.mocked(booksApi.get).mockResolvedValue(book);
  const view = mount();
  await screen.findAllByText("abandon");
  expect(view.container.querySelector(".book-size-1")).toBeTruthy();
});
it("阅读后立即离开仍保存最新词条，不丢失防抖窗口内的位置", async () => {
  vi.mocked(booksApi.get).mockResolvedValue(book);
  vi.mocked(booksApi.update).mockResolvedValue(book);
  const view = mount();
  await screen.findAllByText("abandon");
  await new Promise((r) => setTimeout(r, 130));
  fireEvent.click(screen.getAllByText("abandon")[0]);
  view.unmount();
  await waitFor(() =>
    expect(booksApi.update).toHaveBeenCalledWith("a", {
      progress: { groupId: "g1", wordId: 1 },
    }),
  );
});

it("恢复离开前尚未同步的本机位置，并补发到服务端", async () => {
  localStorage.setItem(
    "book-pending:a",
    JSON.stringify({ groupId: "g1", wordId: 1 }),
  );
  vi.mocked(booksApi.get).mockResolvedValue(book);
  vi.mocked(booksApi.update).mockResolvedValue(book);
  mount();
  await screen.findAllByText("abandon");
  await waitFor(() =>
    expect(booksApi.update).toHaveBeenCalledWith("a", {
      progress: { groupId: "g1", wordId: 1 },
    }),
  );
});
