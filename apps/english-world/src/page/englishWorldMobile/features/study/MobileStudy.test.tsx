import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import request from "@font/api";
import { MobileLearnPage } from "./MobileLearnPage";
import { MobileReviewPage } from "./MobileReviewPage";
const account = vi.hoisted(() => ({ id: 7, username: "reader" }));
vi.mock("@font/api", () => ({ default: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: account }),
}));
vi.mock("../../MobileBritishPronunciationButton", () => ({
  MobileBritishPronunciationButton: () => <button>播放英式发音</button>,
}));
const words = [
  {
    id: 1,
    englishWord: "serendipity",
    englishChinese: "意外的美好",
    englishLevel: 0,
  },
  { id: 2, englishWord: "wander", englishChinese: "漫步", englishLevel: 0 },
];
function mount(page: React.ReactNode, route = "/mobile/learn") {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter initialEntries={[route]}>{page}</MemoryRouter>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  account.id = 7;
  localStorage.clear();
  vi.mocked(request).mockImplementation(async (config) => {
    if (config.url === "/english/findWordList") throw new Error("404");
    if (config.url === "/english/filterWordList") return { list: words, total: words.length, totalPages: 1 };
    if (config.url === "/recite/start")
      return {
        questions: [
          { wordId: 1, question: "意外的美好", direction: 0 },
          { wordId: 2, question: "漫步", direction: 0 },
        ],
        direction: 0,
        totalCount: 2,
      };
    if (config.url === "/recite/submit")
      return {
        sessionId: 19,
        statistics: {
          totalCount: 2,
          correctCount: 1,
          errorCount: 1,
          accuracy: 50,
        },
        results: [
          {
            wordId: 1,
            englishWord: "serendipity",
            correctAnswer: "serendipity",
            userAnswer: "serendipity",
            isCorrect: true,
          },
          {
            wordId: 2,
            englishWord: "wander",
            correctAnswer: "wander",
            userAnswer: "",
            isCorrect: false,
          },
        ],
      };
    return {};
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("learns only selected words, reveals meaning and saves mastery before completion", async () => {
  const u = userEvent.setup();
  mount(<MobileLearnPage />, "/mobile/learn?wordIds=2");
  await u.click(await screen.findByRole("button", { name: "开始学习" }));
  expect(await screen.findByText("wander")).toBeVisible();
  expect(screen.queryByText("漫步")).not.toBeInTheDocument();
  await u.click(screen.getByRole("button", { name: "查看释义" }));
  expect(screen.getByText("漫步")).toBeVisible();
  await u.click(screen.getByRole("button", { name: "记住了" }));
  expect(
    await screen.findByRole("heading", { name: "这一组，学完了" }),
  ).toBeVisible();
  expect(request).toHaveBeenCalledWith(
    expect.objectContaining({
      url: "/english/updateEnglishWordLevel",
      data: { id: 2, englishLevel: 2 },
    }),
  );
});
it("keeps the current card and permits explicit retry after mastery update fails", async () => {
  const original = vi.mocked(request).getMockImplementation()!;
  vi.mocked(request).mockImplementation(async (c) => {
    if (c.url.includes("updateEnglishWordLevel")) throw Error("offline");
    return original(c);
  });
  const u = userEvent.setup();
  mount(<MobileLearnPage />, "/mobile/learn?wordIds=1");
  await u.click(await screen.findByRole("button", { name: "开始学习" }));
  await u.click(screen.getByRole("button", { name: "查看释义" }));
  await u.click(screen.getByRole("button", { name: "记住了" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("尚未保存");
  expect(screen.getByText("serendipity")).toBeVisible();
  expect(
    screen.queryByRole("heading", { name: "这一组，学完了" }),
  ).not.toBeInTheDocument();
});
it("preserves review answers across navigation and submits unanswered questions as empty", async () => {
  const u = userEvent.setup();
  const page = mount(<MobileReviewPage />, "/mobile/review");
  await u.click(screen.getByRole("button", { name: "开始复习" }));
  await u.type(
    await screen.findByRole("textbox", { name: "你的答案" }),
    "serendipity",
  );
  await u.click(screen.getByRole("button", { name: "下一词" }));
  page.unmount();
  mount(<MobileReviewPage />, "/mobile/review");
  expect(await screen.findByText("漫步")).toBeVisible();
  await u.click(screen.getByRole("button", { name: "上一词" }));
  expect(screen.getByRole("textbox", { name: "你的答案" })).toHaveValue(
    "serendipity",
  );
  await u.click(screen.getByRole("button", { name: "下一词" }));
  await u.click(screen.getByRole("button", { name: "完成并查看结果" }));
  expect(
    await screen.findByRole("heading", { name: "复习完成" }),
  ).toBeVisible();
  expect(request).toHaveBeenCalledWith(
    expect.objectContaining({
      url: "/recite/submit",
      data: {
        direction: 0,
        answers: [
          { wordId: 1, userAnswer: "serendipity" },
          { wordId: 2, userAnswer: "" },
        ],
      },
    }),
  );
  await u.click(screen.getByRole("button", { name: "重练错词 · 1" }));
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/recite/start",
        data: expect.objectContaining({ wordIds: [2], wordCount: 1 }),
      }),
    ),
  );
});
it("does not automatically resubmit a restored review", async () => {
  const u = userEvent.setup();
  const page = mount(<MobileReviewPage />);
  await u.click(screen.getByRole("button", { name: "开始复习" }));
  await screen.findByText("意外的美好");
  page.unmount();
  vi.mocked(request).mockClear();
  mount(<MobileReviewPage />);
  await screen.findByText("意外的美好");
  expect(request).not.toHaveBeenCalledWith(
    expect.objectContaining({ url: "/recite/submit" }),
  );
});
it("never displays an active draft while a historical result is loading", async () => {
  const u = userEvent.setup();
  const page = mount(<MobileReviewPage />, "/mobile/review");
  await u.click(screen.getByRole("button", { name: "开始复习" }));
  await screen.findByText("意外的美好");
  page.unmount();
  vi.mocked(request).mockImplementation(() => new Promise(() => {}));
  mount(<MobileReviewPage />, "/mobile/review?sessionId=99");
  expect(
    screen.queryByRole("textbox", { name: "你的答案" }),
  ).not.toBeInTheDocument();
  expect(screen.getByText("正在读取复习记录…")).toBeVisible();
});
it("persists submission ownership across navigation until its result is known", async () => {
  let finish: (r: unknown) => void = () => {};
  const original = vi.mocked(request).getMockImplementation()!;
  vi.mocked(request).mockImplementation((c) =>
    c.url === "/recite/submit"
      ? new Promise((r) => {
          finish = r;
        })
      : original(c),
  );
  const u = userEvent.setup();
  const page = mount(<MobileReviewPage />);
  await u.click(screen.getByRole("button", { name: "开始复习" }));
  await screen.findByText("意外的美好");
  await u.click(screen.getByRole("button", { name: "下一词" }));
  await u.click(screen.getByRole("button", { name: "完成并查看结果" }));
  page.unmount();
  const second = mount(<MobileReviewPage />);
  expect(screen.getByRole("button", { name: "上一词" })).toBeDisabled();
  expect(
    await screen.findByRole("button", { name: "完成并查看结果" }),
  ).toBeDisabled();
  finish({
    sessionId: 4,
    statistics: {
      totalCount: 2,
      correctCount: 2,
      errorCount: 0,
      accuracy: 100,
    },
    results: [],
  });
  await waitFor(() =>
    expect(localStorage.getItem("english-world:study:v1:7:review:")).toContain(
      '"sessionId":4',
    ),
  );
  second.unmount();
  mount(<MobileReviewPage />);
  expect(
    await screen.findByRole("heading", { name: "复习完成" }),
  ).toBeVisible();
});
it("keeps one user’s unfinished cards separate from another user", async () => {
  const u = userEvent.setup();
  const page = mount(<MobileLearnPage />, "/mobile/learn?wordIds=2");
  await u.click(await screen.findByRole("button", { name: "开始学习" }));
  await screen.findByText("wander");
  page.unmount();
  account.id = 8;
  mount(<MobileLearnPage />, "/mobile/learn?wordIds=2");
  expect(await screen.findByRole("button", { name: "开始学习" })).toBeVisible();
  expect(
    screen.queryByRole("button", { name: "查看释义" }),
  ).not.toBeInTheDocument();
});
it("ignores a corrupt saved session and allows a fresh start", async () => {
  localStorage.setItem(
    "english-world:study:v1:7:cards:",
    '{"words":[null],"index":-1}',
  );
  mount(<MobileLearnPage />);
  expect(await screen.findByRole("button", { name: "开始学习" })).toBeVisible();
});
it("leaves a historical result for a dedicated wrong-word setup", async () => {
  localStorage.setItem(
    "english-world:study:v1:7:review:2",
    JSON.stringify({
      questions: [{ wordId: 2, question: "wander", direction: 1 }],
      direction: 1,
      answers: {},
      index: 0,
      result: {
        sessionId: 999,
        statistics: {
          totalCount: 1,
          correctCount: 1,
          errorCount: 0,
          accuracy: 100,
        },
        results: [],
      },
    }),
  );
  const original = vi.mocked(request).getMockImplementation()!;
  vi.mocked(request).mockImplementation((c) =>
    c.url === "/recite/session-result"
      ? original({ url: "/recite/submit", method: "POST" })
      : original(c),
  );
  const u = userEvent.setup();
  mount(<MobileReviewPage />, "/mobile/review?sessionId=19");
  await u.click(await screen.findByRole("button", { name: "重练错词 · 1" }));
  expect(await screen.findByText("选中的 1 个词")).toBeVisible();
  expect(screen.getByRole("button", { name: "开始复习" })).toBeVisible();
  await u.click(screen.getByRole("button", { name: "开始复习" }));
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/recite/start",
        data: expect.objectContaining({ wordIds: [2] }),
      }),
    ),
  );
});

it("retries a failed later page and learns the selected word beyond page one", async () => {
  const u = userEvent.setup();
  const firstPage = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, englishWord: "word" + i, englishLevel: 0 }));
  let failSecondPage = true;
  vi.mocked(request).mockImplementation(async (config) => {
    if (config.url !== "/english/filterWordList") throw new Error("Unexpected endpoint");
    const data = config.data as { page: number };
    if (data.page === 1) return { list: firstPage, total: 101, totalPages: 2 };
    if (failSecondPage) throw new Error("Connection interrupted");
    return { list: [{ id: 101, englishWord: "beyond", englishChinese: "超越", englishLevel: 0 }], total: 101, totalPages: 2 };
  });
  mount(<MobileLearnPage />, "/mobile/learn?wordIds=101");
  expect(await screen.findByText("词库加载失败，请重试。")).toBeVisible();
  expect(screen.getByRole("button", { name: "开始学习" })).toBeDisabled();
  failSecondPage = false;
  await u.click(screen.getByRole("button", { name: "重新加载" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "开始学习" })).toBeEnabled());
  await u.click(screen.getByRole("button", { name: "开始学习" }));
  expect(await screen.findByText("beyond")).toBeVisible();
  expect(screen.queryByText("word0")).not.toBeInTheDocument();
});
