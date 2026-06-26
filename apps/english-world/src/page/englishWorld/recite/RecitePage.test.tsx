import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { RecitePage } from "./RecitePage";

const startQuestions = [
  { wordId: 2, question: "脆弱的", direction: 0 },
  { wordId: 5, question: "有复原力的", direction: 0 },
];

const repairQuestions = [{ wordId: 2, question: "脆弱的", direction: 0 }];
let submitShouldReject = false;

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
      questions: usesRepair ? repairQuestions : startQuestions,
      direction: 0,
      totalCount: usesRepair ? 1 : 2,
    });
  }
  if (config.url === "/recite/submit") {
    if (submitShouldReject) {
      return Promise.reject(new Error("提交失败"));
    }
    return Promise.resolve({
      sessionId: 91,
      results: [
        {
          wordId: 2,
          englishWord: "fragile",
          correctAnswer: "fragile",
          userAnswer: config.data?.answers?.[0]?.userAnswer ?? "",
          isCorrect: false,
        },
        {
          wordId: 5,
          englishWord: "resilient",
          correctAnswer: "resilient",
          userAnswer: config.data?.answers?.[1]?.userAnswer ?? "",
          isCorrect: true,
        },
      ],
      statistics: {
        totalCount: 2,
        correctCount: 1,
        errorCount: 1,
        accuracy: 50,
      },
    });
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
    requestMock.mockClear();
    submitShouldReject = false;
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

  it("uses the desktop shell content area so the sidebar does not cover review content", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/englishWorld/recite"]}>
        <RecitePage />
      </MemoryRouter>,
    );

    expect(container.querySelector(".english-world-main")).toBeInTheDocument();
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

  it("renders wrong results first and starts a repair session from failed word ids", async () => {
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

    const resultItems = await screen.findAllByTestId("recite-result-item");
    expect(resultItems[0]).toHaveTextContent("fragile");
    expect(resultItems[0]).toHaveTextContent("错误");

    await user.click(screen.getByRole("button", { name: /再练错词/ }));

    await waitFor(() => {
      expect(requestMock).toHaveBeenLastCalledWith(
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
