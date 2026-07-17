import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import { RecitePage } from "./RecitePage";

const startQuestions = [
  { wordId: 2, question: "脆弱的", direction: 0 },
  { wordId: 5, question: "有复原力的", direction: 0 },
];

const threeQuestionSession = [
  ...startQuestions,
  { wordId: 9, question: "梯度，坡度，斜率", direction: 0 },
];

const repairQuestions = [{ wordId: 2, question: "脆弱的", direction: 0 }];
let submitShouldReject = false;
let submitAllCorrect = false;
let submitAllWrong = false;
let useThreeQuestionSession = false;
let recoveryShouldReject = false;

const submittedResult = () => ({
  sessionId: 91,
  direction: 1,
  results: [
    {
      wordId: 2,
      englishWord: "fragile",
      correctAnswer: "fragile",
      userAnswer: "fragil",
      isCorrect: submitAllCorrect ? true : false,
    },
    {
      wordId: 5,
      englishWord: "resilient",
      correctAnswer: "resilient",
      userAnswer: "resilient",
      isCorrect: !submitAllWrong,
    },
  ],
  statistics: {
    totalCount: 2,
    correctCount: submitAllCorrect ? 2 : submitAllWrong ? 0 : 1,
    errorCount: submitAllCorrect ? 0 : submitAllWrong ? 2 : 1,
    accuracy: submitAllCorrect ? 100 : submitAllWrong ? 0 : 50,
  },
});

const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid="location-probe">{`${location.pathname}${location.search}`}</output>;
};

const requestMock = vi.fn((requestConfig: unknown) => {
  const config = requestConfig as {
    url?: string;
    data?: {
      wordIds?: number[];
      answers?: Array<{ wordId: number; userAnswer: string }>;
    };
  };
  if (config.url === "/recite/start") {
    const usesRepair =
      Array.isArray(config.data?.wordIds) &&
      config.data.wordIds.length === 1 &&
      config.data.wordIds[0] === 2;
    return Promise.resolve({
      questions: usesRepair
        ? repairQuestions
        : useThreeQuestionSession
          ? threeQuestionSession
          : startQuestions,
      direction: 0,
      totalCount: usesRepair ? 1 : useThreeQuestionSession ? 3 : 2,
    });
  }
  if (config.url === "/recite/submit") {
    if (submitShouldReject) {
      return Promise.reject(new Error("提交失败"));
    }
    const result = submittedResult();
    result.results[0].userAnswer = config.data?.answers?.[0]?.userAnswer ?? "";
    result.results[1].userAnswer = config.data?.answers?.[1]?.userAnswer ?? "";
    return Promise.resolve(result);
  }
  if (config.url === "/recite/session-result") {
    if (recoveryShouldReject) {
      return Promise.reject(new Error("temporary"));
    }
    return Promise.resolve(submittedResult());
  }
  if (config.url === "/learning-loop/events") {
    return Promise.resolve({ id: 1 });
  }
  return Promise.resolve({});
});

vi.mock("@font/api", () => ({
  default: (requestConfig: unknown) => requestMock(requestConfig),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { username: "tester" },
    logout: vi.fn(),
  }),
}));

vi.mock("../component/SystemSettings", () => ({
  getSystemSettings: () =>
    Promise.resolve({
      wordDictation: {
        dictationCount: 10,
        proficiencyLevels: [0, 1],
        types: [0],
        direction: 0,
      },
    }),
}));

vi.mock("../component/BritishPronunciationButton", () => ({
  BritishPronunciationButton: ({ word }: { word: string }) => (
    <button type="button">play {word}</button>
  ),
}));

describe("RecitePage plan review", () => {
  beforeAll(() => {
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
    cleanup();
    window.localStorage.clear();
    requestMock.mockClear();
    submitShouldReject = false;
    submitAllCorrect = false;
    submitAllWrong = false;
    useThreeQuestionSession = false;
    recoveryShouldReject = false;
  });

  it("starts review with word ids from the daily plan query", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter
        initialEntries={[
          "/englishWorld/recite?source=repair&title=修复薄弱词&wordIds=2,5",
        ]}
      >
        <RecitePage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: /开始今日复习/ }));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/recite/start",
          data: expect.objectContaining({
            wordIds: [2, 5],
            wordCount: 2,
          }),
        }),
      );
    });

    expect(await screen.findByText("脆弱的")).toBeInTheDocument();
  });

  it("records next-day repair start once after the review session really starts", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter
        initialEntries={[
          "/englishWorld/recite?source=repair&title=%E5%A4%8D%E6%9F%A5%E6%98%A8%E6%97%A5%E9%94%99%E8%AF%8D&wordIds=2,5",
        ]}
      >
        <RecitePage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: /开始今日复习/ }));
    expect(await screen.findByText("脆弱的")).toBeInTheDocument();

    await waitFor(() => {
      const startEvents = requestMock.mock.calls.filter(([config]) => {
        const request = config as {
          url?: string;
          data?: { eventType?: string };
        };
        return (
          request.url === "/learning-loop/events" &&
          request.data?.eventType === "next_day_repair_started"
        );
      });
      expect(startEvents).toHaveLength(1);
      expect(startEvents[0][0]).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            eventUid: expect.stringMatching(/^next_day_repair_started:/),
            wordCount: 2,
            status: "started",
          }),
        }),
      );
    });
  });

  it("does not record a correct next-day repair when every answer is wrong", async () => {
    submitAllWrong = true;
    const user = userEvent.setup();
    render(
      <MemoryRouter
        initialEntries={[
          "/englishWorld/recite?source=repair&title=%E5%A4%8D%E6%9F%A5%E6%98%A8%E6%97%A5%E9%94%99%E8%AF%8D&wordIds=2,5",
        ]}
      >
        <RecitePage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: /开始今日复习/ }));
    await user.type(await screen.findByLabelText("你的答案"), "wrong{enter}");
    await user.type(await screen.findByLabelText("你的答案"), "wrong{enter}");
    await screen.findAllByTestId("recite-result-item");

    const correctEvents = requestMock.mock.calls.filter(([config]) => {
      const request = config as { url?: string; data?: { eventType?: string } };
      return request.url === "/learning-loop/events" && request.data?.eventType === "next_day_repair_correct";
    });
    expect(correctEvents).toHaveLength(0);
  });

  it("uses the shared collapsible shell so the sidebar does not cover review content", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MemoryRouter initialEntries={["/englishWorld/recite"]}>
        <RecitePage />
      </MemoryRouter>,
    );

    expect(container.querySelector(".english-world-main")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "收起侧栏" }));
    expect(container.querySelector(".english-world-shell-collapsed")).toBeInTheDocument();
    expect(screen.getByText("今日复习")).toBeInTheDocument();
  });

  it("uses a client-ready review studio instead of a form-like review card", async () => {
    const user = userEvent.setup();

    const { container } = render(
      <MemoryRouter initialEntries={["/englishWorld/recite"]}>
        <RecitePage />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole("button", { name: /开始复习|开始今日复习/ }),
    );

    expect(await screen.findByText("脆弱的")).toBeInTheDocument();
    expect(container.querySelector(".recite-studio-shell")).toBeInTheDocument();
    expect(container.querySelector(".recite-session-header")).toBeInTheDocument();
    expect(container.querySelector(".recite-question-canvas")).toBeInTheDocument();
    expect(container.querySelector(".recite-question-stage")).toBeInTheDocument();
    expect(container.querySelector(".recite-answer-dock")).toBeInTheDocument();
    expect(container.querySelector(".recite-progress-dots")).toBeInTheDocument();
  });

  it("does not mark skipped unfinished questions as completed in the progress dots", async () => {
    useThreeQuestionSession = true;
    const user = userEvent.setup();

    const { container } = render(
      <MemoryRouter initialEntries={["/englishWorld/recite"]}>
        <RecitePage />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole("button", { name: /开始复习|开始今日复习/ }),
    );
    await user.click(await screen.findByRole("button", { name: "下一题" }));
    await user.click(screen.getByRole("button", { name: "下一题" }));

    expect(await screen.findByText("梯度，坡度，斜率")).toBeInTheDocument();
    expect(container.querySelectorAll(".recite-progress-dot-active")).toHaveLength(0);
    expect(container.querySelectorAll(".recite-progress-dot-current")).toHaveLength(1);
  });

  it("uses Enter to move through questions and submit the final answer", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/englishWorld/recite"]}>
        <RecitePage />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole("button", { name: /开始复习|开始今日复习/ }),
    );
    expect(await screen.findByText("脆弱的")).toBeInTheDocument();

    await user.type(screen.getByLabelText("你的答案"), "fragil{enter}");
    expect(await screen.findByText("有复原力的")).toBeInTheDocument();

    await user.type(screen.getByLabelText("你的答案"), "resilient{enter}");

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/recite/submit",
          data: expect.objectContaining({
            answers: [
              { wordId: 2, userAnswer: "fragil" },
              { wordId: 5, userAnswer: "resilient" },
            ],
          }),
        }),
      );
    });
    const resultItems = await screen.findAllByTestId("recite-result-item");
    expect(resultItems[0]).toHaveTextContent("fragile");
  });

  it("writes the submitted session into the URL so refresh can recover it", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/englishWorld/recite"]}>
        <RecitePage />
        <LocationProbe />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: /开始复习|开始今日复习/ }));
    await user.type(await screen.findByLabelText("你的答案"), "fragil{enter}");
    await user.type(await screen.findByLabelText("你的答案"), "resilient{enter}");

    await waitFor(() => {
      expect(screen.getByTestId("location-probe")).toHaveTextContent(
        "/englishWorld/recite?view=result&sessionId=91",
      );
    });
  });

  it("renders wrong results first and starts a repair session from failed word ids", async () => {
    const user = userEvent.setup();

    const { container } = render(
      <MemoryRouter initialEntries={["/englishWorld/recite"]}>
        <RecitePage />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole("button", { name: /开始复习|开始今日复习/ }),
    );
    await user.type(await screen.findByLabelText("你的答案"), "fragil{enter}");
    await user.type(await screen.findByLabelText("你的答案"), "resilient{enter}");

    const resultItems = await screen.findAllByTestId("recite-result-item");
    expect(resultItems[0]).toHaveTextContent("fragile");
    expect(resultItems[0]).toHaveTextContent("错误");

    const resultActions = container.querySelector(".recite-result-actions");
    expect(resultActions).toBeInTheDocument();
    expect(resultActions?.querySelectorAll(".ant-btn-primary")).toHaveLength(1);
    const repairButton = within(resultActions as HTMLElement).getByRole(
      "button",
      { name: /再练错词/ },
    );
    expect(repairButton).not.toHaveClass("ant-btn-dangerous");
    expect(
      within(resultActions as HTMLElement).getByRole("button", {
        name: "回到今日路线",
      }),
    ).toBeInTheDocument();

    await user.click(repairButton);

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/recite/start",
          data: expect.objectContaining({
            wordIds: [2],
            wordCount: 1,
          }),
        }),
      );
    });
    expect(await screen.findByText("脆弱的")).toBeInTheDocument();
  });

  it("opens verified wrong words in micro context with a semantic action", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MemoryRouter initialEntries={["/englishWorld/recite"]}>
        <RecitePage />
        <LocationProbe />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole("button", { name: /开始复习|开始今日复习/ }),
    );
    await user.type(await screen.findByLabelText("你的答案"), "fragil{enter}");
    await user.type(await screen.findByLabelText("你的答案"), "resilient{enter}");

    const contextButton = await screen.findByRole("button", {
      name: /用错词做语境练习/,
    });
    expect(contextButton).toHaveTextContent("1 个词 · 约 3 分钟");
    expect(contextButton.querySelector('svg[data-icon="experiment"]')).toBeTruthy();
    expect(container.querySelector(".recite-context-repair-action")).toBeTruthy();

    await user.click(contextButton);
    await waitFor(() => {
      expect(screen.getByTestId("location-probe")).toHaveTextContent(
        "/englishWorld/context-lab?mode=micro&source=recite-result&reciteSessionId=91&words=fragile",
      );
    });
    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/learning-loop/events",
        data: expect.objectContaining({
          eventType: "micro_context_started",
          reciteSessionId: 91,
          wordCount: 1,
        }),
      }),
    );
  });

  it("does not show the micro context action after an all-correct result", async () => {
    submitAllCorrect = true;
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/englishWorld/recite"]}>
        <RecitePage />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole("button", { name: /开始复习|开始今日复习/ }),
    );
    await user.type(await screen.findByLabelText("你的答案"), "fragile{enter}");
    await user.type(await screen.findByLabelText("你的答案"), "resilient{enter}");

    await screen.findByText("今天状态不错");
    expect(
      screen.queryByRole("button", { name: /用错词做语境练习/ }),
    ).not.toBeInTheDocument();
  });

  it("recovers a submitted result from its owned session after refresh", async () => {
    render(
      <MemoryRouter
        initialEntries={["/englishWorld/recite?view=result&sessionId=91"]}
      >
        <RecitePage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("今天先把基础拉回来")).toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledWith({
      url: "/recite/session-result",
      method: "POST",
      data: { sessionId: 91 },
    });
    expect((await screen.findAllByTestId("recite-result-item"))[0]).toHaveTextContent(
      "fragile",
    );
  });

  it("uses the recovered direction and starts a fresh flow for another wrong-word round", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/englishWorld/recite?view=result&sessionId=91"]}>
        <RecitePage />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("button", { name: /再练错词/ }));

    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/recite/start",
        data: expect.objectContaining({ direction: 1, wordIds: [2] }),
      }),
    );
    await waitFor(() => {
      const starts = requestMock.mock.calls.filter(([config]) => {
        const request = config as { url?: string; data?: { eventType?: string } };
        return request.url === "/learning-loop/events" && request.data?.eventType === "recite_started";
      });
      expect(starts).toHaveLength(1);
    });
  });

  it("lets the user retry a transient result recovery failure", async () => {
    recoveryShouldReject = true;
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/englishWorld/recite?view=result&sessionId=91"]}>
        <RecitePage />
      </MemoryRouter>,
    );

    const retry = await screen.findByRole("button", { name: "重试加载" });
    recoveryShouldReject = false;
    await user.click(retry);
    expect(await screen.findByText("今天先把基础拉回来")).toBeInTheDocument();
  });

  it("keeps answers visible when submit fails", async () => {
    submitShouldReject = true;
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/englishWorld/recite"]}>
        <RecitePage />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole("button", { name: /开始复习|开始今日复习/ }),
    );
    await user.type(await screen.findByLabelText("你的答案"), "fragil{enter}");
    await user.type(await screen.findByLabelText("你的答案"), "resilient{enter}");

    expect(await screen.findByDisplayValue("resilient")).toBeInTheDocument();
  });
});
