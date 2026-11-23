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
it("automatically checks and publishes with one human confirmation", async () => {
  const user = userEvent.setup(); render(<ReadingPracticePanel />);
  await user.click(await screen.findByRole("button", { name: "审核练习" }));
  await waitFor(() => expect(writes.some((x) => x.url.endsWith("/check"))).toBe(true));
  expect(screen.queryByRole("checkbox", { name: "我已核对这道题的答案和解析" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "完成核对" })).not.toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole("button", { name: "确认并发布" })).toBeEnabled());
  await user.click(screen.getByRole("button", { name: "确认并发布" }));
  expect(writes.some((x) => x.url.endsWith("/publish"))).toBe(false);
  await user.click(await screen.findByRole("button", { name: "确认发布" }));
  await waitFor(() => expect(writes.filter((x) => x.url.endsWith("/publish"))).toHaveLength(1));
  expect(writes.find((x) => x.url.endsWith("/publish"))?.data).toMatchObject({revision:1,reviewed:true,confirmAll:true,requestUid:expect.any(String)});
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
  expect(writes.filter((x) => !x.url.endsWith("/check"))).toEqual([]);
});

it("edits explanation in place and saves with a single recheck action", async () => {
  paper.workflow.qualityRevision = 1;
  const base = send.getMockImplementation()!;
  send.mockImplementation(async (r) => {
    if (r.url.endsWith("/save-check")) { writes.push({url:r.url,data:r.data}); paper={...paper,content:r.data.content,workflow:{...paper.workflow,revision:2,qualityRevision:2,autoReview:{status:"ready"}}}; return structuredClone(paper); }
    return base(r);
  });
  const user=userEvent.setup();render(<ReadingPracticePanel />);
  await user.click(await screen.findByRole("button",{name:"审核练习"}));
  await user.click(screen.getByRole("button",{name:"修改本题"}));
  const explanation=screen.getByRole("textbox",{name:"就地修改解析"}); await user.clear(explanation);await user.type(explanation,"修改后的解析");
  await user.click(screen.getByRole("button",{name:"保存并复查本题"}));
  await waitFor(()=>expect(writes.find((x)=>x.url.endsWith("/save-check"))?.data.content.questions[0].explanation).toBe("修改后的解析"));
  await waitFor(()=>expect(screen.getByRole("button",{name:"确认并发布"})).toBeEnabled());
});
it("keeps follow-up actions visible and requires confirmation for withdrawal in More", async () => {
  paper.status = "published";
  const user = userEvent.setup();
  render(<ReadingPracticePanel />);
  expect(
    await screen.findByRole("button", { name: "追加接收人" }),
  ).toBeVisible();
  expect(screen.getByRole("button", { name: "完成情况" })).toBeVisible();
  expect(
    screen.queryByRole("button", { name: "撤回" }),
  ).not.toBeInTheDocument();
  await user.click(
    screen.getByRole("button", { name: "更多操作：Garden paper" }),
  );
  await user.click(await screen.findByRole("menuitem", { name: "撤回" }));
  expect(writes).toHaveLength(0);
  expect(
    screen.getByRole("dialog", { name: "确认撤回练习" }),
  ).toHaveTextContent("已开始者仍可提交");
  await user.click(screen.getByRole("button", { name: "确认撤回" }));
  await waitFor(() =>
    expect(writes.filter((w) => w.url.endsWith("/withdraw"))).toHaveLength(1),
  );
});
it("shows imported question counts only after recognition and retries recognition", async () => {
  paper = {
    ...paper,
    status: "failed",
    content: undefined,
    recognizedQuestionCount: null,
    workflow: { ...paper.workflow, sourceType: "files" },
    config: { ...paper.config, questionCount: 5 },
  };
  render(<ReadingPracticePanel />);
  expect(await screen.findByText(/题数待识别/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "重试识别" })).toBeInTheDocument();
  expect(screen.queryByText(/5 题/)).not.toBeInTheDocument();
});
it("shows actual imported count from list metadata without requiring full content", async () => {
  paper = {
    ...paper,
    content: undefined,
    recognizedQuestionCount: 1,
    workflow: { ...paper.workflow, sourceType: "files" },
    config: { ...paper.config, questionCount: 5 },
  };
  render(<ReadingPracticePanel />);
  expect(await screen.findByText(/材料导入 · 1 题/)).toBeInTheDocument();
  expect(screen.queryByText(/题数待识别/)).not.toBeInTheDocument();
});

it("blocks publishing for incomplete answers without individual checkboxes", async () => {
  paper.content.questions[0].correctIndex=null;paper.content.questions[0].explanation="";paper.workflow.qualityRevision=1;
  const user=userEvent.setup();render(<ReadingPracticePanel />);await user.click(await screen.findByRole("button",{name:"审核练习"}));
  expect(screen.getByRole("button",{name:"确认并发布"})).toBeDisabled();expect(screen.getByRole("button",{name:"重新检查"})).toBeEnabled();
});
it("shows all six matching options and allows reviewing a complete matching question", async () => {
  paper.content.questions[0] = {...paper.content.questions[0],kind:"matching_features",options:["A Alice","B Ben","C Carol","D Dan","E Eve","F Frank"],correctIndex:5};
  paper.workflow.qualityRevision=1;
  const user=userEvent.setup();render(<ReadingPracticePanel/>);
  await user.click(await screen.findByRole("button",{name:"审核练习"}));
  await user.click(screen.getByRole("tab",{name:/核对题目/}));
  expect(screen.getByText("F Frank")).toBeInTheDocument();
  expect(screen.queryByText("F. F Frank")).not.toBeInTheDocument();
  expect(screen.getByRole("button",{name:"确认并发布"})).toBeEnabled();
});

it("marks two findings on one question once and provides a reliable jump and repair request", async () => {
  paper.workflow.qualityRevision = 1;
  paper.workflow.lastCheckSummary = { repairedQuestionIds: [], repairs: [], remainingIssueCount: 2 };
  paper.workflow.issues = [
    { id: "s1", blocking: true, questionId: "q1", type: "structure", field: "evidence", actualParagraph: 1, expectedParagraph: 2, quote: "A garden.", message: "evidence.paragraph 不匹配" },
    { id: "a1", blocking: true, questionId: "q1", type: "ai", message: "请核实引用段落" },
  ];
  const scroll = vi.fn();
  const oldScroll = HTMLElement.prototype.scrollIntoView;
  HTMLElement.prototype.scrollIntoView = scroll;
  try {
    const user = userEvent.setup();
    render(<ReadingPracticePanel />);
    await user.click(await screen.findByRole("button", { name: "审核练习" }));
    await user.click(screen.getByRole("tab", { name: /核对题目/ }));
    expect(screen.getByText("0 题正常、1 题待处理")).toBeVisible();
    expect(screen.getByText(/共 1 题，1 题有提示/)).toBeVisible();
    expect(screen.getByText("引用段落：当前第 1 段，原文位于第 2 段")).toBeVisible();
    expect(screen.queryByText(/evidence\.paragraph/)).not.toBeInTheDocument();
    expect(screen.getAllByText("引用段落 不匹配")).toHaveLength(2);
    expect(screen.getByText("已检查，仍有 1 题待处理；本次已修复 0 题").closest(".ant-alert")).toHaveClass("ant-alert-warning");
    expect(screen.queryByText(/^依据：$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^建议：$/)).not.toBeInTheDocument();
    const card = document.getElementById("review-question-q1")!;
    expect(within(card).getByText("待处理")).toBeVisible();
    await user.click(screen.getAllByRole("button", { name: "定位题目与依据" })[0]);
    await waitFor(() => expect(scroll).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "确认并发布" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "重新检查" }));
    await waitFor(() => expect(writes.find((x) => x.url.endsWith("/check"))?.data).toEqual({ revision: 1, repair: true }));
    expect(send.mock.calls.find(([r]) => r.url.endsWith("/check"))?.[0].config.timeout).toBe(300000);
    expect(writes.some((x) => x.url.endsWith("/review") || x.url.endsWith("/publish"))).toBe(false);
  } finally {
    HTMLElement.prototype.scrollIntoView = oldScroll;
  }
});

it("replaces stale findings with repaired content and requires teacher confirmation", async () => {
  paper.workflow.qualityRevision = 1;
  paper.workflow.issues = [{ id: "old", questionId: "q1", type: "structure", message: "旧的出处错误" }];
  const baseSend = send.getMockImplementation()!;
  send.mockImplementation(async (r) => {
    if (r.url.endsWith("/check")) {
      paper.workflow.issues = [];
      paper.workflow.lastCheckSummary = { repairedQuestionIds: ["q1"], repairs: [{ questionId: "q1", message: "引用段落已修正" }], remainingIssueCount: 0 };
    }
    return baseSend(r);
  });
  const user = userEvent.setup();
  render(<ReadingPracticePanel />);
  await user.click(await screen.findByRole("button", { name: "审核练习" }));
  await user.click(screen.getByRole("tab", { name: /核对题目/ }));
  expect(screen.getAllByText("旧的出处错误").length).toBeGreaterThan(0);
  await user.click(screen.getByRole("button", { name: "重新检查" }));
  await waitFor(() => expect(screen.queryByText("旧的出处错误")).not.toBeInTheDocument());
  expect(screen.getByText("本次已修复 1 题，检查结果已更新")).toBeVisible();
  expect(screen.getByText("1 题正常、0 题待处理")).toBeVisible();
  expect(screen.queryByRole("checkbox", { name: "我已核对这道题的答案和解析" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "确认并发布" })).toBeEnabled();
});

it('shows a dedicated original-source verification path and refreshes the publication block', async () => {
  const user = userEvent.setup();
  paper.workflow.qualityRevision = 1;
  paper.workflow.sources = [{ id: 'source-1', name: '原稿42页.jpg', mime: 'image/jpeg', url: '/admin/reading-practices/sources/source-1', size: 100, pages: 1 }];
  paper.workflow.issues = [{ id: 'ocr-1', type: 'source_text', questionId: 'q1', blocking: true, message: 'OCR拼写疑问，请核对 Alassk' }];
  const original = send.getMockImplementation()!;
  send.mockImplementation(async r => {
    if (r.url.endsWith('/verify-source-issue')) {
      writes.push({ url: r.url, data: r.data });
      paper.workflow.issues[0].resolved = true;
      return structuredClone(paper);
    }
    return original(r);
  });
  render(<ReadingPracticePanel />);
  await user.click(await screen.findByRole('button', { name: '审核练习' }));
  expect(screen.getByRole('button', { name: '确认并发布' })).toBeDisabled();
  await user.click(screen.getByText('核对原稿文字'));
  await user.type(screen.getByLabelText('核对说明'), '原稿印刷与当前文字一致');
  await user.type(screen.getByLabelText('原稿依据'), '42页右栏 Alassk');
  await user.click(screen.getByRole('checkbox', { name: '我已查看所选原稿，确认当前文字与原稿一致' }));
  await user.click(screen.getByRole('button', { name: '确认与原稿一致' }));
  await waitFor(() => expect(writes.find(x => x.url.endsWith('/verify-source-issue'))?.data).toEqual({ revision: 1, issueId: 'ocr-1', sourceId: 'source-1', reason: '原稿印刷与当前文字一致', evidence: '42页右栏 Alassk' }));
  await waitFor(() => expect(screen.getByRole('button', { name: '确认并发布' })).toBeEnabled());
  expect(writes.some(x => x.url.endsWith('/publish'))).toBe(false);
});

it('routes actual missing-source blocks to materials and shows the blocking reason in the footer', async () => {
  const user = userEvent.setup();
  paper.workflow.qualityRevision = 1;
  paper.workflow.issues = [{ id: 'missing-1', type: 'source', questionId: 'q1', blocking: true, message: '缺少第2页原稿' }];
  render(<ReadingPracticePanel />);
  await user.click(await screen.findByRole('button', { name: '审核练习' }));
  expect(screen.queryByText('核对原稿文字')).not.toBeInTheDocument();
  expect(screen.getByText('发布前需处理：缺少第2页原稿')).toBeVisible();
  await user.click(screen.getByRole('button', { name: '前往处理' }));
  expect(screen.getByRole('tab', { name: '原稿与历史' })).toHaveAttribute('aria-selected', 'true');
});
