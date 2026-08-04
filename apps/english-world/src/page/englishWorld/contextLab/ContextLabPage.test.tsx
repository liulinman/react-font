import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { message, Modal } from "antd";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import { ContextLabPage, formatElapsedSeconds } from "./ContextLabPage";
import { buildContextLabGenerateParams } from "./contextLabPlanning";

const { requestMock, downloadMock, downloadTaskMock, subscribeTaskEventsMock } =
  vi.hoisted(() => ({
  requestMock: vi.fn(),
  downloadMock: vi.fn(),
  downloadTaskMock: vi.fn(),
  subscribeTaskEventsMock: vi.fn(),
}));

let taskEventHandler:
  | ((task: {
      id: number;
      taskId: number;
      status: "pending" | "processing" | "succeeded" | "failed";
      sourceType:
        | "proficiency"
        | "random"
        | "custom"
        | "ielts-core"
        | "pasted-article";
      words: string[];
      mode?: "standard" | "micro";
      reciteSessionId?: number;
      article?: string;
      questions?: Array<{
        id: string;
        stem: string;
        options: string[];
        targetWord?: string;
      }>;
    }) => void)
  | undefined;

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function buildSelectedWordHistory(article: string) {
  return {
    list: [
      {
        id: 12,
        taskId: 12,
        status: "succeeded",
        sourceType: "custom",
        words: ["urban farming", "insects"],
        articleExerciseId: 88,
        article,
        questions: [
          {
            id: "q1",
            stem: "What is the passage about?",
            options: ["Urban farming", "Space travel"],
          },
        ],
      },
    ],
    total: 1,
    page: 1,
    pageSize: 10,
  };
}

vi.mock("@font/api", () => ({
  default: (requestConfig: unknown) => requestMock(requestConfig),
  getApiBaseUrl: () => "/api",
}));

vi.mock("../server/learning", async () => {
  const actual =
    await vi.importActual<typeof import("../server/learning")>(
      "../server/learning",
    );
  return {
    ...actual,
    downloadContextLabPdfTemplate: () => downloadMock(),
    downloadContextLabTaskPdf: (taskId: number) => downloadTaskMock(taskId),
    subscribeContextLabTaskEvents: (handler: typeof taskEventHandler) =>
      subscribeTaskEventsMock(handler),
  };
});

describe("ContextLabPage", () => {
  beforeEach(() => {
    taskEventHandler = undefined;
    subscribeTaskEventsMock.mockImplementation((handler) => {
      taskEventHandler = handler;
      return vi.fn();
    });
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    Modal.destroyAll();
    cleanup();
    requestMock.mockReset();
    downloadMock.mockReset();
    downloadTaskMock.mockReset();
    subscribeTaskEventsMock.mockReset();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("uses a generator sidebar and full-width practice-pack workspace", async () => {
    requestMock.mockResolvedValue({
      list: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });

    render(<ContextLabPage />);

    expect(
      screen.getByRole("banner", { name: "AI 语境实验室工具栏" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("complementary", { name: "新建语境练习" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("main", { name: "练习包管理" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "语境实验室工作区" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "生成练习" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "练习包" })).toBeInTheDocument();
    expect(screen.queryByText("Create")).not.toBeInTheDocument();
    expect(screen.queryByText("Tasks")).not.toBeInTheDocument();
    expect(
      screen.queryByText("创建练习包，在弹窗中完成阅读、答题与复盘"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "选择一组词，生成一套可阅读、可做题、可复盘的练习包。",
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { level: 1, name: "AI 语境实验室" }),
    ).not.toBeInTheDocument();
  });

  it("lets the user choose weak, mastery, IELTS random, IELTS core, or custom words", () => {
    render(<ContextLabPage />);

    expect(screen.getByText("今日薄弱词")).toBeInTheDocument();
    expect(screen.getByText("按掌握程度")).toBeInTheDocument();
    expect(screen.getAllByText("随机 IELTS").length).toBeGreaterThan(0);
    expect(screen.getAllByText("雅思核心").length).toBeGreaterThan(0);
    expect(screen.getAllByText("手输词").length).toBeGreaterThan(0);
    expect(screen.getByText("粘贴材料")).toBeInTheDocument();
  });

  it("prefills cockpit custom words from a router query", async () => {
    requestMock.mockResolvedValue({ list: [], total: 0, page: 1, pageSize: 10 });

    render(
      <MemoryRouter
        initialEntries={[
          "/englishWorld/context-lab?source=cockpit&words=fragile,resilient",
        ]}
      >
        <ContextLabPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByDisplayValue("fragile, resilient"),
    ).toBeInTheDocument();
  });

  it("auto-starts one focused micro task and hides standard configuration", async () => {
    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/generate-task") {
        return Promise.resolve({
          id: 21,
          taskId: 21,
          status: "pending",
          sourceType: "custom",
          mode: "micro",
          reciteSessionId: 91,
          words: ["fragile", "resilient"],
        });
      }
      if (config.url === "/learning-loop/events") {
        return Promise.resolve({ id: 1 });
      }
      return Promise.resolve({ list: [], total: 0, page: 1, pageSize: 10 });
    });

    render(
      <MemoryRouter
        initialEntries={[
          "/englishWorld/context-lab?mode=micro&source=recite-result&reciteSessionId=91&words=fragile,resilient",
        ]}
      >
        <ContextLabPage />
        <LocationProbe />
      </MemoryRouter>,
    );

    expect(await screen.findByText("错词语境巩固")).toBeInTheDocument();
    expect(screen.getByText("fragile")).toBeInTheDocument();
    expect(screen.getByText("resilient")).toBeInTheDocument();
    expect(screen.queryByText("今日薄弱词")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /下载 PDF 模板/ }),
    ).not.toBeInTheDocument();
    await waitFor(() => {
      const createCalls = requestMock.mock.calls.filter(
        ([config]) => config.url === "/context-lab/generate-task",
      );
      expect(createCalls).toHaveLength(1);
      expect(createCalls[0][0]).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            sourceType: "custom",
            mode: "micro",
            reciteSessionId: 91,
            words: ["fragile", "resilient"],
            requestUid: expect.any(String),
          }),
        }),
      );
    });
    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("taskId=21");
    });

    await userEvent.click(
      screen.getByRole("button", { name: "返回复习结果" }),
    );
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/englishWorld/recite?view=result&sessionId=91",
    );
  });

  it("shows a recovery action instead of silently opening standard mode for an invalid micro link", async () => {
    render(
      <MemoryRouter
        initialEntries={["/englishWorld/context-lab?mode=micro&words="]}
      >
        <ContextLabPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("修复词或来源回合无效")).toBeInTheDocument();
    expect(screen.queryByText("生成练习")).not.toBeInTheDocument();
    expect(requestMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ url: "/context-lab/generate-task" }),
    );
  });

  it("restores a micro task and its latest attempt from the task id", async () => {
    const restoredTask = {
      id: 21,
      taskId: 21,
      status: "succeeded",
      sourceType: "custom",
      mode: "micro",
      reciteSessionId: 91,
      words: ["fragile"],
      articleExerciseId: 88,
      article: "Fragile Systems\n\nA fragile system can recover with care.",
      questions: [1, 2, 3].map((index) => ({
        id: `q${index}`,
        stem: `Question ${index}`,
        options: ["One", "Two", "Three", "Four"],
        targetWord: "fragile",
      })),
      latestAttempt: {
        id: 501,
        attemptId: 501,
        taskId: 21,
        articleExerciseId: 88,
        score: 100,
        correctCount: 3,
        wrongCount: 0,
        weakWords: [],
        nextSuggestions: [],
        answers: [],
        results: [],
      },
    };
    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/detail") return Promise.resolve(restoredTask);
      if (config.url === "/learning-loop/events") return Promise.resolve({ id: 1 });
      return Promise.resolve({});
    });

    render(
      <MemoryRouter
        initialEntries={[
          "/englishWorld/context-lab?mode=micro&source=recite-result&reciteSessionId=91&words=fragile&taskId=21",
        ]}
      >
        <ContextLabPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("region", { name: /错词语境巩固/ }),
    ).toBeInTheDocument();
    expect(
      requestMock.mock.calls.filter(([config]) => config.url === "/context-lab/generate-task"),
    ).toHaveLength(0);
    expect(screen.getAllByText("目标词：fragile")).toHaveLength(3);
  });

  it("polls task detail when the success SSE update is missed", async () => {
    const pendingTask = {
      id: 25,
      taskId: 25,
      status: "pending",
      sourceType: "custom",
      mode: "micro",
      reciteSessionId: 91,
      words: ["fragile"],
    };
    const succeededTask = {
      ...pendingTask,
      status: "succeeded",
      articleExerciseId: 99,
      article: "Fragile Systems\n\nA fragile system can recover with care.",
      questions: [1, 2, 3].map((index) => ({
        id: `q${index}`,
        stem: `Question ${index}`,
        options: ["One", "Two", "Three", "Four"],
        targetWord: "fragile",
      })),
    };
    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/generate-task") return Promise.resolve(pendingTask);
      if (config.url === "/context-lab/detail") return Promise.resolve(succeededTask);
      if (config.url === "/learning-loop/events") return Promise.resolve({ id: 1 });
      return Promise.resolve({});
    });

    render(
      <MemoryRouter
        initialEntries={[
          "/englishWorld/context-lab?mode=micro&source=recite-result&reciteSessionId=91&words=fragile",
        ]}
      >
        <ContextLabPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("region", { name: /错词语境巩固/ }),
    ).toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({ url: "/context-lab/detail", data: { taskId: 25 } }),
    );
  });

  it("opens succeeded micro content, shows target words and records only the first completion", async () => {
    const microTask = {
      id: 21,
      taskId: 21,
      status: "succeeded" as const,
      sourceType: "custom" as const,
      mode: "micro" as const,
      reciteSessionId: 91,
      words: ["fragile"],
      articleExerciseId: 88,
      article: "Fragile Systems\n\nA fragile system can still recover with care.",
      questions: [1, 2, 3].map((index) => ({
        id: `q${index}`,
        stem: `Question ${index}`,
        options: ["One", "Two", "Three", "Four"],
        targetWord: "fragile",
      })),
    };
    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/generate-task") {
        return Promise.resolve(microTask);
      }
      if (config.url === "/context-lab/submit") {
        return Promise.resolve({
          attemptId: 501,
          results: microTask.questions.map((question) => ({
            questionId: question.id,
            correct: true,
            correctIndex: 0,
            userSelectedIndex: 0,
            explanation: "",
            targetWord: "fragile",
          })),
          score: 100,
          correctCount: 3,
          wrongCount: 0,
          weakWords: [],
          nextSuggestions: [],
        });
      }
      if (config.url === "/learning-loop/events") {
        return Promise.resolve({ id: 1 });
      }
      return Promise.resolve({ list: [], total: 0, page: 1, pageSize: 10 });
    });

    render(
      <MemoryRouter
        initialEntries={[
          "/englishWorld/context-lab?mode=micro&source=recite-result&reciteSessionId=91&words=fragile",
        ]}
      >
        <ContextLabPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("region", { name: /错词语境巩固/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("目标词：fragile")).toHaveLength(3);
    for (const option of screen.getAllByLabelText("A. One")) {
      await userEvent.click(option);
    }
    await userEvent.click(screen.getByRole("button", { name: "提交练习" }));

    expect(await screen.findByText("语境通过")).toBeInTheDocument();
    expect(screen.getByText("下一自然日再确认")).toBeInTheDocument();
    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/learning-loop/events",
          data: expect.objectContaining({
            eventUid: "micro_context_completed:21",
            eventType: "micro_context_completed",
            reciteSessionId: 91,
            contextTaskId: 21,
            attemptId: 501,
          }),
        }),
      );
    });
    await userEvent.click(
      screen.getByRole("button", { name: "整组再答一次" }),
    );
    expect(screen.queryByText("下一自然日再确认")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "提交练习" })).toBeInTheDocument();
  });

  it("keeps micro submit disabled while the first submission is pending", async () => {
    let resolveSubmit: ((value: unknown) => void) | undefined;
    const microTask = {
      id: 31,
      taskId: 31,
      status: "succeeded" as const,
      sourceType: "custom" as const,
      mode: "micro" as const,
      reciteSessionId: 91,
      words: ["fragile"],
      articleExerciseId: 98,
      article: "Fragile Systems\n\nA fragile system can recover with care.",
      questions: [1, 2, 3].map((index) => ({
        id: `q${index}`,
        stem: `Question ${index}`,
        options: ["One", "Two", "Three", "Four"],
        targetWord: "fragile",
      })),
    };
    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/generate-task") {
        return Promise.resolve(microTask);
      }
      if (config.url === "/context-lab/submit") {
        return new Promise((resolve) => {
          resolveSubmit = resolve;
        });
      }
      if (config.url === "/learning-loop/events") {
        return Promise.resolve({ id: 1 });
      }
      return Promise.resolve({ list: [], total: 0, page: 1, pageSize: 10 });
    });

    render(
      <MemoryRouter
        initialEntries={[
          "/englishWorld/context-lab?mode=micro&source=recite-result&reciteSessionId=91&words=fragile",
        ]}
      >
        <ContextLabPage />
      </MemoryRouter>,
    );

    await screen.findByRole("region", { name: /错词语境巩固/ });
    for (const option of screen.getAllByLabelText("A. One")) {
      await userEvent.click(option);
    }
    const submitButton = screen.getByRole("button", { name: "提交练习" });
    await userEvent.click(submitButton);
    expect(submitButton).toBeDisabled();
    await userEvent.click(submitButton);
    expect(
      requestMock.mock.calls.filter(
        ([config]) => config.url === "/context-lab/submit",
      ),
    ).toHaveLength(1);

    await act(async () => {
      resolveSubmit?.({
        attemptId: 701,
        results: [],
        score: 100,
        correctCount: 3,
        wrongCount: 0,
        weakWords: [],
        nextSuggestions: [],
      });
    });
  });

  it("offers one-click replacement after a micro task fails", async () => {
    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/generate-task") {
        const createCount = requestMock.mock.calls.filter(
          ([call]) => call.url === "/context-lab/generate-task",
        ).length;
        return Promise.resolve({
          id: createCount === 1 ? 41 : 42,
          taskId: createCount === 1 ? 41 : 42,
          status: "pending",
          sourceType: "custom",
          mode: "micro",
          reciteSessionId: 91,
          words: ["fragile"],
        });
      }
      return Promise.resolve({ list: [], total: 0, page: 1, pageSize: 10 });
    });

    render(
      <MemoryRouter
        initialEntries={[
          "/englishWorld/context-lab?mode=micro&source=recite-result&reciteSessionId=91&words=fragile",
        ]}
      >
        <ContextLabPage />
      </MemoryRouter>,
    );

    expect(await screen.findAllByText("等待回调")).not.toHaveLength(0);
    act(() => {
      taskEventHandler?.({
        id: 41,
        taskId: 41,
        status: "failed",
        sourceType: "custom",
        mode: "micro",
        reciteSessionId: 91,
        words: ["fragile"],
      });
    });
    await userEvent.click(
      await screen.findByRole("button", { name: "重新生成" }),
    );

    await waitFor(() => {
      expect(
        requestMock.mock.calls.filter(
          ([config]) => config.url === "/context-lab/generate-task",
        ),
      ).toHaveLength(2);
    });

    act(() => {
      taskEventHandler?.({
        id: 41,
        taskId: 41,
        status: "succeeded",
        sourceType: "custom",
        mode: "micro",
        reciteSessionId: 91,
        words: ["fragile"],
        article: "Stale fragile response",
        questions: [],
      });
    });
    expect(
      screen.queryByRole("region", { name: /错词语境巩固/ }),
    ).not.toBeInTheDocument();
  });

  it("focuses a word-library task without opening source preview and follows SSE", async () => {
    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/history") {
        return Promise.resolve({ list: [], total: 0, page: 1, pageSize: 10 });
      }
      if (config.url === "/context-lab/detail") {
        return Promise.resolve({
          id: 44,
          taskId: 44,
          status: "pending",
          sourceType: "custom",
          words: ["word-1", "word-2", "word-3"],
        });
      }
      return Promise.resolve({});
    });

    render(
      <MemoryRouter
        initialEntries={[
          "/englishWorld/context-lab?source=word-library&taskId=44",
        ]}
      >
        <ContextLabPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("region", { name: "批量生成任务状态" }),
    ).toHaveTextContent("等待回调");
    expect(screen.queryByRole("dialog", { name: /单词来源文章/ })).toBeNull();
    expect(screen.getByText("word-1 / word-2 / word-3").closest("article"))
      .toHaveClass("context-lab-history-item-selected");

    act(() => {
      taskEventHandler?.({
        id: 44,
        taskId: 44,
        status: "succeeded",
        sourceType: "custom",
        words: ["word-1", "word-2", "word-3"],
        article: "A generated article.",
        questions: [
          {
            id: "q1",
            stem: "What is the article about?",
            options: ["Words", "Numbers", "Weather", "Travel"],
          },
        ],
      });
    });

    await waitFor(() => {
      expect(
        screen.queryByRole("region", { name: "批量生成任务状态" }),
      ).toBeNull();
    });
    expect(screen.getByRole("button", { name: "开始练习" })).toBeVisible();
  });

  it("keeps a succeeded word-library task after stale detail and history responses", async () => {
    let resolveDetail: (task: unknown) => void = () => undefined;
    let resolveHistory: (history: unknown) => void = () => undefined;
    const pendingDetail = new Promise((resolve) => {
      resolveDetail = resolve;
    });
    const pendingHistory = new Promise((resolve) => {
      resolveHistory = resolve;
    });
    const staleTask = {
      id: 45,
      taskId: 45,
      status: "pending",
      sourceType: "custom",
      words: ["word-1", "word-2", "word-3"],
    };

    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/history") return pendingHistory;
      if (config.url === "/context-lab/detail") return pendingDetail;
      return Promise.resolve({});
    });

    render(
      <MemoryRouter
        initialEntries={[
          "/englishWorld/context-lab?source=word-library&taskId=45",
        ]}
      >
        <ContextLabPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/context-lab/detail" }),
      );
    });
    await userEvent.click(screen.getByRole("button", { name: "刷新" }));

    act(() => {
      taskEventHandler?.({
        id: 45,
        taskId: 45,
        status: "succeeded",
        sourceType: "custom",
        words: ["word-1", "word-2", "word-3"],
        article: "A generated article.",
        questions: [
          {
            id: "q1",
            stem: "What is the article about?",
            options: ["Words", "Numbers", "Weather", "Travel"],
          },
        ],
      });
    });

    await act(async () => {
      resolveDetail(staleTask);
      resolveHistory({ list: [staleTask], total: 1, page: 1, pageSize: 10 });
    });

    await waitFor(() => {
      expect(
        screen.queryByRole("region", { name: "批量生成任务状态" }),
      ).toBeNull();
    });
    expect(screen.getByRole("button", { name: "开始练习" })).toBeVisible();
  });

  it("keeps focused task processing after stale pending detail and history responses", async () => {
    let resolveDetail: (task: unknown) => void = () => undefined;
    let resolveHistory: (history: unknown) => void = () => undefined;
    const pendingDetail = new Promise((resolve) => {
      resolveDetail = resolve;
    });
    const pendingHistory = new Promise((resolve) => {
      resolveHistory = resolve;
    });
    const staleTask = {
      id: 46,
      taskId: 46,
      status: "pending",
      sourceType: "custom",
      words: ["word-1", "word-2", "word-3"],
    };

    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/history") return pendingHistory;
      if (config.url === "/context-lab/detail") return pendingDetail;
      return Promise.resolve({});
    });

    render(
      <MemoryRouter
        initialEntries={[
          "/englishWorld/context-lab?source=word-library&taskId=46",
        ]}
      >
        <ContextLabPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/context-lab/detail" }),
      );
    });
    act(() => {
      taskEventHandler?.({
        id: 46,
        taskId: 46,
        status: "processing",
        sourceType: "custom",
        words: ["word-1", "word-2", "word-3"],
      });
    });

    expect(
      await screen.findByRole("region", { name: "批量生成任务状态" }),
    ).toHaveTextContent("处理中");

    await act(async () => {
      resolveDetail(staleTask);
      resolveHistory({ list: [staleTask], total: 1, page: 1, pageSize: 10 });
    });

    expect(
      screen.getByRole("region", { name: "批量生成任务状态" }),
    ).toHaveTextContent("处理中");
    expect(
      screen.getByText("word-1 / word-2 / word-3").closest("article"),
    ).toHaveClass("context-lab-history-item-processing");
  });

  it("preserves an opened focused practice and its answer when detail resolves late", async () => {
    let resolveDetail: (task: unknown) => void = () => undefined;
    const pendingDetail = new Promise((resolve) => {
      resolveDetail = resolve;
    });
    const focusedWords = ["word-1", "word-2", "word-3"];

    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/history") {
        return Promise.resolve({ list: [], total: 0, page: 1, pageSize: 10 });
      }
      if (config.url === "/context-lab/detail") return pendingDetail;
      return Promise.resolve({});
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter
        initialEntries={[
          "/englishWorld/context-lab?source=word-library&taskId=47",
        ]}
      >
        <ContextLabPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/context-lab/detail" }),
      );
    });
    act(() => {
      taskEventHandler?.({
        id: 47,
        taskId: 47,
        status: "succeeded",
        sourceType: "custom",
        words: focusedWords,
        article: "Focused article.",
        questions: [
          {
            id: "focused-q1",
            stem: "What is the focused article about?",
            options: ["Words", "Numbers"],
          },
        ],
      });
    });

    await user.click(await screen.findByRole("button", { name: "开始练习" }));
    await user.click(screen.getByLabelText("A. Words"));

    await act(async () => {
      resolveDetail({
        id: 47,
        taskId: 47,
        status: "pending",
        sourceType: "custom",
        words: focusedWords,
      });
    });

    expect(screen.getByRole("dialog", { name: /AI 语境练习/ })).not.toHaveClass(
      "ant-zoom-leave",
    );
    expect(screen.getByLabelText("A. Words")).toBeChecked();
    expect(
      screen.getByText("What is the focused article about?"),
    ).toBeInTheDocument();
  });

  it("does not let focused-task SSE replace a newer practice selection", async () => {
    let resolveDetail: (task: unknown) => void = () => undefined;
    const pendingDetail = new Promise((resolve) => {
      resolveDetail = resolve;
    });
    const selectedTask = {
      id: 92,
      taskId: 92,
      status: "succeeded",
      sourceType: "custom",
      words: ["newer", "selection", "wins"],
      article: "Newer selected article.",
      questions: [
        {
          id: "selected-q1",
          stem: "Which task did the learner select?",
          options: ["Newer task", "Focused task"],
        },
      ],
    };

    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/history") {
        return Promise.resolve({
          list: [selectedTask],
          total: 1,
          page: 1,
          pageSize: 10,
        });
      }
      if (config.url === "/context-lab/detail") return pendingDetail;
      return Promise.resolve({});
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter
        initialEntries={[
          "/englishWorld/context-lab?source=word-library&taskId=48",
        ]}
      >
        <ContextLabPage />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("button", { name: "开始练习" }));
    await user.click(screen.getByLabelText("A. Newer task"));
    act(() => {
      taskEventHandler?.({
        id: 48,
        taskId: 48,
        status: "succeeded",
        sourceType: "custom",
        words: ["focused", "task", "event"],
        article: "Focused SSE article.",
        questions: [
          {
            id: "focused-q1",
            stem: "Should this focused task replace the selection?",
            options: ["No", "Yes"],
          },
        ],
      });
    });

    expect(
      screen.getByText("Which task did the learner select?"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("A. Newer task")).toBeChecked();
    expect(
      screen.queryByText("Should this focused task replace the selection?"),
    ).toBeNull();

    await act(async () => {
      resolveDetail({
        id: 48,
        taskId: 48,
        status: "succeeded",
        sourceType: "custom",
        words: ["focused", "task", "event"],
      });
    });
  });

  it("does not let delayed focused detail replace a newer practice selection", async () => {
    let resolveDetail: (task: unknown) => void = () => undefined;
    const pendingDetail = new Promise((resolve) => {
      resolveDetail = resolve;
    });
    const selectedTask = {
      id: 93,
      taskId: 93,
      status: "succeeded",
      sourceType: "custom",
      words: ["manual", "selection", "wins"],
      article: "Manually selected article.",
      questions: [
        {
          id: "manual-q1",
          stem: "Which article is still open?",
          options: ["Manual article", "Focused article"],
        },
      ],
    };

    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/history") {
        return Promise.resolve({
          list: [selectedTask],
          total: 1,
          page: 1,
          pageSize: 10,
        });
      }
      if (config.url === "/context-lab/detail") return pendingDetail;
      return Promise.resolve({});
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter
        initialEntries={[
          "/englishWorld/context-lab?source=word-library&taskId=49",
        ]}
      >
        <ContextLabPage />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("button", { name: "开始练习" }));
    await user.click(screen.getByLabelText("A. Manual article"));

    await act(async () => {
      resolveDetail({
        id: 49,
        taskId: 49,
        status: "succeeded",
        sourceType: "custom",
        words: ["focused", "late", "detail"],
        article: "Late focused article.",
        questions: [
          {
            id: "late-q1",
            stem: "Did late detail replace the selection?",
            options: ["No", "Yes"],
          },
        ],
      });
    });

    expect(screen.getByText("Which article is still open?")).toBeInTheDocument();
    expect(screen.getByLabelText("A. Manual article")).toBeChecked();
    expect(screen.queryByText("Did late detail replace the selection?")).toBeNull();
  });

  it("keeps Context Lab usable when a focused word-library task is unavailable", async () => {
    const warningSpy = vi
      .spyOn(message, "warning")
      .mockImplementation(() => undefined as never);
    requestMock.mockImplementation((config) =>
      config.url === "/context-lab/detail"
        ? Promise.reject(new Error("not found"))
        : Promise.resolve({ list: [], total: 0, page: 1, pageSize: 10 }),
    );

    render(
      <MemoryRouter
        initialEntries={[
          "/englishWorld/context-lab?source=word-library&taskId=404",
        ]}
      >
        <ContextLabPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(warningSpy).toHaveBeenCalledWith(
        "目标语境任务无法加载，请在练习包列表中查看",
      );
    });
    expect(screen.getByRole("main", { name: "练习包管理" })).toBeVisible();
    expect(screen.queryByRole("dialog", { name: /单词来源文章/ })).toBeNull();
  });

  it("opens a referenced article as source preview without starting practice", async () => {
    const user = userEvent.setup();
    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/history") {
        return Promise.resolve({ list: [], total: 0, page: 1, pageSize: 10 });
      }
      if (config.url === "/context-lab/detail") {
        return Promise.resolve({
          id: 12,
          taskId: 12,
          status: "succeeded",
          sourceType: "custom",
          words: ["urban farming"],
          articleExerciseId: 88,
          article: "Urban Farming\n\nUrban farming improves local food supply.",
          questions: [
            {
              id: "q1",
              stem: "What is the passage about?",
              options: ["Urban farming", "Space travel"],
            },
          ],
        });
      }
      return Promise.resolve({});
    });

    render(
      <MemoryRouter
        initialEntries={[
          "/englishWorld/context-lab?taskId=12&word=urban%20farming",
        ]}
      >
        <ContextLabPage />
      </MemoryRouter>,
    );

    const dialog = await screen.findByRole("dialog", {
      name: /单词来源文章/,
    });
    expect(dialog).toBeInTheDocument();
    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/context-lab/detail",
          method: "POST",
          data: { taskId: 12 },
        }),
      );
    });
    expect(
      document.querySelector(".context-lab-article-highlight"),
    ).toHaveTextContent(/urban farming/i);
    expect(screen.queryByText("做题计时")).not.toBeInTheDocument();
    expect(screen.queryByText("提交练习")).not.toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: /开始练习/ }),
    ).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole("button", { name: "占满屏幕" }),
    );
    expect(dialog).toHaveClass("context-lab-source-modal-fullscreen");
  });

  it("shows the weak source count instead of fake preview words", () => {
    requestMock.mockResolvedValue({ list: [], total: 0, page: 1, pageSize: 10 });

    render(<ContextLabPage />);

    expect(screen.getByText("生成数量")).toBeInTheDocument();
    expect(screen.getByLabelText("生成数量")).toHaveValue("20");
    expect(screen.queryByText("resilient")).not.toBeInTheDocument();
    expect(screen.queryByText("recover")).not.toBeInTheDocument();
    expect(screen.queryByText("fragile")).not.toBeInTheDocument();
  });

  it("builds the weak word source as a proficiency request", () => {
    expect(
      buildContextLabGenerateParams({
        sourceMode: "weak",
        count: 8,
        customWords: "",
        ieltsBand: 5,
      }),
    ).toEqual({
      sourceType: "proficiency",
      proficiencyLevels: [0, 1],
      count: 8,
      ieltsBand: 5,
      modelProvider: "deepseek",
    });
  });

  it("uses IELTS band 7 as the default generation level", () => {
    expect(
      buildContextLabGenerateParams({
        sourceMode: "weak",
        count: 8,
        customWords: "",
      }),
    ).toEqual({
      sourceType: "proficiency",
      proficiencyLevels: [0, 1],
      count: 8,
      ieltsBand: 7,
      modelProvider: "deepseek",
    });
  });

  it("builds a GPT generation request when that model is selected", () => {
    expect(
      buildContextLabGenerateParams({
        sourceMode: "weak",
        count: 8,
        customWords: "",
        modelProvider: "gpt",
      }),
    ).toEqual({
      sourceType: "proficiency",
      proficiencyLevels: [0, 1],
      count: 8,
      ieltsBand: 7,
      modelProvider: "gpt",
    });
  });

  it("builds a mastery-level article request from selected proficiency levels", () => {
    expect(
      buildContextLabGenerateParams({
        sourceMode: "proficiency",
        count: 10,
        customWords: "",
        proficiencyLevels: [2, 3],
        ieltsBand: 7.5,
      }),
    ).toEqual({
      sourceType: "proficiency",
      proficiencyLevels: [2, 3],
      count: 10,
      ieltsBand: 7.5,
      modelProvider: "deepseek",
    });
  });

  it("builds a random IELTS article request", () => {
    expect(
      buildContextLabGenerateParams({
        sourceMode: "ielts-random",
        count: 8,
        customWords: "",
        ieltsBand: 6.5,
      }),
    ).toEqual({
      sourceType: "random",
      count: 8,
      ieltsBand: 6.5,
      modelProvider: "deepseek",
    });
  });

  it("splits custom words by spaces and commas", () => {
    expect(
      buildContextLabGenerateParams({
        sourceMode: "custom",
        count: 8,
        customWords: "resilient, recover，fragile steady",
        ieltsBand: 8,
      }),
    ).toEqual({
      sourceType: "custom",
      words: ["resilient", "recover", "fragile", "steady"],
      ieltsBand: 8,
      modelProvider: "deepseek",
    });
  });

  it("formats elapsed answering time", () => {
    expect(formatElapsedSeconds(0)).toBe("00:00");
    expect(formatElapsedSeconds(65)).toBe("01:05");
  });

  it("creates an async generation task and refreshes history", async () => {
    const pendingTask = {
      id: 12,
      taskId: 12,
      status: "pending",
      sourceType: "proficiency",
      words: ["fragile", "steady", "recover"],
    };
    let historyRequestCount = 0;

    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/history") {
        historyRequestCount += 1;
        const list = historyRequestCount > 1 ? [pendingTask] : [];
        return Promise.resolve({
          list,
          total: list.length,
          page: 1,
          pageSize: 10,
        });
      }
      if (config.url === "/context-lab/generate-task") {
        return Promise.resolve(pendingTask);
      }
      return Promise.resolve({});
    });

    render(<ContextLabPage />);

    await userEvent.click(screen.getByRole("button", { name: /生成练习包/ }));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith({
        url: "/context-lab/generate-task",
        method: "POST",
        data: {
          sourceType: "proficiency",
          proficiencyLevels: [0, 1],
          count: 20,
          ieltsBand: 7,
          modelProvider: "deepseek",
        },
        __responseType: undefined,
      });
    });
    expect(
      await screen.findByText("fragile / steady / recover"),
    ).toBeInTheDocument();
    expect(await screen.findByText("等待回调")).toBeInTheDocument();
  });

  it("creates a pasted article generation task with parsing preferences", async () => {
    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/history") {
        return Promise.resolve({ list: [], total: 0, page: 1, pageSize: 10 });
      }
      if (config.url === "/context-lab/generate-task") {
        return Promise.resolve({
          id: 42,
          taskId: 42,
          status: "pending",
          sourceType: "pasted-article",
          words: [],
        });
      }
      return Promise.resolve({});
    });

    render(<ContextLabPage />);

    await userEvent.click(screen.getByText("粘贴材料"));
    await userEvent.type(
      screen.getByLabelText("粘贴英文材料"),
      "Urban transport habits have changed as hybrid workers spread their journeys across the day.\n\nQuestions\n1. Which habit changed?",
    );
    await userEvent.click(screen.getByText("整理自带题"));
    await userEvent.click(screen.getByLabelText("定位细节"));
    await userEvent.click(screen.getByLabelText("True / False / Not Given"));
    await userEvent.click(screen.getByRole("button", { name: /生成练习包/ }));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/context-lab/generate-task",
          method: "POST",
          data: expect.objectContaining({
            sourceType: "pasted-article",
            pastedContent:
              "Urban transport habits have changed as hybrid workers spread their journeys across the day.\n\nQuestions\n1. Which habit changed?",
            pastedQuestionMode: "parse",
            questionTypes: ["detail", "true_false_not_given"],
            questionCount: 8,
            ieltsBand: 7,
            modelProvider: "deepseek",
          }),
        }),
      );
    });
  });

  it("lets the learner choose the IELTS band for generated articles", async () => {
    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/history") {
        return Promise.resolve({ list: [], total: 0, page: 1, pageSize: 10 });
      }
      if (config.url === "/context-lab/generate-task") {
        return Promise.resolve({
          id: 30,
          taskId: 30,
          status: "pending",
          sourceType: "proficiency",
          words: ["analysis", "policy", "evidence"],
        });
      }
      return Promise.resolve({});
    });

    render(<ContextLabPage />);

    const bandInput = screen.getByLabelText("雅思分数等级");
    expect(bandInput).toHaveValue("7.0");
    await userEvent.clear(bandInput);
    await userEvent.type(bandInput, "7.5");
    await userEvent.click(screen.getByRole("button", { name: /生成练习包/ }));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/context-lab/generate-task",
          data: expect.objectContaining({
            sourceType: "proficiency",
            proficiencyLevels: [0, 1],
            count: 20,
            ieltsBand: 7.5,
            modelProvider: "deepseek",
          }),
        }),
      );
    });
  });

  it("lets the learner choose GPT for generated articles", async () => {
    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/history") {
        return Promise.resolve({ list: [], total: 0, page: 1, pageSize: 10 });
      }
      if (config.url === "/context-lab/generate-task") {
        return Promise.resolve({
          id: 31,
          taskId: 31,
          status: "pending",
          sourceType: "proficiency",
          words: ["analysis", "policy", "evidence"],
        });
      }
      return Promise.resolve({});
    });

    render(<ContextLabPage />);

    await userEvent.click(screen.getByText("GPT-5.6"));
    await userEvent.click(screen.getByRole("button", { name: /生成练习包/ }));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/context-lab/generate-task",
          data: expect.objectContaining({
            modelProvider: "gpt",
          }),
        }),
      );
    });
  });

  it("creates an async generation task from selected mastery levels", async () => {
    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/history") {
        return Promise.resolve({ list: [], total: 0, page: 1, pageSize: 10 });
      }
      if (config.url === "/context-lab/generate-task") {
        return Promise.resolve({
          id: 18,
          taskId: 18,
          status: "pending",
          sourceType: "proficiency",
          words: ["authenticity", "illustrate", "contemporary"],
        });
      }
      return Promise.resolve({});
    });

    render(<ContextLabPage />);

    await userEvent.click(screen.getByText("按掌握程度"));
    await userEvent.click(screen.getByText("熟练"));
    await userEvent.click(screen.getByRole("button", { name: /生成练习包/ }));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/context-lab/generate-task",
          data: {
            sourceType: "proficiency",
            proficiencyLevels: [2],
            count: 20,
            ieltsBand: 7,
            modelProvider: "deepseek",
          },
        }),
      );
    });
  });

  it("creates an async random IELTS generation task", async () => {
    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/history") {
        return Promise.resolve({ list: [], total: 0, page: 1, pageSize: 10 });
      }
      if (config.url === "/context-lab/generate-task") {
        return Promise.resolve({
          id: 20,
          taskId: 20,
          status: "pending",
          sourceType: "random",
          words: ["migration", "biodiversity", "policy"],
        });
      }
      return Promise.resolve({});
    });

    render(<ContextLabPage />);

    await userEvent.click(screen.getAllByText("随机 IELTS")[0]);
    await userEvent.click(screen.getByRole("button", { name: /生成练习包/ }));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/context-lab/generate-task",
          data: {
            sourceType: "random",
            count: 20,
            ieltsBand: 7,
            modelProvider: "deepseek",
          },
        }),
      );
    });
  });

  it("renders IELTS core practice packs in history and source filters", async () => {
    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/history") {
        return Promise.resolve({
          list: [
            {
              id: 19,
              taskId: 19,
              status: "succeeded",
              sourceType: "ielts-core",
              words: ["mitigate", "habitat", "evidence"],
              article: "IELTS article",
              questions: [],
            },
          ],
          total: 1,
          page: 1,
          pageSize: 10,
        });
      }
      return Promise.resolve({});
    });

    render(<ContextLabPage />);

    expect(await screen.findByText("雅思核心词")).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText("练习包来源筛选"));
    expect(await screen.findByText("雅思核心词")).toBeInTheDocument();
  });

  it("refreshes a pending task from the task event stream", async () => {
    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/history") {
        return Promise.resolve({
          list: [
            {
              id: 12,
              taskId: 12,
              status: "pending",
              sourceType: "custom",
              words: ["fragile", "steady", "recover"],
            },
          ],
          total: 1,
          page: 1,
          pageSize: 10,
        });
      }
      return Promise.resolve({});
    });

    render(<ContextLabPage />);

    expect(await screen.findByText("等待回调")).toBeInTheDocument();
    expect(subscribeTaskEventsMock).toHaveBeenCalled();

    act(() => {
      taskEventHandler?.({
        id: 12,
        taskId: 12,
        status: "succeeded",
        sourceType: "custom",
        words: ["fragile", "steady", "recover"],
        article: "A completed practice article.",
        questions: [
          {
            id: "q1",
            stem: "What does fragile mean?",
            options: ["Easy to break", "Very fast"],
          },
        ],
      });
    });

    expect(await screen.findByText("生成完成")).toBeInTheDocument();
    expect(screen.queryByText("等待回调")).not.toBeInTheDocument();
  });

  it("renders succeeded and failed history states", async () => {
    requestMock.mockResolvedValue({
      list: [
        {
          id: 12,
          taskId: 12,
          status: "succeeded",
          sourceType: "custom",
          words: ["fragile", "steady", "recover"],
          attemptCount: 2,
          latestScore: 86,
          latestWrongCount: 1,
          articleExerciseId: 88,
          article: "A short practice article.",
          questions: [
            {
              id: "q1",
              stem: "What does fragile mean?",
              options: ["Easy to break", "Very fast"],
            },
          ],
        },
        {
          id: 13,
          taskId: 13,
          status: "failed",
          sourceType: "random",
          words: ["steady", "recover", "repair"],
          errorMessage: "MICRO_OUTPUT_INVALID",
        },
      ],
      total: 2,
      page: 1,
      pageSize: 10,
    });

    render(<ContextLabPage />);

    expect(await screen.findByText("生成完成")).toBeInTheDocument();
    expect(screen.getByText("手输词组")).toBeInTheDocument();
    expect(screen.getAllByText("3 个词").length).toBeGreaterThan(0);
    expect(screen.getByText("练习 2 次")).toBeInTheDocument();
    expect(screen.getAllByText("最近得分 86").length).toBeGreaterThan(0);
    expect(screen.getByText("生成失败")).toBeInTheDocument();
    expect(
      screen.getByText("生成内容未通过格式校验，请重新生成，系统会自动纠偏重试。"),
    ).toBeInTheDocument();
    expect(screen.queryByText("MICRO_OUTPUT_INVALID")).not.toBeInTheDocument();
  });

  it("keeps secondary practice-pack actions inside the task more menu", async () => {
    requestMock.mockResolvedValue({
      list: [
        {
          id: 12,
          taskId: 12,
          status: "succeeded",
          sourceType: "custom",
          words: ["fragile", "steady", "recover"],
          articleExerciseId: 88,
          article: "A short practice article.",
          questions: [],
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });

    const user = userEvent.setup();
    render(<ContextLabPage />);

    expect(await screen.findByText("fragile / steady / recover")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "查看记录" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "下载练习包 PDF" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "删除练习包" }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "任务 12 更多操作" }),
    );

    expect(await screen.findByText("查看记录")).toBeInTheDocument();
    expect(screen.getByText("下载 PDF")).toBeInTheDocument();
    expect(screen.getByText("删除练习包")).toBeInTheDocument();
  });

  it("searches practice packages by keyword and source type", async () => {
    requestMock.mockResolvedValue({
      list: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });
    const user = userEvent.setup();

    const { container } = render(<ContextLabPage />);

    const searchInput = await screen.findByRole("textbox", {
      name: "搜索练习包",
    });
    expect(searchInput.closest(".ant-input-affix-wrapper")).toHaveClass(
      "context-lab-history-search-input",
    );
    expect(
      container.querySelector(".ant-input-search-button"),
    ).not.toBeInTheDocument();

    await user.type(searchInput, " urban ");

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/context-lab/history",
          method: "POST",
          data: expect.objectContaining({
            keyword: "urban",
          }),
        }),
      );
    });

    await user.click(
      within(screen.getByLabelText("练习包来源筛选")).getByText("手输"),
    );

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/context-lab/history",
          method: "POST",
          data: expect.objectContaining({
            keyword: "urban",
            sourceType: "custom",
          }),
        }),
      );
    });
    expect(screen.getByText("没有找到相关练习包")).toBeInTheDocument();
  });

  it("opens a succeeded history item and submits answers", async () => {
    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/history") {
        return Promise.resolve({
          list: [
            {
              id: 12,
              taskId: 12,
              status: "succeeded",
              sourceType: "custom",
              words: ["fragile", "steady", "recover"],
              articleExerciseId: 88,
              article: "A short practice article.",
              questions: [
                {
                  id: "q1",
                  stem: "What does fragile mean?",
                  options: ["Easy to break", "Very fast"],
                },
              ],
            },
          ],
          total: 1,
          page: 1,
          pageSize: 10,
        });
      }
      if (config.url === "/context-lab/submit") {
        return Promise.resolve({
          results: [
            {
              questionId: "q1",
              correct: true,
              correctIndex: 0,
              userSelectedIndex: 0,
              explanation: "解析：正确答案为0，你选0，fragile 表示容易损坏，和文章语境一致。",
            },
          ],
        });
      }
      return Promise.resolve({});
    });

    render(<ContextLabPage />);

    await userEvent.click(await screen.findByRole("button", { name: "开始练习" }));
    expect(
      screen.getByRole("region", { name: /AI 语境练习/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("A. Easy to break")).toBeInTheDocument();
    expect(screen.getByText("B. Very fast")).toBeInTheDocument();
    await userEvent.click(screen.getByText("A. Easy to break"));
    await userEvent.click(screen.getByRole("button", { name: "提交练习" }));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/context-lab/submit",
          method: "POST",
          data: expect.objectContaining({
            sessionId: 88,
            elapsedSeconds: expect.any(Number),
            answers: [{ questionId: "q1", selectedIndex: 0 }],
          }),
          __responseType: undefined,
        }),
      );
    });
    expect(
      await screen.findByText("解析：正确答案为 A，你选 A，fragile 表示容易损坏，和文章语境一致。"),
    ).toBeInTheDocument();
  });

  it(
    "shows a result review with weak-word next actions after submitting answers",
    async () => {
    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/history") {
        return Promise.resolve({
          list: [
            {
              id: 12,
              taskId: 12,
              status: "succeeded",
              sourceType: "custom",
              words: ["urban farming", "resilient"],
              articleExerciseId: 88,
              article: "Urban Farming\n\nUrban farming improves local food supply.",
              questions: [
                {
                  id: "q1",
                  stem: "What is the passage about?",
                  options: ["Urban farming", "Space travel"],
                },
              ],
            },
          ],
          total: 1,
          page: 1,
          pageSize: 10,
        });
      }
      if (config.url === "/context-lab/submit") {
        return Promise.resolve({
          results: [
            {
              questionId: "q1",
              correct: false,
              correctIndex: 0,
              userSelectedIndex: 1,
              explanation: "错题解析",
            },
          ],
          score: 0,
          correctCount: 0,
          wrongCount: 1,
          weakWords: ["urban farming"],
          nextSuggestions: ["把薄弱词加入今日复习再练一轮"],
        });
      }
      return Promise.resolve({});
    });

    const user = userEvent.setup();
    render(<ContextLabPage />);

    await user.click(await screen.findByRole("button", { name: "开始练习" }));
    await user.click(await screen.findByLabelText("B. Space travel"));
    await user.click(screen.getByRole("button", { name: "提交练习" }));

    const review = await screen.findByLabelText("结果复盘");
    expect(within(review).getByText("结果复盘")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("错题 1")).toBeInTheDocument();
    expect(within(review).getByText("urban farming")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "用薄弱词再练一套" }),
    ).toBeInTheDocument();
    },
    20_000,
  );

  it("sends elapsed time when submitting and refreshes practice records", async () => {
    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/history") {
        return Promise.resolve({
          list: [
            {
              id: 12,
              taskId: 12,
              status: "succeeded",
              sourceType: "custom",
              words: ["urban farming"],
              articleExerciseId: 88,
              article: "Urban Farming\n\nFood systems change.",
              questions: [
                {
                  id: "q1",
                  stem: "What is the passage about?",
                  options: ["Urban farming", "Space travel"],
                },
              ],
              attemptCount: config.data?.page === 1 ? 1 : 0,
              latestScore: 100,
              latestWrongCount: 0,
              latestAttemptId: 501,
              latestAttemptTime: "2026-06-23T08:00:00Z",
            },
          ],
          total: 1,
          page: 1,
          pageSize: 10,
        });
      }
      if (config.url === "/context-lab/submit") {
        return Promise.resolve({
          attemptId: 501,
          results: [
            {
              questionId: "q1",
              correct: true,
              correctIndex: 0,
              userSelectedIndex: 0,
              explanation: "答对了",
            },
          ],
          score: 100,
          correctCount: 1,
          wrongCount: 0,
          weakWords: [],
          nextSuggestions: ["继续保持"],
        });
      }
      return Promise.resolve({});
    });

    const user = userEvent.setup();
    render(<ContextLabPage />);

    await user.click(await screen.findByRole("button", { name: "开始练习" }));
    await user.click(await screen.findByLabelText("A. Urban farming"));
    await user.click(screen.getByRole("button", { name: "提交练习" }));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/context-lab/submit",
          data: expect.objectContaining({ elapsedSeconds: expect.any(Number) }),
        }),
      );
    });
    expect(await screen.findByText("练习 1 次")).toBeInTheDocument();
    expect(screen.getAllByText("最近得分 100").length).toBeGreaterThan(0);
    expect(screen.getAllByText("错题 0").length).toBeGreaterThan(0);
  });

  it("opens historical attempt details and removes a deleted attempt from the open drawer", async () => {
    let historyRequests = 0;
    let attemptHistoryRequests = 0;
    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/history") {
        historyRequests += 1;
        return Promise.resolve({
          list: [
            {
              id: 12,
              taskId: 12,
              status: "succeeded",
              sourceType: "custom",
              words: ["vibe"],
              articleExerciseId: 88,
              article: "Topic\n\nParagraph.",
              questions: [
                {
                  id: "q1",
                  stem: "Which answer matches the paragraph?",
                  options: ["It celebrates speed", "It describes mood"],
                },
              ],
              attemptCount: historyRequests > 1 ? 0 : 1,
              latestAttemptId: historyRequests > 1 ? undefined : 501,
              latestScore: historyRequests > 1 ? undefined : 50,
              latestWrongCount: historyRequests > 1 ? undefined : 1,
              latestAttemptTime:
                historyRequests > 1 ? undefined : "2026-06-23T08:00:00Z",
            },
          ],
          total: 1,
          page: 1,
          pageSize: 10,
        });
      }
      if (config.url === "/context-lab/attempt-history") {
        attemptHistoryRequests += 1;
        return Promise.resolve({
          list:
            attemptHistoryRequests > 1
              ? []
              : [
                  {
                    id: 501,
                    attemptId: 501,
                    taskId: 12,
                    articleExerciseId: 88,
                    score: 50,
                    correctCount: 0,
                    wrongCount: 1,
                    weakWords: ["vibe"],
                    nextSuggestions: ["复盘错题解析"],
                    answers: [{ questionId: "q1", selectedIndex: 0 }],
                    results: [],
                    elapsedSeconds: 42,
                    createTime: "2026-06-23T08:00:00Z",
                  },
                ],
          total: 1,
          page: 1,
          pageSize: 10,
        });
      }
      if (config.url === "/context-lab/attempt-detail") {
        return Promise.resolve({
          id: 501,
          attemptId: 501,
          taskId: 12,
          articleExerciseId: 88,
          score: 50,
          correctCount: 0,
          wrongCount: 1,
          weakWords: ["vibe"],
          nextSuggestions: ["复盘错题解析", "回看解析后再练一轮"],
          answers: [{ questionId: "q1" }],
          results: [
            {
              questionId: "q1",
              correct: false,
              correctIndex: 1,
              userSelectedIndex: 0,
              explanation: "段落强调的是情绪氛围，不是速度。",
            },
          ],
          elapsedSeconds: 42,
          createTime: "2026-06-23T08:00:00Z",
        });
      }
      if (config.url === "/context-lab/delete-attempt") {
        return Promise.resolve({ deleted: true });
      }
      return Promise.resolve({});
    });

    const user = userEvent.setup();
    render(<ContextLabPage />);

    await user.click(
      await screen.findByRole("button", { name: "任务 12 更多操作" }),
    );
    await user.click(await screen.findByText("查看记录"));
    expect(
      await screen.findByRole("dialog", { name: "练习记录" }),
    ).toBeInTheDocument();
    expect(screen.getByText("得分 50")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "查看详情" }));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/context-lab/attempt-detail",
          data: { attemptId: 501 },
        }),
      );
    });
    expect(
      await screen.findByText("Which answer matches the paragraph?"),
    ).toBeInTheDocument();
    expect(screen.getByText("你的作答 A. It celebrates speed")).toBeInTheDocument();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
    expect(screen.getByText("正确答案 B. It describes mood")).toBeInTheDocument();
    expect(
      screen.getByText("段落强调的是情绪氛围，不是速度。"),
    ).toBeInTheDocument();
    expect(screen.getByText("回看解析后再练一轮")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "收起详情" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "收起详情" }));
    await waitFor(() => {
      expect(
        screen.queryByText("Which answer matches the paragraph?"),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "查看详情" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "删除记录" }));
    await user.click(await screen.findByRole("button", { name: "确认删除" }));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/context-lab/delete-attempt",
          data: { attemptId: 501 },
        }),
      );
    });
    await waitFor(() => {
      expect(
        screen.queryByText("Which answer matches the paragraph?"),
      ).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(
        screen.getAllByText("还没有提交记录，开始练习后会出现在这里。"),
      ).toHaveLength(2);
    });
  });

  it("keeps the attempt detail drawer stable when legacy answer rows are strings", async () => {
    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/history") {
        return Promise.resolve({
          list: [
            {
              id: 12,
              taskId: 12,
              status: "succeeded",
              sourceType: "custom",
              words: ["vibe"],
              articleExerciseId: 88,
              article: "Topic\n\nParagraph.",
              questions: [
                {
                  id: "q1",
                  stem: "Which answer matches the paragraph?",
                  options: ["It celebrates speed", "It describes mood"],
                },
              ],
              attemptCount: 1,
              latestAttemptId: 501,
              latestScore: 50,
              latestWrongCount: 1,
              latestAttemptTime: "2026-06-23T08:00:00Z",
            },
          ],
          total: 1,
          page: 1,
          pageSize: 10,
        });
      }
      if (config.url === "/context-lab/attempt-history") {
        return Promise.resolve({
          list: [
            {
              id: 501,
              attemptId: 501,
              taskId: 12,
              articleExerciseId: 88,
              score: 50,
              correctCount: 0,
              wrongCount: 1,
              weakWords: [],
              nextSuggestions: [],
              answers: [],
              results: [],
              elapsedSeconds: 42,
              createTime: "2026-06-23T08:00:00Z",
            },
          ],
          total: 1,
          page: 1,
          pageSize: 10,
        });
      }
      if (config.url === "/context-lab/attempt-detail") {
        return Promise.resolve({
          id: 501,
          attemptId: 501,
          taskId: 12,
          articleExerciseId: 88,
          score: 50,
          correctCount: 0,
          wrongCount: 1,
          weakWords: [],
          nextSuggestions: [],
          answers: ["[object Object]"],
          results: ["[object Object]"],
          elapsedSeconds: 42,
          createTime: "2026-06-23T08:00:00Z",
        });
      }
      return Promise.resolve({});
    });

    const user = userEvent.setup();
    render(<ContextLabPage />);

    await user.click(
      await screen.findByRole("button", { name: "任务 12 更多操作" }),
    );
    await user.click(await screen.findByText("查看记录"));
    await user.click(await screen.findByRole("button", { name: "查看详情" }));

    expect(
      await screen.findByText("暂无可展示的作答详情"),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "练习记录" })).toBeInTheDocument();
  });

  it("deletes a practice package after confirmation", async () => {
    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/history") {
        return Promise.resolve({
          list: [
            {
              id: 12,
              taskId: 12,
              status: "succeeded",
              sourceType: "custom",
              words: ["vibe"],
              articleExerciseId: 88,
              article: "Topic\n\nParagraph.",
              questions: [],
            },
          ],
          total: 1,
          page: 1,
          pageSize: 10,
        });
      }
      if (config.url === "/context-lab/delete-task") {
        return Promise.resolve({ deleted: true });
      }
      return Promise.resolve({});
    });

    const user = userEvent.setup();
    render(<ContextLabPage />);

    expect(await screen.findByText("生成完成")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "任务 12 更多操作" }),
    );
    await user.click(await screen.findByText("删除练习包"));
    await user.click(await screen.findByRole("button", { name: "确认删除" }));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/context-lab/delete-task",
          data: { taskId: 12 },
        }),
      );
    });
  });

  it("blocks deleting a pending practice package and explains why", async () => {
    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/history") {
        return Promise.resolve({
          list: [
            {
              id: 12,
              taskId: 12,
              status: "pending",
              sourceType: "custom",
              words: ["vibe"],
              articleExerciseId: null,
              article: "",
              questions: [],
            },
          ],
          total: 1,
          page: 1,
          pageSize: 10,
        });
      }
      return Promise.resolve({});
    });
    const warningSpy = vi.spyOn(message, "warning").mockImplementation(() => {
      const hide = () => undefined;
      return hide as unknown as ReturnType<typeof message.warning>;
    });

    const user = userEvent.setup();
    render(<ContextLabPage />);

    expect(await screen.findByText("等待回调")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "任务 12 更多操作" }),
    );
    await user.click(await screen.findByText("删除练习包"));

    expect(warningSpy).toHaveBeenCalledWith(
      "生成中的练习包暂不支持删除，请等待任务完成或失败后再操作",
    );
    expect(requestMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ url: "/context-lab/delete-task" }),
    );
    expect(
      screen.queryByRole("button", { name: "确认删除" }),
    ).not.toBeInTheDocument();
  });

  it("routes result review to the word library without a full reload inside the app", async () => {
    requestMock.mockImplementation((requestConfig: unknown) => {
      const config = requestConfig as { url?: string };
      if (config.url === "/context-lab/history") {
        return Promise.resolve({
          list: [
            {
              id: 12,
              taskId: 12,
              status: "succeeded",
              sourceType: "custom",
              words: ["urban", "farming"],
              article: "Topic\n\nParagraph one.\n\nParagraph two.\n\nParagraph three.",
              questions: [
                {
                  id: "q-1",
                  question: "Which topic is mentioned?",
                  options: ["Space travel", "Urban farming", "Deep sea"],
                  correctAnswer: 1,
                },
              ],
            },
          ],
          total: 1,
          page: 1,
          pageSize: 10,
        });
      }
      if (config.url === "/context-lab/submit") {
        return Promise.resolve({
          results: [{ isCorrect: true, explanation: "答对了" }],
          score: 100,
          correctCount: 1,
          wrongCount: 0,
          weakWords: [],
          nextSuggestions: ["继续保持"],
        });
      }
      return Promise.resolve({});
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/englishWorld/context-lab"]}>
        <ContextLabPage />
        <LocationProbe />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("button", { name: "开始练习" }));
    await user.click(await screen.findByLabelText("B. Urban farming"));
    await user.click(screen.getByRole("button", { name: "提交练习" }));

    const review = await screen.findByLabelText("结果复盘");
    expect(
      within(review).queryByRole("button", { name: "用薄弱词再练一套" }),
    ).not.toBeInTheDocument();
    await user.click(within(review).getByRole("button", { name: "打开词库" }));

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/englishWorld/words",
    );
  });

  it("downloads the PDF template from the toolbar", async () => {
    requestMock.mockResolvedValue({ list: [], total: 0, page: 1, pageSize: 10 });
    downloadMock.mockResolvedValue(undefined);

    render(<ContextLabPage />);

    await userEvent.click(
      screen.getByRole("button", { name: /下载 PDF 模板/ }),
    );

    expect(downloadMock).toHaveBeenCalled();
  });

  it("downloads the completed exercise PDF from the current task", async () => {
    requestMock.mockResolvedValue({
      list: [
        {
          id: 12,
          taskId: 12,
          status: "succeeded",
          sourceType: "custom",
          words: ["fragile", "steady", "recover"],
          articleExerciseId: 88,
          article: "A short practice article.",
          questions: [
            {
              id: "q1",
              stem: "What does fragile mean?",
              options: ["Easy to break", "Very fast"],
            },
          ],
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });
    downloadTaskMock.mockResolvedValue(undefined);

    render(<ContextLabPage />);

    await userEvent.click(await screen.findByRole("button", { name: "开始练习" }));
    expect(
      screen.getByRole("region", { name: /AI 语境练习/ }),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "任务 12 更多操作" }),
    );
    await userEvent.click(await screen.findByText("下载 PDF"));

    expect(downloadTaskMock).toHaveBeenCalledWith(12);
  });

  it("renders generated article paragraphs with reading indentation", async () => {
    requestMock.mockResolvedValue({
      list: [
        {
          id: 12,
          taskId: 12,
          status: "succeeded",
          sourceType: "custom",
          words: ["fragile", "steady", "recover"],
          articleExerciseId: 88,
          article: "First paragraph.\n\nSecond paragraph.",
          questions: [
            {
              id: "q1",
              stem: "What does fragile mean?",
              options: ["Easy to break", "Very fast"],
            },
          ],
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });

    render(<ContextLabPage />);

    await userEvent.click(await screen.findByRole("button", { name: "开始练习" }));
    expect(
      screen.getByRole("region", { name: /AI 语境练习/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("雅思阅读")).toBeInTheDocument();
    expect(screen.queryByText("短阅读")).not.toBeInTheDocument();

    expect(screen.getByText("First paragraph.")).toHaveClass(
      "context-lab-article-paragraph",
    );
    expect(screen.getByText("Second paragraph.")).toHaveClass(
      "context-lab-article-paragraph",
    );
  });

  it("strips markdown bold markers from generated article text", async () => {
    requestMock.mockResolvedValue({
      list: [
        {
          id: 12,
          taskId: 12,
          status: "succeeded",
          sourceType: "custom",
          words: ["remarkable", "plight", "the high speed train"],
          articleExerciseId: 88,
          article:
            "Urban Renewal\n\nThese **remarkable** policies still stopped short of the actual demand.\n\nThe **plight** of low-income renters remains unchanged.\n\nThe arrival of **the high speed train** must be accompanied by social policy.",
          questions: [
            {
              id: "q1",
              stem: "What does remarkable mean?",
              options: ["Notable", "Hidden", "Weak", "Brief"],
            },
          ],
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });

    render(<ContextLabPage />);

    await userEvent.click(await screen.findByRole("button", { name: "开始练习" }));
    expect(
      screen.getByRole("region", { name: /AI 语境练习/ }),
    ).toBeInTheDocument();

    expect(screen.getByText("Urban Renewal")).toBeInTheDocument();
    expect(
      screen.getByText(
        "These remarkable policies still stopped short of the actual demand.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("The plight of low-income renters remains unchanged."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/\*\*remarkable\*\*|\*\*plight\*\*|\*\*the high speed train\*\*/),
    ).not.toBeInTheDocument();
  });

  it("renders the generated article topic separately from body paragraphs", async () => {
    requestMock.mockResolvedValue({
      list: [
        {
          id: 12,
          taskId: 12,
          status: "succeeded",
          sourceType: "custom",
          words: ["fragile", "steady", "recover"],
          articleExerciseId: 88,
          article:
            "Urban Green Space and Public Trust\n\nFirst body paragraph.\n\nSecond body paragraph.\n\nThird body paragraph.",
          questions: [
            {
              id: "q1",
              stem: "What does fragile mean?",
              options: ["Easy to break", "Very fast"],
            },
          ],
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });

    render(<ContextLabPage />);

    await userEvent.click(await screen.findByRole("button", { name: "开始练习" }));
    expect(
      screen.getByRole("region", { name: /AI 语境练习/ }),
    ).toBeInTheDocument();

    expect(screen.getByText("Urban Green Space and Public Trust")).toHaveClass(
      "context-lab-article-topic",
    );
    expect(screen.getByText("First body paragraph.")).toHaveClass(
      "context-lab-article-paragraph",
    );
    expect(screen.queryByText("文章主题")).toBeInTheDocument();
  });

  it("renders a two-pane practice workspace with an answering timer", async () => {
    requestMock.mockResolvedValue({
      list: [
        {
          id: 12,
          taskId: 12,
          status: "succeeded",
          sourceType: "custom",
          words: ["fragile", "steady", "recover"],
          articleExerciseId: 88,
          article:
            "Urban Green Space and Public Trust\n\nFirst body paragraph.\n\nSecond body paragraph.\n\nThird body paragraph.",
          questions: [
            {
              id: "q1",
              stem: "What does fragile mean?",
              options: ["Easy to break", "Very fast"],
            },
          ],
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });

    render(<ContextLabPage />);

    await userEvent.click(await screen.findByRole("button", { name: "开始练习" }));
    const practiceWorkspace = screen.getByRole("region", {
      name: /AI 语境练习/,
    });

    expect(practiceWorkspace).toHaveClass("context-lab-active-practice");
    expect(screen.getByLabelText("文章阅读区")).toHaveClass(
      "context-lab-reading-pane",
    );
    expect(screen.getByLabelText("题目作答区")).toHaveClass(
      "context-lab-question-pane",
    );
    expect(screen.getByText("做题计时")).toBeInTheDocument();
    expect(screen.getByText("00:00")).toBeInTheDocument();
    expect(screen.getByText("已答 0/1")).toBeInTheDocument();
  });

  it("opens the legacy practice modal and lets the learner expand it fullscreen", async () => {
    requestMock.mockResolvedValue({
      list: [
        {
          id: 12,
          taskId: 12,
          status: "succeeded",
          sourceType: "custom",
          words: ["fragile", "steady", "recover"],
          articleExerciseId: 88,
          article: "A short practice article.",
          questions: [
            {
              id: "q1",
              stem: "What does fragile mean?",
              options: ["Easy to break", "Very fast"],
            },
          ],
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });

    const user = userEvent.setup();
    render(<ContextLabPage />);

    await user.click(await screen.findByRole("button", { name: "开始练习" }));
    const practiceDialog = screen.getByRole("dialog", {
      name: /AI 语境练习/,
    });
    expect(practiceDialog).toHaveClass("context-lab-practice-modal");
    expect(
      screen.getByRole("region", { name: /AI 语境练习/ }),
    ).toHaveClass("context-lab-active-practice");
    await user.click(screen.getByRole("button", { name: "占满屏幕" }));

    const fullscreenDialog = screen.getByRole("dialog", {
      name: /AI 语境练习/,
    });
    expect(fullscreenDialog).toHaveClass(
      "context-lab-practice-modal-fullscreen",
    );
    await user.click(
      within(fullscreenDialog).getByRole("button", { name: "退出满屏" }),
    );

    expect(practiceDialog).not.toHaveClass(
      "context-lab-practice-modal-fullscreen",
    );
    expect(
      within(practiceDialog).getByRole("button", { name: "占满屏幕" }),
    ).toBeInTheDocument();
  });

  it("opens a succeeded practice in the legacy modal", async () => {
    requestMock.mockResolvedValue({
      list: [
        {
          id: 12,
          taskId: 12,
          status: "succeeded",
          sourceType: "custom",
          words: ["fragile", "steady", "recover"],
          articleExerciseId: 88,
          article: "A short practice article.",
          questions: [
            {
              id: "q1",
              stem: "What does fragile mean?",
              options: ["Easy to break", "Very fast"],
            },
          ],
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });

    const { container } = render(<ContextLabPage />);

    await screen.findByText("生成完成");

    expect(container.querySelector(".context-lab-practice-pack")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "开始练习" }));
    expect(
      screen.getByRole("dialog", { name: /AI 语境练习/ }),
    ).toHaveClass("context-lab-practice-modal");
    expect(
      screen.getByRole("region", { name: "AI 语境练习内容" }),
    ).toBeInTheDocument();
  });

  it("submits generated question answers through the context lab submit contract", async () => {
    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/history") {
        return Promise.resolve({
          list: [
            {
              id: 12,
              taskId: 12,
              status: "succeeded",
              sourceType: "proficiency",
              words: ["resilient"],
              articleExerciseId: 12,
              article: "A short practice article.",
              questions: [
                {
                  id: "q1",
                  stem: "What does resilient mean?",
                  options: ["able to recover", "easy to break"],
                },
              ],
            },
          ],
          total: 1,
          page: 1,
          pageSize: 10,
        });
      }
      if (config.url === "/context-lab/submit") {
        return Promise.resolve({
          results: [
            {
              questionId: "q1",
              correct: true,
              correctIndex: 0,
              userSelectedIndex: 0,
              explanation: "ok",
            },
          ],
        });
      }
      return Promise.resolve({});
    });

    render(<ContextLabPage />);

    await userEvent.click(await screen.findByRole("button", { name: "开始练习" }));
    expect(
      screen.getByRole("region", { name: /AI 语境练习/ }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByText("A. able to recover"));
    await userEvent.click(screen.getByRole("button", { name: "提交练习" }));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/context-lab/submit",
          method: "POST",
          data: expect.objectContaining({
            sessionId: 12,
            elapsedSeconds: expect.any(Number),
            answers: [{ questionId: "q1", selectedIndex: 0 }],
          }),
          __responseType: undefined,
        }),
      );
    });
  });

  it(
    "adds selected article text to the word library through AI completion",
    async () => {
      let resolveEnrichment: (value: unknown) => void = () => undefined;
      const pendingEnrichment = new Promise((resolve) => {
        resolveEnrichment = resolve;
      });
      requestMock.mockImplementation((config) => {
        if (config.url === "/context-lab/history") {
          return Promise.resolve(
            buildSelectedWordHistory(
              "Urban Ecology\n\nInsects support urban farming.",
            ),
          );
        }
        if (config.url === "/english/importMissingWords/enrich-preview") {
          return pendingEnrichment;
        }
        if (config.url === "/english/importMissingWords/preview") {
          return Promise.resolve({
            received: 1,
            normalized: 1,
            importable: 1,
            skippedExisting: 0,
            skippedDuplicate: 0,
            existingWords: [],
            duplicateWords: [],
          });
        }
        if (config.url === "/english/importMissingWords") {
          return Promise.resolve({
            received: 1,
            normalized: 1,
            inserted: 1,
            updated: 0,
            skippedExisting: 0,
            skippedDuplicate: 0,
            insertedWords: ["insect"],
            updatedWords: [],
            skippedWords: [],
          });
        }
        return Promise.resolve({});
      });

      const user = userEvent.setup();
      render(<ContextLabPage />);

      await user.click(
        await screen.findByRole("button", { name: "开始练习" }),
      );
      const paragraph = await screen.findByText(
        "Insects support urban farming.",
      );
      vi.spyOn(window, "getSelection").mockReturnValue({
        toString: () => "insects",
        rangeCount: 1,
        removeAllRanges: vi.fn(),
      } as unknown as Selection);

      await user.pointer({ target: paragraph, keys: "[MouseRight]" });
      await user.click(await screen.findByText("一键添加到词库"));

      const preview = await screen.findByRole("region", {
        name: "导入预览",
      });
      expect(within(preview).getByDisplayValue("insects")).toBeInTheDocument();
      expect(within(preview).getByText("AI 补全中")).toBeInTheDocument();
      expect(screen.queryByText("添加单词")).not.toBeInTheDocument();

      await act(async () => {
        resolveEnrichment({
          received: 1,
          aiEnhanced: true,
          items: [
            {
              englishWord: "insect",
              englishPhonetic: "/ˈɪnsekt/",
              englishChinese: "昆虫",
              englishPartSpeech: [2],
              englishLevel: 0,
              englishType: 0,
              englishNote: "原始词形：insects（复数形式）",
              englishReference: "AI 批量导入",
            },
          ],
        });
      });

      expect(await within(preview).findByDisplayValue("insect")).toBeInTheDocument();
      expect(within(preview).getByDisplayValue("/ˈɪnsekt/")).toBeInTheDocument();
      expect(within(preview).getByDisplayValue("昆虫")).toBeInTheDocument();
      expect(
        within(preview).getByDisplayValue("原始词形：insects（复数形式）"),
      ).toBeInTheDocument();

      await user.click(
        within(preview).getByRole("button", { name: "确认导入" }),
      );

      await waitFor(() => {
        expect(requestMock).toHaveBeenCalledWith({
          url: "/english/importMissingWords",
          method: "POST",
          data: {
            overwriteExisting: false,
            words: [
              expect.objectContaining({
                englishWord: "insect",
                englishNote: "原始词形：insects（复数形式）",
                englishReference:
                  "/englishWorld/context-lab?taskId=12&articleExerciseId=88&word=insects",
              }),
            ],
          },
          __responseType: undefined,
        });
      });
      const requestedUrls = requestMock.mock.calls.map(([config]) => config.url);
      expect(requestedUrls).not.toContain("/word-agent/query");
      expect(requestedUrls).not.toContain("/english/existEnglishWord");
      expect(requestedUrls).not.toContain("/english/AddEnglishWord");
    },
    25_000,
  );

  it("keeps the selected word editable when AI enrichment fails", async () => {
    const errorSpy = vi.spyOn(message, "error");
    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/history") {
        return Promise.resolve(
          buildSelectedWordHistory(
            "Urban Ecology\n\nInsects support urban farming.",
          ),
        );
      }
      if (config.url === "/english/importMissingWords/enrich-preview") {
        return Promise.reject(new Error("AI 补全暂不可用"));
      }
      return Promise.resolve({});
    });

    const user = userEvent.setup();
    render(<ContextLabPage />);

    await user.click(await screen.findByRole("button", { name: "开始练习" }));
    const paragraph = await screen.findByText("Insects support urban farming.");
    vi.spyOn(window, "getSelection").mockReturnValue({
      toString: () => "  “insects,” ",
      rangeCount: 1,
      removeAllRanges: vi.fn(),
    } as unknown as Selection);

    await user.pointer({ target: paragraph, keys: "[MouseRight]" });
    await user.click(await screen.findByText("一键添加到词库"));

    const preview = await screen.findByRole("region", { name: "导入预览" });
    expect(within(preview).getByDisplayValue("insects")).toBeInTheDocument();
    expect(screen.queryByText("添加单词")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith("AI 补全暂不可用");
    });
    expect(within(preview).getByDisplayValue("insects")).toBeInTheDocument();
  }, 20_000);

  it("keeps marked words after importing one directly selected word", async () => {
    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/history") {
        return Promise.resolve(
          buildSelectedWordHistory(
            "Urban Ecology\n\nUrban farming relies on insects.",
          ),
        );
      }
      if (config.url === "/english/importMissingWords/enrich-preview") {
        return Promise.resolve({
          received: 1,
          aiEnhanced: true,
          items: [
            {
              englishWord: "insect",
              englishPhonetic: "/ˈɪnsekt/",
              englishChinese: "昆虫",
              englishPartSpeech: [2],
              englishLevel: 0,
              englishType: 0,
              englishNote: "原始词形：insects（复数形式）",
            },
          ],
        });
      }
      if (config.url === "/english/importMissingWords/preview") {
        return Promise.resolve({
          received: 1,
          normalized: 1,
          importable: 1,
          skippedExisting: 0,
          skippedDuplicate: 0,
          existingWords: [],
          duplicateWords: [],
        });
      }
      if (config.url === "/english/importMissingWords") {
        return Promise.resolve({
          received: 1,
          normalized: 1,
          inserted: 1,
          updated: 0,
          skippedExisting: 0,
          skippedDuplicate: 0,
          insertedWords: ["insect"],
          updatedWords: [],
          skippedWords: [],
        });
      }
      return Promise.resolve({});
    });

    const user = userEvent.setup();
    render(<ContextLabPage />);

    await user.click(await screen.findByRole("button", { name: "开始练习" }));
    const paragraph = await screen.findByText(
      "Urban farming relies on insects.",
    );
    let selectedText = "urban farming";
    vi.spyOn(window, "getSelection").mockImplementation(
      () =>
        ({
          toString: () => selectedText,
          rangeCount: 1,
          removeAllRanges: vi.fn(),
        }) as unknown as Selection,
    );

    await user.pointer({ target: paragraph, keys: "[MouseRight]" });
    await user.click(await screen.findByText("标记生词"));
    const markedPanel = await screen.findByLabelText("已标记生词");
    expect(within(markedPanel).getByText("urban farming")).toBeInTheDocument();

    selectedText = "insects";
    await user.pointer({ target: paragraph, keys: "[MouseRight]" });
    await user.click(await screen.findByText("一键添加到词库"));

    const preview = await screen.findByRole("region", { name: "导入预览" });
    expect(await within(preview).findByDisplayValue("insect")).toBeInTheDocument();
    await user.click(
      within(preview).getByRole("button", { name: "确认导入" }),
    );

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/english/importMissingWords",
          data: expect.objectContaining({
            words: [expect.objectContaining({ englishWord: "insect" })],
          }),
        }),
      );
    });
    expect(within(markedPanel).getByText("urban farming")).toBeInTheDocument();
  }, 25_000);

  it("ignores enrichment after the selected-word preview is closed", async () => {
    let resolveEnrichment: (value: unknown) => void = () => undefined;
    const pendingEnrichment = new Promise((resolve) => {
      resolveEnrichment = resolve;
    });
    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/history") {
        return Promise.resolve(
          buildSelectedWordHistory(
            "Urban Ecology\n\nInsects support urban farming.",
          ),
        );
      }
      if (config.url === "/english/importMissingWords/enrich-preview") {
        return pendingEnrichment;
      }
      return Promise.resolve({});
    });

    const user = userEvent.setup();
    render(<ContextLabPage />);

    await user.click(await screen.findByRole("button", { name: "开始练习" }));
    const paragraph = await screen.findByText("Insects support urban farming.");
    vi.spyOn(window, "getSelection").mockReturnValue({
      toString: () => "insects",
      rangeCount: 1,
      removeAllRanges: vi.fn(),
    } as unknown as Selection);

    await user.pointer({ target: paragraph, keys: "[MouseRight]" });
    await user.click(await screen.findByText("一键添加到词库"));
    const preview = await screen.findByRole("region", { name: "导入预览" });
    expect(within(preview).getByDisplayValue("insects")).toBeInTheDocument();

    fireEvent.click(
      within(preview).getByRole("button", { name: "继续标记" }),
    );

    await act(async () => {
      resolveEnrichment({
        received: 1,
        aiEnhanced: true,
        items: [
          {
            englishWord: "insect",
            englishChinese: "昆虫",
            englishPartSpeech: [2],
            englishLevel: 0,
            englishType: 0,
          },
        ],
      });
    });

    expect(within(preview).getByDisplayValue("insects")).toBeInTheDocument();
    expect(within(preview).queryByDisplayValue("insect")).not.toBeInTheDocument();
  }, 20_000);

  it("hides the selected text add menu when the reading pane scrolls", async () => {
    requestMock.mockResolvedValue({
      list: [
        {
          id: 12,
          taskId: 12,
          status: "succeeded",
          sourceType: "custom",
          words: ["urban farming"],
          articleExerciseId: 88,
          article:
            "Urban Farming\n\nUrban farming improves local food supply.",
          questions: [
            {
              id: "q1",
              stem: "What is the passage about?",
              options: ["Urban farming", "Space travel"],
            },
          ],
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });

    const user = userEvent.setup();
    render(<ContextLabPage />);

    await user.click(await screen.findByRole("button", { name: "开始练习" }));
    const paragraph = await screen.findByText(
      "Urban farming improves local food supply.",
    );
    vi.spyOn(window, "getSelection").mockReturnValue({
      toString: () => "urban farming",
      rangeCount: 1,
      removeAllRanges: vi.fn(),
    } as unknown as Selection);

    await user.pointer({ target: paragraph, keys: "[MouseRight]" });
    expect(await screen.findByText("一键添加到词库")).toBeInTheDocument();

    screen.getByLabelText("文章阅读区").dispatchEvent(
      new Event("scroll", { bubbles: true }),
    );

    await waitFor(() => {
      expect(screen.queryByText("一键添加到词库")).not.toBeInTheDocument();
    });
  });

  it("translates selected article text from the context menu", async () => {
    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/history") {
        return Promise.resolve({
          list: [
            {
              id: 12,
              taskId: 12,
              status: "succeeded",
              sourceType: "custom",
              words: ["urban farming"],
              articleExerciseId: 88,
              article:
                "Urban Farming\n\nUrban farming improves local food supply.",
              questions: [
                {
                  id: "q1",
                  stem: "What is the passage about?",
                  options: ["Urban farming", "Space travel"],
                },
              ],
            },
          ],
          total: 1,
          page: 1,
          pageSize: 10,
        });
      }
      if (config.url === "/word-agent/query") {
        return Promise.resolve({
          words: [
            {
              word: "urban farming",
              phonetic: "/ˈɜːbən ˈfɑːmɪŋ/",
              meaning: "城市农业；都市农耕",
              partOfSpeech: [2],
              examples: [],
              ieltsCase: null,
            },
          ],
        });
      }
      return Promise.resolve({});
    });

    const user = userEvent.setup();
    render(<ContextLabPage />);

    await user.click(await screen.findByRole("button", { name: "开始练习" }));
    const paragraph = await screen.findByText(
      "Urban farming improves local food supply.",
    );
    vi.spyOn(window, "getSelection").mockReturnValue({
      toString: () => "urban farming",
      rangeCount: 1,
      removeAllRanges: vi.fn(),
    } as unknown as Selection);

    await user.pointer({ target: paragraph, keys: "[MouseRight]" });
    await user.click(await screen.findByText("翻译"));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith({
        url: "/word-agent/query",
        method: "POST",
        data: { word: "urban farming" },
        __responseType: undefined,
      });
    });
    expect(await screen.findByText("城市农业；都市农耕")).toBeInTheDocument();
    expect(screen.getByText("/ˈɜːbən ˈfɑːmɪŋ/")).toBeInTheDocument();
    expect(screen.queryByText("添加单词")).not.toBeInTheDocument();
  });

  it("opens the import preview immediately while AI completion is still loading", async () => {
    let resolveEnrichment: (value: unknown) => void = () => undefined;
    const pendingEnrichment = new Promise((resolve) => {
      resolveEnrichment = resolve;
    });

    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/history") {
        return Promise.resolve({
          list: [
            {
              id: 12,
              taskId: 12,
              status: "succeeded",
              sourceType: "custom",
              words: ["urban farming"],
              articleExerciseId: 88,
              article:
                "Urban Farming\n\nUrban farming improves local food supply.",
              questions: [
                {
                  id: "q1",
                  stem: "What is the passage about?",
                  options: ["Urban farming", "Space travel"],
                },
              ],
            },
          ],
          total: 1,
          page: 1,
          pageSize: 10,
        });
      }
      if (config.url === "/english/importMissingWords/enrich-preview") {
        return pendingEnrichment;
      }
      return Promise.resolve({});
    });

    const user = userEvent.setup();
    render(<ContextLabPage />);

    await user.click(await screen.findByRole("button", { name: "开始练习" }));
    const paragraph = await screen.findByText(
      "Urban farming improves local food supply.",
    );
    vi.spyOn(window, "getSelection").mockReturnValue({
      toString: () => "urban farming",
      rangeCount: 1,
      removeAllRanges: vi.fn(),
    } as unknown as Selection);

    await user.pointer({ target: paragraph, keys: "[MouseRight]" });
    await user.click(await screen.findByText("标记生词"));
    const markedPanel = await screen.findByLabelText("已标记生词");
    await user.click(
      within(markedPanel).getByRole("button", { name: "预览并导入" }),
    );

    const previewDialog = await screen.findByRole("region", {
      name: "导入预览",
    });
    expect(
      within(previewDialog).getByDisplayValue("urban farming"),
    ).toBeInTheDocument();
    expect(within(previewDialog).getByText("AI 补全中")).toBeInTheDocument();

    resolveEnrichment({ received: 1, aiEnhanced: true, items: [] });
  });

  it("opens editable AI-completed word preview before importing marked words", async () => {
    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/history") {
        return Promise.resolve({
          list: [
            {
              id: 12,
              taskId: 12,
              status: "succeeded",
              sourceType: "custom",
              words: ["urban farming"],
              articleExerciseId: 88,
              article:
                "Urban Farming\n\nUrban farming improves local food supply.",
              questions: [
                {
                  id: "q1",
                  stem: "What is the passage about?",
                  options: ["Urban farming", "Space travel"],
                },
              ],
            },
          ],
          total: 1,
          page: 1,
          pageSize: 10,
        });
      }
      if (config.url === "/english/importMissingWords/enrich-preview") {
        return Promise.resolve({
          received: 1,
          aiEnhanced: true,
          items: [
            {
              englishWord: "urban farming",
              englishPhonetic: "/ˈɜːbən ˈfɑːmɪŋ/",
              englishChinese: "城市农业；都市农耕",
              englishPartSpeech: [2],
              englishLevel: 0,
              englishType: 1,
              englishReference: "AI 批量导入",
            },
          ],
        });
      }
      if (config.url === "/english/importMissingWords/preview") {
        return Promise.resolve({
          received: 1,
          normalized: 1,
          importable: 1,
          skippedExisting: 0,
          skippedDuplicate: 0,
          existingWords: [],
          duplicateWords: [],
        });
      }
      if (config.url === "/english/importMissingWords") {
        return Promise.resolve({
          received: 1,
          normalized: 1,
          inserted: 1,
          skippedExisting: 0,
          skippedDuplicate: 0,
          insertedWords: ["urban farming"],
          skippedWords: [],
        });
      }
      return Promise.resolve({});
    });

    const user = userEvent.setup();
    render(<ContextLabPage />);

    await user.click(await screen.findByRole("button", { name: "开始练习" }));
    const paragraph = await screen.findByText(
      "Urban farming improves local food supply.",
    );
    const selection = {
      toString: () => "  urban   farming ",
      rangeCount: 1,
      removeAllRanges: vi.fn(),
    };
    vi.spyOn(window, "getSelection").mockReturnValue(
      selection as unknown as Selection,
    );

    await user.pointer({ target: paragraph, keys: "[MouseRight]" });
    await user.click(await screen.findByText("标记生词"));

    const markedPanel = await screen.findByLabelText("已标记生词");
    expect(within(markedPanel).getByText("urban farming")).toBeInTheDocument();
    expect(
      document.querySelector(".context-lab-marked-vocabulary-highlight"),
    ).toHaveTextContent(/urban farming/i);
    expect(requestMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ url: "/word-agent/query" }),
    );

    await user.click(
      within(markedPanel).getByRole("button", { name: "预览并导入" }),
    );

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith({
        url: "/english/importMissingWords/enrich-preview",
        method: "POST",
        data: {
          words: [
            {
              englishWord: "urban farming",
              englishLevel: 0,
              englishType: 1,
              englishPartSpeech: [9],
              englishReference:
                "/englishWorld/context-lab?taskId=12&articleExerciseId=88&word=urban+farming",
            },
          ],
          defaultLevel: 0,
          useAi: true,
        },
        __responseType: undefined,
      });
    });
    const previewDialog = await screen.findByRole("region", {
      name: "导入预览",
    });
    expect(within(previewDialog).getByDisplayValue("urban farming")).toBeInTheDocument();
    expect(
      within(previewDialog).getByDisplayValue("/ˈɜːbən ˈfɑːmɪŋ/"),
    ).toBeInTheDocument();
    const meaningInput = within(previewDialog).getByLabelText("第 1 个词释义");
    expect(meaningInput).toHaveValue("城市农业；都市农耕");
    expect(requestMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ url: "/english/importMissingWords" }),
    );

    await user.clear(meaningInput);
    await user.type(meaningInput, "城市农耕（我确认过）");

    await user.click(
      within(previewDialog).getByRole("button", { name: "确认导入" }),
    );

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith({
        url: "/english/importMissingWords",
        method: "POST",
        data: {
          overwriteExisting: false,
          words: [
            {
              englishWord: "urban farming",
              englishPhonetic: "/ˈɜːbən ˈfɑːmɪŋ/",
              englishChinese: "城市农耕（我确认过）",
              englishPartSpeech: [2],
              englishLevel: 0,
              englishType: 1,
              englishReference:
                "/englishWorld/context-lab?taskId=12&articleExerciseId=88&word=urban+farming",
            },
          ],
        },
        __responseType: undefined,
      });
    });
    await waitFor(() => {
      expect(screen.queryByLabelText("已标记生词")).not.toBeInTheDocument();
    });
  });

  it("warns about existing marked words before importing when overwrite is off", async () => {
    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/history") {
        return Promise.resolve({
          list: [
            {
              id: 12,
              taskId: 12,
              status: "succeeded",
              sourceType: "custom",
              words: ["urban farming"],
              articleExerciseId: 88,
              article:
                "Urban Farming\n\nUrban farming improves local food supply.",
              questions: [
                {
                  id: "q1",
                  stem: "What is the passage about?",
                  options: ["Urban farming", "Space travel"],
                },
              ],
            },
          ],
          total: 1,
          page: 1,
          pageSize: 10,
        });
      }
      if (config.url === "/english/importMissingWords/enrich-preview") {
        return Promise.resolve({
          received: 1,
          aiEnhanced: true,
          items: [
            {
              englishWord: "urban farming",
              englishChinese: "城市农业",
              englishLevel: 0,
              englishType: 1,
              englishReference:
                "/englishWorld/context-lab?taskId=12&articleExerciseId=88&word=urban+farming",
            },
          ],
        });
      }
      if (config.url === "/english/importMissingWords/preview") {
        return Promise.resolve({
          received: 1,
          normalized: 1,
          importable: 0,
          skippedExisting: 1,
          skippedDuplicate: 0,
          existingWords: ["urban farming"],
          duplicateWords: [],
        });
      }
      if (config.url === "/english/importMissingWords") {
        return Promise.resolve({
          received: 1,
          normalized: 1,
          inserted: 0,
          skippedExisting: 1,
          skippedDuplicate: 0,
          insertedWords: [],
          skippedWords: ["urban farming"],
        });
      }
      return Promise.resolve({});
    });

    const user = userEvent.setup();
    render(<ContextLabPage />);

    await user.click(await screen.findByRole("button", { name: "开始练习" }));
    const paragraph = await screen.findByText(
      "Urban farming improves local food supply.",
    );
    vi.spyOn(window, "getSelection").mockReturnValue({
      toString: () => "urban farming",
      rangeCount: 1,
      removeAllRanges: vi.fn(),
    } as unknown as Selection);

    await user.pointer({ target: paragraph, keys: "[MouseRight]" });
    await user.click(await screen.findByText("标记生词"));
    const markedPanel = await screen.findByLabelText("已标记生词");
    await user.click(
      within(markedPanel).getByRole("button", { name: "预览并导入" }),
    );
    const previewDialog = await screen.findByRole("region", {
      name: "导入预览",
    });
    await user.click(
      within(previewDialog).getByRole("button", { name: "确认导入" }),
    );

    expect(
      await screen.findByText("发现已有或重复词条，是否继续？"),
    ).toBeInTheDocument();
    expect(screen.getByText("词库中已存在 1 个，本次输入重复 0 个。继续后将新增 0 个词条，被跳过的词不会覆盖原内容。")).toBeInTheDocument();
    expect(requestMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ url: "/english/importMissingWords" }),
    );

    await user.click(screen.getByRole("button", { name: "继续导入" }));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/english/importMissingWords",
          data: expect.objectContaining({ overwriteExisting: false }),
        }),
      );
    });
  });

  it("lets marked vocabulary reuse the bulk import overwrite confirmation", async () => {
    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/history") {
        return Promise.resolve({
          list: [
            {
              id: 12,
              taskId: 12,
              status: "succeeded",
              sourceType: "custom",
              words: ["urban farming"],
              articleExerciseId: 88,
              article:
                "Urban Farming\n\nUrban farming improves local food supply.",
              questions: [
                {
                  id: "q1",
                  stem: "What is the passage about?",
                  options: ["Urban farming", "Space travel"],
                },
              ],
            },
          ],
          total: 1,
          page: 1,
          pageSize: 10,
        });
      }
      if (config.url === "/english/importMissingWords/enrich-preview") {
        return Promise.resolve({
          received: 1,
          aiEnhanced: true,
          items: [
            {
              englishWord: "urban farming",
              englishPhonetic: "/ˈɜːbən ˈfɑːmɪŋ/",
              englishChinese: "城市农业；都市农耕",
              englishPartSpeech: [2],
              englishLevel: 0,
              englishType: 1,
              englishReference:
                "/englishWorld/context-lab?taskId=12&articleExerciseId=88&word=urban+farming",
            },
          ],
        });
      }
      if (config.url === "/english/importMissingWords") {
        return Promise.resolve({
          received: 1,
          normalized: 1,
          inserted: 0,
          skippedExisting: 0,
          skippedDuplicate: 0,
          insertedWords: [],
          skippedWords: [],
          updated: 1,
          updatedWords: ["urban farming"],
        });
      }
      return Promise.resolve({});
    });

    const user = userEvent.setup();
    render(<ContextLabPage />);

    await user.click(await screen.findByRole("button", { name: "开始练习" }));
    const paragraph = await screen.findByText(
      "Urban farming improves local food supply.",
    );
    vi.spyOn(window, "getSelection").mockReturnValue({
      toString: () => "urban farming",
      rangeCount: 1,
      removeAllRanges: vi.fn(),
    } as unknown as Selection);

    await user.pointer({ target: paragraph, keys: "[MouseRight]" });
    await user.click(await screen.findByText("标记生词"));
    const markedPanel = await screen.findByLabelText("已标记生词");
    await user.click(
      within(markedPanel).getByRole("button", { name: "预览并导入" }),
    );

    const previewDialog = await screen.findByRole("region", {
      name: "导入预览",
    });
    await user.click(
      within(previewDialog).getByRole("switch", {
        name: /覆盖已存在词条/,
      }),
    );
    await user.click(
      within(previewDialog).getByRole("button", { name: "确认导入" }),
    );

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith({
        url: "/english/importMissingWords",
        method: "POST",
        data: {
          overwriteExisting: true,
          words: [
            expect.objectContaining({
              englishWord: "urban farming",
            }),
          ],
        },
        __responseType: undefined,
      });
    });
  });
});
