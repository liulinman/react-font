import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  ReadingPracticeAnalytics,
  compareMetric,
  showNumber,
} from "../ReadingPracticeAnalytics";
const send = vi.hoisted(() => vi.fn());
vi.mock("@font/api", () => ({ default: send }));
const learner = {
  userId: 1,
  username: "Alice",
  accountStatus: "active",
  status: "completed",
  score: 0,
  correctCount: 0,
  total: 1,
  wrongCount: 1,
  errorRate: 100,
  startedAt: null,
  submittedAt: null,
  dataIssue: null,
};
const data = {
  practiceId: 1,
  title: "Practice analysis",
  version: 1,
  status: "published",
  gradingRevision: 0,
  generatedAt: "2026-10-15T01:00:00Z",
  summary: {
    assignedCount: 2,
    completedCount: 1,
    incompleteCount: 1,
    notStartedCount: 1,
    inProgressCount: 0,
    completionRate: 50,
    averageScore: 0,
    errorRate: 100,
    validAttempts: 1,
    wrongAttempts: 1,
    dataIssueCount: 0,
  },
  learners: [
    learner,
    {
      ...learner,
      userId: 2,
      username: "Bob",
      status: "not_started",
      score: null,
      correctCount: null,
      total: null,
      wrongCount: null,
      errorRate: null,
    },
  ],
  questions: [],
};
beforeEach(() => {
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
  send.mockResolvedValue(data);
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it("distinguishes zero scores from missing data and keeps null sorts last", () => {
  expect(showNumber(0, true)).toBe("0.0%");
  expect(showNumber(null)).toBe("—");
  const empty: any = { ...learner, score: null };
  expect(
    compareMetric(empty, learner as any, "score", "ascend"),
  ).toBeGreaterThan(0);
  expect(compareMetric(empty, learner as any, "score", "descend")).toBeLessThan(
    0,
  );
});
it("renders complete and unsubmitted learners and searches without changing summary", async () => {
  render(<ReadingPracticeAnalytics id={1} onClose={vi.fn()} />);
  await screen.findByText("Alice");
  expect(screen.getByText("Bob")).toBeInTheDocument();
  expect(screen.getByText("尚未提交")).toBeInTheDocument();
  await userEvent.type(screen.getByLabelText("搜索用户名或ID"), "Alice");
  expect(screen.queryByText("Bob")).not.toBeInTheDocument();
  expect(screen.getByText("50.0%")).toBeInTheDocument();
});
it("ignores an earlier practice response after switching practice", async () => {
  let resolveOld: (v: any) => void = () => {};
  send.mockImplementation((r: any) =>
    r.url.includes("/1/")
      ? new Promise((resolve) => {
          resolveOld = resolve;
        })
      : Promise.resolve({ ...data, practiceId: 2, title: "New practice" }),
  );
  const view = render(<ReadingPracticeAnalytics id={1} onClose={vi.fn()} />);
  view.rerender(<ReadingPracticeAnalytics id={2} onClose={vi.fn()} />);
  await screen.findByText("New practice");
  await act(async () => resolveOld(data));
  expect(screen.queryByText("Practice analysis")).not.toBeInTheDocument();
});
it("shows only current wrong answers then allows all answers", async () => {
  send.mockImplementation(async (r: any) =>
    r.url.includes("/users/")
      ? {
          practiceId: 1,
          title: data.title,
          version: 1,
          gradingRevision: 0,
          generatedAt: data.generatedAt,
          learner,
          paragraphs: ["Evidence text"],
          questions: [
            {
              id: "q1",
              number: 1,
              stem: "Wrong stem",
              options: ["A", "B"],
              selectedIndex: 1,
              correctIndex: 0,
              correct: false,
              voided: false,
              explanation: "Explanation",
              evidence: { paragraph: 1, quote: "Evidence" },
            },
            {
              id: "q2",
              number: 2,
              stem: "Correct stem",
              options: ["A", "B"],
              selectedIndex: 0,
              correctIndex: 0,
              correct: true,
              voided: false,
              explanation: "Correct explanation",
              evidence: { paragraph: 1, quote: "Evidence" },
            },
          ],
        }
      : data,
  );
  render(<ReadingPracticeAnalytics id={1} onClose={vi.fn()} />);
  await screen.findByText("Alice");
  await userEvent.click(screen.getByRole("button", { name: "答题详情" }));
  await screen.findByText("Wrong stem");
  expect(screen.queryByText("Correct stem")).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("checkbox", { name: "只看错题" }));
  expect(screen.getByText("Correct stem")).toBeInTheDocument();
});
it("discards closed student detail requests and synchronizes changed grading revision", async () => {
  let resolveOld: (v: any) => void = () => {},
    overviewReads = 0;
  const two = {
    ...data,
    learners: [learner, { ...learner, userId: 2, username: "Bob" }],
  };
  send.mockImplementation((r: any) => {
    if (r.url.endsWith("/users/1"))
      return new Promise((resolve) => {
        resolveOld = resolve;
      });
    if (r.url.endsWith("/users/2"))
      return Promise.resolve({
        practiceId: 1,
        title: data.title,
        version: 1,
        gradingRevision: 1,
        generatedAt: data.generatedAt,
        learner: { ...learner, userId: 2, username: "Bob" },
        paragraphs: [],
        questions: [],
      });
    return Promise.resolve({
      ...two,
      gradingRevision: overviewReads++ === 0 ? 0 : 1,
    });
  });
  render(<ReadingPracticeAnalytics id={1} onClose={vi.fn()} />);
  await screen.findByText("Alice");
  await userEvent.click(screen.getAllByRole("button", { name: "答题详情" })[0]);
  await userEvent.click(screen.getByRole("button", { name: "关闭详情" }));
  await userEvent.click(screen.getAllByRole("button", { name: "答题详情" })[1]);
  await screen.findByText("Bob #2");
  expect(screen.getByText(/评分已更新/)).toBeInTheDocument();
  await act(async () =>
    resolveOld({
      practiceId: 1,
      gradingRevision: 0,
      learner,
      paragraphs: [],
      questions: [],
    }),
  );
  expect(screen.queryByText("Alice #1")).not.toBeInTheDocument();
  expect(screen.getByText("Bob #2")).toBeInTheDocument();
});
it("blocks opening stale details while a newer overview is pending and ignores old in-flight details", async () => {
  let overviewReads = 0,
    resolveOverview: (v: any) => void = () => {},
    resolveDetail: (v: any) => void = () => {};
  send.mockImplementation((r: any) => {
    if (r.url.includes("/users/"))
      return new Promise((resolve) => {
        resolveDetail = resolve;
      });
    return overviewReads++ === 0
      ? Promise.resolve(data)
      : new Promise((resolve) => {
          resolveOverview = resolve;
        });
  });
  render(<ReadingPracticeAnalytics id={1} onClose={vi.fn()} />);
  await screen.findByText("Alice");
  await userEvent.click(screen.getByRole("button", { name: "答题详情" }));
  await userEvent.click(screen.getByRole("button", { name: "关闭详情" }));
  await userEvent.click(screen.getByRole("button", { name: /刷新统计/ }));
  const button = screen.getByRole("button", { name: "答题详情" });
  expect(button).toBeDisabled();
  await userEvent.click(button);
  await act(async () =>
    resolveDetail({
      practiceId: 1,
      gradingRevision: 0,
      learner,
      paragraphs: [],
      questions: [],
    }),
  );
  expect(screen.queryByText("Alice #1")).not.toBeInTheDocument();
  await act(async () => resolveOverview({ ...data, gradingRevision: 1 }));
  expect(screen.getByRole("button", { name: "答题详情" })).toBeEnabled();
  expect(screen.queryByText("Alice #1")).not.toBeInTheDocument();
  expect(
    send.mock.calls.filter(([r]) => r.url.includes("/users/")),
  ).toHaveLength(1);
});
it("does not describe a corrupt submission as having no wrong answers and keeps fixed page size", async () => {
  send.mockImplementation(async (r: any) =>
    r.url.includes("/users/")
      ? {
          practiceId: 1,
          gradingRevision: 0,
          learner: { ...learner, dataIssue: "历史答卷异常" },
          paragraphs: [],
          questions: [],
        }
      : {
          ...data,
          learners: Array.from({ length: 51 }, (_, i) => ({
            ...learner,
            userId: i + 1,
            username: `Learner${i + 1}`,
          })),
        },
  );
  render(<ReadingPracticeAnalytics id={1} onClose={vi.fn()} />);
  await screen.findByText("Learner1");
  expect(
    document.querySelector(".ant-pagination-options-size-changer"),
  ).toBeNull();
  await userEvent.click(screen.getAllByRole("button", { name: "答题详情" })[0]);
  await screen.findByText("答卷数据异常，暂时无法分析错题");
  expect(screen.queryByText(/当前没有有效错题/)).not.toBeInTheDocument();
  expect(
    screen.queryByRole("checkbox", { name: "只看错题" }),
  ).not.toBeInTheDocument();
});
