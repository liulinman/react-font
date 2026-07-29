import "antd-mobile/es/global";
import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "@font/api";
import { ExerciseAgentTabMobile } from "./ExerciseAgentTabMobile";

const { subscribeTaskEventsMock } = vi.hoisted(() => ({
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
      articleExerciseId?: number;
    }) => void)
  | undefined;

vi.mock("@font/api", () => ({
  default: vi.fn(),
  getApiBaseUrl: () => "/api",
}));

vi.mock("@/page/englishWorld/server/learning", async () => {
  const actual =
    await vi.importActual<typeof import("@/page/englishWorld/server/learning")>(
      "@/page/englishWorld/server/learning",
    );
  return {
    ...actual,
    subscribeContextLabTaskEvents: (handler: typeof taskEventHandler) =>
      subscribeTaskEventsMock(handler),
  };
});

const requestMock = vi.mocked(request);

describe("ExerciseAgentTabMobile", () => {
  beforeEach(() => {
    taskEventHandler = undefined;
    subscribeTaskEventsMock.mockImplementation((handler) => {
      taskEventHandler = handler;
      return vi.fn();
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    subscribeTaskEventsMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("loads mobile Context Lab history and creates a practice pack", async () => {
    const user = userEvent.setup();
    requestMock.mockImplementation(async (config: { url: string }) => {
      if (config.url === "/context-lab/history") {
        return {
          list: [
            {
              id: 12,
              taskId: 12,
              status: "succeeded",
              sourceType: "custom",
              words: ["urban farming", "supply", "rooftop"],
              articleExerciseId: 88,
              latestScore: 80,
              latestWrongCount: 1,
            },
          ],
          total: 1,
          page: 1,
          pageSize: 20,
        };
      }
      if (config.url === "/context-lab/generate-task") {
        return {
          id: 13,
          taskId: 13,
          status: "pending",
          sourceType: "proficiency",
          words: ["fragile", "steady", "recover"],
        };
      }
      throw new Error(`unexpected request ${config.url}`);
    });

    render(<ExerciseAgentTabMobile />);

    expect(await screen.findByText("移动语境练习")).toBeInTheDocument();
    expect(screen.getByText("urban farming / supply / rooftop")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "生成练习包" }));

    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/context-lab/generate-task",
        data: {
          sourceType: "proficiency",
          proficiencyLevels: [0, 1],
          count: 8,
        },
      }),
    );
    expect(await screen.findByText("fragile / steady / recover")).toBeInTheDocument();
  });

  it("refreshes a pending mobile practice pack from the task event stream", async () => {
    requestMock.mockImplementation(async (config: { url: string }) => {
      if (config.url === "/context-lab/history") {
        return {
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
          pageSize: 20,
        };
      }
      throw new Error(`unexpected request ${config.url}`);
    });

    render(<ExerciseAgentTabMobile />);

    expect(await screen.findByText("等待生成")).toBeInTheDocument();
    expect(subscribeTaskEventsMock).toHaveBeenCalled();

    act(() => {
      taskEventHandler?.({
        id: 12,
        taskId: 12,
        status: "succeeded",
        sourceType: "custom",
        words: ["fragile", "steady", "recover"],
        articleExerciseId: 88,
      });
    });

    expect(await screen.findByText("可练习")).toBeInTheDocument();
    expect(screen.queryByText("等待生成")).not.toBeInTheDocument();
  });

  it("opens a succeeded pack, submits answers, and renders result review", async () => {
    const user = userEvent.setup();
    requestMock.mockImplementation(async (config: { url: string; data?: unknown }) => {
      if (config.url === "/context-lab/history") {
        return {
          list: [
            {
              id: 12,
              taskId: 12,
              status: "succeeded",
              sourceType: "custom",
              words: ["urban farming", "supply", "rooftop"],
              articleExerciseId: 88,
            },
          ],
          total: 1,
          page: 1,
          pageSize: 20,
        };
      }
      if (config.url === "/context-lab/detail") {
        return {
          id: 12,
          taskId: 12,
          status: "succeeded",
          sourceType: "custom",
          words: ["urban farming", "supply", "rooftop"],
          articleExerciseId: 88,
          article:
            "Urban Farming\n\nUrban farming improves local food supply.",
          questions: [
            {
              id: "q1",
              stem: "What is the passage mainly about?",
              options: [
                "Urban farming",
                "Ocean travel",
                "Space flight",
                "Weather",
              ],
            },
          ],
        };
      }
      if (config.url === "/context-lab/submit") {
        return {
          attemptId: 5,
          score: 100,
          correctCount: 1,
          wrongCount: 0,
          weakWords: [],
          nextSuggestions: ["用新词再生成一套练习"],
          results: [
            {
              questionId: "q1",
              correct: true,
              correctIndex: 0,
              userSelectedIndex: 0,
              explanation: "文章主旨围绕 urban farming。",
            },
          ],
        };
      }
      throw new Error(`unexpected request ${config.url}`);
    });

    render(<ExerciseAgentTabMobile />);

    await user.click(await screen.findByRole("button", { name: "开始练习" }));
    expect(
      await screen.findByRole("article", { name: "阅读材料" }),
    ).toBeInTheDocument();

    await user.click(screen.getByLabelText("A. Urban farming"));
    await user.click(screen.getByRole("button", { name: "提交练习" }));

    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/context-lab/submit",
        data: {
          sessionId: 88,
          answers: [{ questionId: "q1", selectedIndex: 0 }],
        },
      }),
    );
    expect(await screen.findByRole("region", { name: "结果复盘" })).toHaveTextContent("100");
    expect(screen.getByText("文章主旨围绕 urban farming。")).toBeInTheDocument();
  });

  it("marks selected reading text, previews AI completion, and imports missing words", async () => {
    const user = userEvent.setup();
    requestMock.mockImplementation(async (config: { url: string }) => {
      if (config.url === "/context-lab/history") {
        return {
          list: [
            {
              id: 12,
              taskId: 12,
              status: "succeeded",
              sourceType: "custom",
              words: ["urban farming", "supply", "rooftop"],
              articleExerciseId: 88,
            },
          ],
          total: 1,
          page: 1,
          pageSize: 20,
        };
      }
      if (config.url === "/context-lab/detail") {
        return {
          id: 12,
          taskId: 12,
          status: "succeeded",
          sourceType: "custom",
          words: ["urban farming", "supply", "rooftop"],
          articleExerciseId: 88,
          article:
            "Urban Farming\n\nUrban farming improves local food supply.",
          questions: [],
        };
      }
      if (config.url === "/word-agent/query") {
        return {
          words: [
            {
              word: "urban farming",
              phonetic: "/ˈɜːbən/",
              meaning: "城市农业",
              partOfSpeech: [1],
              examples: [],
              ieltsCase: null,
            },
          ],
        };
      }
      if (config.url === "/english/importMissingWords") {
        return {
          received: 1,
          normalized: 1,
          inserted: 1,
          skippedExisting: 0,
          skippedDuplicate: 0,
          insertedWords: ["urban farming"],
          skippedWords: [],
        };
      }
      throw new Error(`unexpected request ${config.url}`);
    });

    render(<ExerciseAgentTabMobile />);

    await user.click(await screen.findByRole("button", { name: "开始练习" }));
    const reading = await screen.findByRole("article", { name: "阅读材料" });

    vi.spyOn(window, "getSelection").mockReturnValue({
      toString: () => "urban farming",
      removeAllRanges: vi.fn(),
    } as unknown as Selection);

    fireEvent.contextMenu(
      within(reading).getByText(/Urban farming improves/),
    );
    fireEvent.click(await screen.findByRole("button", { name: "标记生词" }));

    const markedRegion = await screen.findByRole("region", {
      name: "已标记生词",
    });
    expect(within(markedRegion).getByText("urban farming")).toBeInTheDocument();

    await user.click(
      within(markedRegion).getByRole("button", { name: "预览并导入" }),
    );

    const preview = await screen.findByRole("dialog", { name: "导入预览" });
    expect(within(preview).getByDisplayValue("城市农业")).toBeInTheDocument();

    fireEvent.click(within(preview).getByRole("button", { name: "确认导入" }));

    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/english/importMissingWords",
        data: {
          words: [
            expect.objectContaining({
              englishWord: "urban farming",
              englishChinese: "城市农业",
            }),
          ],
        },
      }),
    );
  });

  it("opens attempt history and expands attempt detail", async () => {
    const user = userEvent.setup();
    requestMock.mockImplementation(async (config: { url: string }) => {
      if (config.url === "/context-lab/history") {
        return {
          list: [
            {
              id: 12,
              taskId: 12,
              status: "succeeded",
              sourceType: "custom",
              words: ["urban farming", "supply", "rooftop"],
              articleExerciseId: 88,
              attemptCount: 1,
            },
          ],
          total: 1,
          page: 1,
          pageSize: 20,
        };
      }
      if (config.url === "/context-lab/attempt-history") {
        return {
          list: [
            {
              id: 5,
              attemptId: 5,
              taskId: 12,
              articleExerciseId: 88,
              score: 60,
              correctCount: 3,
              wrongCount: 2,
              weakWords: ["supply"],
              nextSuggestions: ["复盘错题"],
              answers: [],
              results: [],
            },
          ],
          total: 1,
          page: 1,
          pageSize: 20,
        };
      }
      if (config.url === "/context-lab/attempt-detail") {
        return {
          id: 5,
          attemptId: 5,
          taskId: 12,
          articleExerciseId: 88,
          score: 60,
          correctCount: 3,
          wrongCount: 2,
          weakWords: ["supply"],
          nextSuggestions: ["复盘错题"],
          answers: [{ questionId: "q1", selectedIndex: 1 }],
          results: [
            {
              questionId: "q1",
              correct: false,
              correctIndex: 0,
              userSelectedIndex: 1,
              explanation: "错在定位句。",
            },
          ],
        };
      }
      throw new Error(`unexpected request ${config.url}`);
    });

    render(<ExerciseAgentTabMobile />);

    await user.click(await screen.findByRole("button", { name: "记录" }));

    const drawer = await screen.findByRole("dialog", { name: "练习记录" });
    expect(within(drawer).getByText("得分 60")).toBeInTheDocument();

    fireEvent.click(within(drawer).getByRole("button", { name: "查看详情" }));

    expect(await within(drawer).findByText("错在定位句。")).toBeInTheDocument();
  });
});
