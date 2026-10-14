import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import request from "@font/api";
import { MobileArticleLibrary } from "./MobileArticleLibrary";
import { MobileArticleCreate } from "./MobileArticleCreate";
import { MobileArticleReader } from "./MobileArticleReader";
import { MobileArticleResult } from "./MobileArticleHistory";
vi.mock("@font/api", () => ({ default: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: 7, username: "reader" } }),
}));
const task = {
  id: 10,
  taskId: 10,
  status: "succeeded",
  sourceType: "custom",
  words: ["wander"],
  articleExerciseId: 99,
  article: "A quiet morning\n\nMaya walks beside the river every morning.",
  questions: [
    {
      id: "q1",
      stem: "Where does Maya walk?",
      options: ["By the river", "In a forest"],
      questionType: "detail",
    },
  ],
};
const result = {
  attemptId: 55,
  taskId: 10,
  articleExerciseId: 99,
  score: 100,
  correctCount: 1,
  wrongCount: 0,
  weakWords: [],
  nextSuggestions: [],
  results: [
    {
      questionId: "q1",
      correct: true,
      correctIndex: 0,
      userSelectedIndex: 0,
      explanation: "The article says she walks beside the river.",
    },
  ],
};
function mount(path = "/mobile/tools/context-lab") {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/mobile/tools/context-lab"
            element={<MobileArticleLibrary />}
          />
          <Route
            path="/mobile/tools/context-lab/new"
            element={<MobileArticleCreate />}
          />
          <Route
            path="/mobile/tools/context-lab/:taskId/read"
            element={<MobileArticleReader />}
          />
          <Route
            path="/mobile/tools/context-lab/:taskId/answer"
            element={<MobileArticleReader />}
          />
          <Route
            path="/mobile/tools/context-lab/:taskId/result/:attemptId"
            element={<MobileArticleResult />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  localStorage.clear();
  vi.mocked(request).mockImplementation(async (c) => {
    switch (c.url) {
      case "/context-lab/history":
        return { list: [task], total: 1, page: 1, pageSize: 12 };
      case "/context-lab/detail":
        return task;
      case "/context-lab/submit":
        return result;
      case "/context-lab/attempt-detail":
        return result;
      case "/context-lab/generate-task":
        return { ...task, status: "pending" };
      default:
        return {};
    }
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("opens an existing article, answers it and submits the exercise id rather than task id", async () => {
  const u = userEvent.setup();
  mount();
  await u.click(await screen.findByRole("link", { name: /A quiet morning/ }));
  expect(
    await screen.findByText("Maya walks beside the river every morning."),
  ).toBeVisible();
  await u.click(screen.getByRole("link", { name: "去答题" }));
  expect(
    await screen.findByRole("button", { name: "提交练习" }),
  ).toBeDisabled();
  await u.click(screen.getByRole("radio", { name: /By the river/ }));
  await u.click(screen.getByRole("button", { name: "提交练习" }));
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/context-lab/submit",
        data: expect.objectContaining({
          sessionId: 99,
          answers: [{ questionId: "q1", selectedIndex: 0 }],
        }),
      }),
    ),
  );
  expect(
    await screen.findByText("The article says she walks beside the river."),
  ).toBeVisible();
});
it("preserves answers across remount without auto-submitting", async () => {
  const u = userEvent.setup();
  const page = mount("/mobile/tools/context-lab/10/answer");
  await u.click(await screen.findByRole("radio", { name: /By the river/ }));
  page.unmount();
  mount("/mobile/tools/context-lab/10/answer");
  expect(
    await screen.findByRole("radio", { name: /By the river/ }),
  ).toBeChecked();
  expect(request).not.toHaveBeenCalledWith(
    expect.objectContaining({ url: "/context-lab/submit" }),
  );
});
it("creates practice from pasted material using the existing generation contract", async () => {
  const u = userEvent.setup();
  mount("/mobile/tools/context-lab/new");
  await u.selectOptions(screen.getByLabelText("材料来源"), "pasted-article");
  await u.type(
    screen.getByLabelText("文章内容"),
    "Maya walks beside the river every morning.",
  );
  await u.click(screen.getByRole("button", { name: "生成文章与练习" }));
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/context-lab/generate-task",
        data: expect.objectContaining({
          sourceType: "pasted-article",
          pastedContent: "Maya walks beside the river every morning.",
          pastedQuestionMode: "auto",
        }),
      }),
    ),
  );
});
it("does not submit a task without its article exercise identifier", async () => {
  const original = vi.mocked(request).getMockImplementation()!;
  vi.mocked(request).mockImplementation((c) =>
    c.url === "/context-lab/detail"
      ? Promise.resolve({ ...task, articleExerciseId: undefined })
      : original(c),
  );
  const u = userEvent.setup();
  mount("/mobile/tools/context-lab/10/answer");
  await u.click(await screen.findByRole("radio", { name: /By the river/ }));
  expect(screen.getByRole("button", { name: "提交练习" })).toBeDisabled();
  expect(screen.getByRole("alert")).toHaveTextContent("练习编号");
});
it("restores the current retry from the ordinary article entry", async () => {
  const u = userEvent.setup();
  const page = mount("/mobile/tools/context-lab/10/answer?round=retry-55");
  await u.click(await screen.findByRole("radio", { name: /In a forest/ }));
  page.unmount();
  mount("/mobile/tools/context-lab/10/answer");
  expect(
    await screen.findByRole("radio", { name: /In a forest/ }),
  ).toBeChecked();
});
it("persists a late score without redirecting away from the article list", async () => {
  let resolve!: (v: unknown) => void;
  const original = vi.mocked(request).getMockImplementation()!;
  vi.mocked(request).mockImplementation((c) =>
    c.url === "/context-lab/submit"
      ? new Promise((r) => {
          resolve = r;
        })
      : original(c),
  );
  const u = userEvent.setup();
  mount("/mobile/tools/context-lab/10/answer");
  await u.click(await screen.findByRole("radio", { name: /By the river/ }));
  await u.click(screen.getByRole("button", { name: "提交练习" }));
  await u.click(screen.getByRole("link", { name: "← 我的文章" }));
  await screen.findByRole("heading", { name: "在文章里，读懂单词" });
  resolve(result);
  await waitFor(() =>
    expect(
      JSON.parse(
        localStorage.getItem("english-world:study:v1:7:article:10:first")!,
      ).result.attemptId,
    ).toBe(55),
  );
  expect(
    screen.getByRole("heading", { name: "在文章里，读懂单词" }),
  ).toBeVisible();
});
it("retains pending protection after an uncertain submission and remount", async () => {
  const original = vi.mocked(request).getMockImplementation()!;
  vi.mocked(request).mockImplementation((c) =>
    c.url === "/context-lab/submit"
      ? Promise.reject(new Error("network"))
      : original(c),
  );
  const u = userEvent.setup();
  const page = mount("/mobile/tools/context-lab/10/answer");
  await u.click(await screen.findByRole("radio", { name: /By the river/ }));
  await u.click(screen.getByRole("button", { name: "提交练习" }));
  await screen.findByText(/未确认提交结果/);
  page.unmount();
  mount("/mobile/tools/context-lab/10/answer");
  expect(
    await screen.findByRole("button", { name: "提交练习" }),
  ).toBeDisabled();
  expect(
    vi
      .mocked(request)
      .mock.calls.filter(([c]) => c.url === "/context-lab/submit"),
  ).toHaveLength(1);
});
it('shows one question at a time and preserves its answer while consulting the article',async()=>{
 const original=vi.mocked(request).getMockImplementation()!;
 vi.mocked(request).mockImplementation(c=>c.url==='/context-lab/detail'?Promise.resolve({...task,questions:[...task.questions,{id:'q2',stem:'When does Maya walk?',options:['Every morning','At night']}]}):original(c));
 const u=userEvent.setup();const page=mount('/mobile/tools/context-lab/10/answer');
 expect(await screen.findByRole('heading',{name:'Where does Maya walk?'})).toBeVisible();expect(screen.queryByText('When does Maya walk?')).not.toBeInTheDocument();
 await u.click(screen.getByRole('radio',{name:/By the river/}));await u.click(screen.getByRole('button',{name:'下一题'}));
 expect(await screen.findByRole('heading',{name:'When does Maya walk?'})).toBeVisible();await u.click(screen.getByRole('radio',{name:/Every morning/}));
 await u.click(screen.getByRole('button',{name:'查看原文'}));expect(screen.getByRole('dialog',{name:'文章原文'})).toBeVisible();await u.click(screen.getByRole('button',{name:'返回答题'}));expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(screen.getByRole('radio',{name:/Every morning/})).toBeChecked();
 page.unmount();mount('/mobile/tools/context-lab/10/answer');expect(await screen.findByRole('heading',{name:'When does Maya walk?'})).toBeVisible();await u.click(screen.getByRole('button',{name:'上一题'}));expect(screen.getByRole('radio',{name:/By the river/})).toBeChecked();
 expect(request).not.toHaveBeenCalledWith(expect.objectContaining({url:'/context-lab/submit'}));
});
it("keeps generation preferences after success without reusing the previous material", async () => {
  const u = userEvent.setup();
  const page = mount("/mobile/tools/context-lab/new");
  await u.selectOptions(screen.getByLabelText("材料来源"), "pasted-article");
  await u.type(screen.getByLabelText("文章内容"), "A new passage about rivers.");
  await u.selectOptions(screen.getByLabelText("题目处理"), "generate");
  await u.selectOptions(screen.getByLabelText("题目数量"), "5");
  await u.selectOptions(screen.getByLabelText("阅读难度"), "6.5");
  await u.selectOptions(screen.getByLabelText("生成模型"), "gpt");
  await u.click(screen.getByRole("button", { name: "生成文章与练习" }));
  await screen.findByText("Maya walks beside the river every morning.");
  page.unmount();
  mount("/mobile/tools/context-lab/new");
  expect(screen.getByLabelText("材料来源")).toHaveValue("pasted-article");
  expect(screen.getByLabelText("文章内容")).toHaveValue("");
  expect(screen.getByLabelText("题目数量")).toHaveValue("5");
  expect(screen.getByLabelText("阅读难度")).toHaveValue("6.5");
  expect(screen.getByLabelText("生成模型")).toHaveValue("gpt");
});
it("summarizes the actual question handling rather than promising a count for parsed questions", async () => {
  const u = userEvent.setup();
  mount("/mobile/tools/context-lab/new");
  await u.selectOptions(screen.getByLabelText("材料来源"), "pasted-article");
  await u.selectOptions(screen.getByLabelText("题目处理"), "generate");
  await u.selectOptions(screen.getByLabelText("题目数量"), "5");
  expect(screen.getByRole("region", { name: "本次练习" })).toHaveTextContent("生成 5 道题");
  await u.selectOptions(screen.getByLabelText("题目处理"), "parse");
  expect(screen.getByRole("region", { name: "本次练习" })).toHaveTextContent("保留材料中的题目");
  expect(screen.getByRole("region", { name: "本次练习" })).not.toHaveTextContent("生成 5 道题");
});
