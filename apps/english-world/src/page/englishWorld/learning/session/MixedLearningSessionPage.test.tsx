import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { LearningSessionDetailV1 } from "../contracts/learning-session";
import { MixedLearningSessionPage } from "./MixedLearningSessionPage";

const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }));

vi.mock("@font/api", async () => {
  const actual = await vi.importActual<typeof import("@font/api")>("@font/api");
  return { ...actual, default: requestMock, request: requestMock };
});

const activeSnapshot: LearningSessionDetailV1 = {
  sessionId: 42,
  status: "active",
  sessionVersion: 3,
  submittedResults: [],
  currentItem: {
    schemaVersion: 1,
    mode: "listening",
    phase: "recall",
    itemId: 71,
    item: {
      itemType: "listening_spelling",
      itemUid: "opaque-item-71",
      wordId: 7,
      audio: {
        britishUrl:
          "/api/learning-session/audio/7/11111111-1111-4111-8111-111111111111.mp3",
      },
      spellingCue: { firstLetter: "r", length: 19 },
    },
  },
};

const completedSnapshot: LearningSessionDetailV1 = {
  sessionId: 42,
  status: "completed",
  sessionVersion: 4,
  submittedResults: [
    {
      attemptId: 91,
      itemId: 71,
      status: "final",
      outcome: "correct",
      dimensionResults: [{ dimension: "spelling", outcome: "correct" }],
      sessionVersion: 4,
    },
  ],
  result: {
    completedWords: 3,
    elapsedSeconds: 84,
    independentCorrect: 1,
    hintedCorrect: 1,
    needsWork: 1,
    pending: 0,
    levelChanges: 1,
    words: [
      {
        wordId: 7,
        word: "result-visible-word",
        originalLevel: 0,
        systemLevel: 1,
        manualLevel: null,
        nextReviewAt: "2026-08-05T00:00:00.000Z",
        recommendedMode: "listening",
      },
    ],
  },
};

const outputSnapshot: LearningSessionDetailV1 = {
  sessionId: 42,
  status: "active",
  sessionVersion: 6,
  submittedResults: [],
  currentItem: {
    schemaVersion: 1,
    mode: "output",
    phase: "recall",
    itemId: 74,
    item: {
      itemType: "output_word",
      itemUid: "output-74",
      wordId: 7,
      prompt: "请根据释义写出目标英文单词。",
      cue: { firstLetter: "i", length: 7 },
    },
  },
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/englishWorld/learn/session/42"]}>
        <Routes>
          <Route
            path="/englishWorld/learn/session/:sessionId"
            element={<MixedLearningSessionPage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("MixedLearningSessionPage", () => {
  beforeEach(() => {
    requestMock.mockReset();
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("submits a public draft with deduplicated hints and renders the authoritative completed result", async () => {
    const user = userEvent.setup();
    let detailCount = 0;
    requestMock.mockImplementation(async (descriptor: { url: string }) => {
      if (descriptor.url === "/learning-session/detail") {
        detailCount += 1;
        return detailCount === 1 ? activeSnapshot : completedSnapshot;
      }
      if (descriptor.url === "/learning-session/submit") {
        return {
          attemptId: 91,
          status: "final",
          outcome: "correct",
          dimensionResults: [{ dimension: "spelling", outcome: "correct" }],
          feedback: {
            kind: "spelling",
            expected: "result-visible-word",
            diff: [{ text: "result-visible-word", kind: "same" }],
          },
          sessionVersion: 4,
        };
      }
      throw new Error(`unexpected request: ${descriptor.url}`);
    });
    renderPage();

    expect(await screen.findByRole("textbox", { name: "输入听到的单词" })).toBeVisible();
    expect(document.body).not.toHaveTextContent("result-visible-word");
    await user.click(screen.getByRole("button", { name: "0.8 倍慢速重播" }));
    await user.click(screen.getByRole("button", { name: "查看拼写提示" }));
    expect(screen.getByRole("status", { name: "拼写提示" })).toHaveTextContent(
      "首字母 r，共 19 个字母",
    );
    const input = screen.getByRole("textbox", { name: "输入听到的单词" });
    await user.type(input, "learner-response");
    await user.click(screen.getByRole("button", { name: "提交答案" }));

    expect(await screen.findByRole("heading", { name: "学习结果" })).toBeVisible();
    expect(screen.getByText("独立答对")).toBeInTheDocument();
    expect(screen.getByText("提示后答对")).toBeInTheDocument();
    expect(screen.getByText("仍需加强")).toBeInTheDocument();
    expect(screen.getByText("待处理")).toBeInTheDocument();
    expect(screen.getByText("用时 1 分 24 秒")).toBeInTheDocument();
    expect(screen.getByText("等级变化 1 个词")).toBeInTheDocument();
    expect(screen.getByText("result-visible-word")).toBeInTheDocument();
    expect(screen.getByText("掌握度 0 → 1")).toBeInTheDocument();
    expect(screen.getByText("推荐方式：听音记忆")).toBeInTheDocument();
    expect(screen.getByText("下次复习")).toBeInTheDocument();
    expect(screen.getByRole("time")).toHaveAttribute(
      "datetime",
      "2026-08-05T00:00:00.000Z",
    );

    const submitCall = requestMock.mock.calls.find(
      ([descriptor]) => descriptor.url === "/learning-session/submit",
    )?.[0];
    expect(submitCall.data).toEqual({
      sessionId: 42,
      itemId: 71,
      sessionVersion: 3,
      attemptUid: expect.any(String),
      answer: { kind: "spelling", text: "learner-response" },
      hintCount: 2,
      hintTypes: ["replay_slow", "show_spelling"],
    });
    expect(localStorage.getItem("english-world.learning-draft.v1.42.opaque-item-71")).toBeNull();
  });

  it("submits the output draft unchanged with its output answer kind", async () => {
    const user = userEvent.setup();
    requestMock.mockImplementation(async (descriptor: { url: string }) => {
      if (descriptor.url === "/learning-session/detail") return outputSnapshot;
      if (descriptor.url === "/learning-session/submit") {
        return {
          attemptId: 98,
          status: "final",
          outcome: "correct",
          dimensionResults: [{ dimension: "output", outcome: "correct" }],
          feedback: { kind: "spelling", expected: "inspect", diff: [{ text: "inspect", kind: "same" }] },
          sessionVersion: 7,
        };
      }
      throw new Error(`unexpected request: ${descriptor.url}`);
    });
    renderPage();

    await user.type(await screen.findByRole("textbox", { name: "写下你的回答" }), "inspect");
    await user.click(screen.getByRole("button", { name: "提交答案" }));

    const submitCall = requestMock.mock.calls.find(
      ([descriptor]) => descriptor.url === "/learning-session/submit",
    )?.[0];
    expect(submitCall.data).toMatchObject({
      sessionId: 42,
      itemId: 74,
      sessionVersion: 6,
      answer: { kind: "output", text: "inspect" },
    });
  });

  it("retries a failed logical submit with the exact attempt UID and draft", async () => {
    const user = userEvent.setup();
    let submitCount = 0;
    requestMock.mockImplementation(async (descriptor: { url: string }) => {
      if (descriptor.url === "/learning-session/detail") return activeSnapshot;
      if (descriptor.url === "/learning-session/submit") {
        submitCount += 1;
        if (submitCount === 1) throw { code: "CORS_ERROR", message: "offline" };
        return {
          attemptId: 91,
          status: "final",
          outcome: "incorrect",
          dimensionResults: [{ dimension: "spelling", outcome: "incorrect" }],
          feedback: {
            kind: "spelling",
            expected: "visible-after-result",
            diff: [{ text: "visible-after-result", kind: "missing" }],
          },
          sessionVersion: 4,
        };
      }
      throw new Error(`unexpected request: ${descriptor.url}`);
    });
    renderPage();
    const input = await screen.findByRole("textbox", { name: "输入听到的单词" });
    await user.type(input, "same-draft");
    await user.click(screen.getByRole("button", { name: "提交答案" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("提交未同步");
    await user.click(screen.getByRole("button", { name: "重试提交" }));

    const submits = requestMock.mock.calls.filter(
      ([descriptor]) => descriptor.url === "/learning-session/submit",
    );
    expect(submits).toHaveLength(2);
    expect(submits[0][0].data).toEqual(submits[1][0].data);
    expect(submits[0][0].data.attemptUid).toBe(submits[1][0].data.attemptUid);
  });

  it("uses the current version for pause/resume and asks for refresh on stale state", async () => {
    const user = userEvent.setup();
    requestMock.mockImplementation(async (descriptor: { url: string }) => {
      if (descriptor.url === "/learning-session/detail") return activeSnapshot;
      if (descriptor.url === "/learning-session/pause") {
        throw { errorCode: "LEARNING_ITEM_STALE", message: "opaque backend message" };
      }
      throw new Error(`unexpected request: ${descriptor.url}`);
    });
    renderPage();
    await screen.findByRole("textbox", { name: "输入听到的单词" });
    await user.click(screen.getByRole("button", { name: "暂停学习" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("学习进度已更新，请刷新后继续");
    expect(screen.getByRole("button", { name: "刷新学习进度" })).toBeVisible();
    const pauseCall = requestMock.mock.calls.find(
      ([descriptor]) => descriptor.url === "/learning-session/pause",
    )?.[0];
    expect(pauseCall.data).toEqual({ sessionId: 42, sessionVersion: 3 });
  });

  it("offers refresh when submit is accepted but the authoritative detail refresh fails", async () => {
    const user = userEvent.setup();
    let detailCount = 0;
    requestMock.mockImplementation(async (descriptor: { url: string }) => {
      if (descriptor.url === "/learning-session/detail") {
        detailCount += 1;
        if (detailCount === 1) return activeSnapshot;
        throw { code: "CORS_ERROR", message: "offline" };
      }
      if (descriptor.url === "/learning-session/submit") {
        return {
          attemptId: 92,
          status: "final",
          outcome: "correct",
          dimensionResults: [{ dimension: "spelling", outcome: "correct" }],
          feedback: {
            kind: "spelling",
            expected: "visible-after-result",
            diff: [{ text: "visible-after-result", kind: "same" }],
          },
          sessionVersion: 4,
        };
      }
      throw new Error(`unexpected request: ${descriptor.url}`);
    });
    renderPage();
    const input = await screen.findByRole("textbox", { name: "输入听到的单词" });
    await user.type(input, "public-response");
    await user.click(screen.getByRole("button", { name: "提交答案" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "答案已保存，请刷新学习进度",
    );
    expect(screen.getByRole("button", { name: "刷新学习进度" })).toBeVisible();
    expect(screen.queryByText("正在同步下一题…")).not.toBeInTheDocument();
  });

  it("does not invent word or hint metrics when a completed detail has no result rollup", async () => {
    requestMock.mockResolvedValue({
      sessionId: 42,
      status: "completed",
      sessionVersion: 5,
      submittedResults: [
        {
          attemptId: 101,
          itemId: 71,
          status: "final",
          outcome: "correct",
          dimensionResults: [{ dimension: "listening", outcome: "correct" }],
          sessionVersion: 4,
          nextItemId: 72,
        },
        {
          attemptId: 102,
          itemId: 72,
          status: "final",
          outcome: "correct",
          dimensionResults: [{ dimension: "spelling", outcome: "correct" }],
          sessionVersion: 5,
        },
      ],
    });
    renderPage();

    expect(await screen.findByRole("heading", { name: "学习结果" })).toBeVisible();
    expect(screen.getByText("2 次作答")).toBeInTheDocument();
    expect(screen.getByText(/暂无统计|等待服务端汇总/)).toBeInTheDocument();
    expect(screen.queryByText("已完成 2 个词")).not.toBeInTheDocument();
    expect(screen.queryByText("独立答对")).not.toBeInTheDocument();
    expect(screen.queryByText("提示后答对")).not.toBeInTheDocument();
  });
});
