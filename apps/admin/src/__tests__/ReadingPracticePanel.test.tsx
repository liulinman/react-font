import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ReadingPracticePanel } from "../ReadingPracticePanel";
const send = vi.hoisted(() => vi.fn());
vi.mock("@font/api", () => ({ default: send, getApiBaseUrl: () => "/api" }));
let writes: { url: string; data: any }[];
let paper: any;
beforeEach(() => {
  writes = [];
  paper = {
    id: 1,
    title: "Garden paper",
    status: "draft",
    config: { ieltsBand: 6, questionCount: 1, targetType: "all" },
    assignedCount: 0,
    submittedCount: 0,
    workflow: {
      revision: 1,
      version: 1,
      issues: [],
      sources: [],
      reviewedQuestions: [],
    },
    content: {
      title: "Garden paper",
      paragraphs: ["A garden."],
      questions: [
        {
          id: "q1",
          kind: "choice",
          stem: "Which place?",
          options: ["Garden", "School", "Office"],
          correctIndex: 0,
          explanation: "secret explanation",
          evidence: { paragraph: 1, quote: "A garden." },
        },
      ],
    },
  };
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: () => ({
      matches: false,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
    }),
  });
  send.mockImplementation(
    async (r: { url: string; method: string; data: any }) => {
      if (r.method === "POST") {
        writes.push({ url: r.url, data: r.data });
        if (r.url.endsWith("/check"))
          paper = {
            ...paper,
            workflow: { ...paper.workflow, qualityRevision: 1 },
          };
        if (r.url.endsWith("/review"))
          paper = {
            ...paper,
            workflow: {
              ...paper.workflow,
              reviewedRevision: 1,
              reviewedQuestions: ["q1"],
            },
          };
        if (r.url.endsWith("/publish"))
          paper = { ...paper, status: "published" };
        return structuredClone(paper);
      }
      if (r.url.endsWith("/feedback")) return { list: [] };
      if (r.url === "/admin/reading-practices/1") return structuredClone(paper);
      return { list: [paper], total: 1 };
    },
  );
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("requires quality check and question confirmation, and publishes the reviewed revision", async () => {
  const user = userEvent.setup();
  render(<ReadingPracticePanel />);
  await user.click(await screen.findByRole("button", { name: "审核练习" }));
  expect(
    screen.queryByRole("button", { name: "发布给学生" }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("tab", { name: /核对题目/ }));
  await user.click(screen.getByRole("button", { name: "检查题目" }));
  await waitFor(() => expect(screen.getByRole("checkbox")).toBeEnabled());
  await user.click(screen.getByRole("checkbox"));
  expect(screen.getByRole("checkbox")).toBeChecked();
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "完成核对" })).not.toHaveClass(
      "ant-btn-loading",
    ),
  );
  expect(screen.getByRole("button", { name: "完成核对" })).toBeEnabled();
  await user.click(screen.getByRole("button", { name: "完成核对" }));
  expect(writes.some((x) => x.url.endsWith("/review"))).toBe(true);
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "发布给学生" })).toBeEnabled(),
  );
  await user.click(screen.getByRole("button", { name: "发布给学生" }));
  await user.click(await screen.findByRole("button", { name: "确认发布" }));
  await waitFor(() =>
    expect(writes.filter((x) => x.url.endsWith("/publish"))).toHaveLength(1),
  );
  expect(writes.find((x) => x.url.endsWith("/publish"))?.data).toMatchObject({
    revision: 1,
    reviewed: true,
    requestUid: expect.any(String),
  });
});
it("student preview omits answers and internal evidence", async () => {
  const user = userEvent.setup();
  render(<ReadingPracticePanel />);
  await user.click(await screen.findByRole("button", { name: "审核练习" }));
  await user.click(screen.getByRole("button", { name: "学生视角预览" }));
  const dialog = screen
    .getAllByRole("dialog")
    .find((d) => within(d).queryByText("学生视角预览 · 提交前"))!;
  expect(
    within(dialog).queryByText("secret explanation"),
  ).not.toBeInTheDocument();
  expect(within(dialog).getByText("1. Which place?")).toBeInTheDocument();
  expect(writes).toEqual([]);
});

it("opens a readable article and explains the next action without exposing empty source tools", async () => {
  const user = userEvent.setup();
  render(<ReadingPracticePanel />);
  await user.click(await screen.findByRole("button", { name: "审核练习" }));
  expect(screen.getByRole("article", { name: "阅读文章" })).toHaveTextContent(
    "A garden.",
  );
  expect(
    screen.queryByRole("textbox", { name: "练习标题" }),
  ).not.toBeInTheDocument();
  expect(screen.queryByText("上传原稿")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "下一步：核对题目" }));
  expect(screen.getByText("secret explanation")).toBeVisible();
  expect(screen.getByText("正确答案：A. Garden")).toBeVisible();
  expect(
    screen.getByText("先检查题目，再逐题确认答案和解析。全部完成后即可发布。"),
  ).toBeVisible();
  expect(writes).toEqual([]);
});

it("keeps follow-up actions visible and requires confirmation for withdrawal in More", async () => {
  paper.status = "published";
  const user = userEvent.setup();
  render(<ReadingPracticePanel />);
  expect(await screen.findByRole("button", { name: "追加接收人" })).toBeVisible();
  expect(screen.getByRole("button", { name: "完成情况" })).toBeVisible();
  expect(screen.queryByRole("button", { name: "撤回" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "更多操作：Garden paper" }));
  await user.click(await screen.findByRole("menuitem", { name: "撤回" }));
  expect(writes).toHaveLength(0);
  expect(screen.getByRole("dialog", { name: "确认撤回练习" })).toHaveTextContent("已开始者仍可提交");
  await user.click(screen.getByRole("button", { name: "确认撤回" }));
  await waitFor(() => expect(writes.filter(w => w.url.endsWith("/withdraw"))).toHaveLength(1));
});
