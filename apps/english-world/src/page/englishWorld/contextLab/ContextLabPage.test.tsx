import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ContextLabPage, formatElapsedSeconds } from "./ContextLabPage";
import { buildContextLabGenerateParams } from "./contextLabPlanning";

const { requestMock, downloadMock, downloadTaskMock } = vi.hoisted(() => ({
  requestMock: vi.fn(),
  downloadMock: vi.fn(),
  downloadTaskMock: vi.fn(),
}));

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
  };
});

describe("ContextLabPage", () => {
  beforeEach(() => {
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
    requestMock.mockReset();
    downloadMock.mockReset();
    downloadTaskMock.mockReset();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("lets the user choose weak words, random words, or custom words", () => {
    render(<ContextLabPage />);

    expect(screen.getByText("今日薄弱词")).toBeInTheDocument();
    expect(screen.getByText("随机词")).toBeInTheDocument();
    expect(screen.getByText("手输词")).toBeInTheDocument();
  });

  it("prefills cockpit custom words from a router query", async () => {
    requestMock.mockResolvedValue({ list: [], total: 0, page: 1, pageSize: 10 });

    render(
      <MemoryRouter
        initialEntries={[
          "/englishWorld/context-lab?source=cockpit&words=fragile,resilient,steady",
        ]}
      >
        <ContextLabPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByDisplayValue("fragile, resilient, steady"),
    ).toBeInTheDocument();
  });

  it("shows the weak source count instead of fake preview words", () => {
    requestMock.mockResolvedValue({ list: [], total: 0, page: 1, pageSize: 10 });

    render(<ContextLabPage />);

    expect(screen.getByText("生成数量")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton")).toHaveValue("8");
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
      }),
    ).toEqual({
      sourceType: "proficiency",
      proficiencyLevels: [0, 1],
      count: 8,
    });
  });

  it("splits custom words by spaces and commas", () => {
    expect(
      buildContextLabGenerateParams({
        sourceMode: "custom",
        count: 8,
        customWords: "resilient, recover，fragile steady",
      }),
    ).toEqual({
      sourceType: "custom",
      words: ["resilient", "recover", "fragile", "steady"],
    });
  });

  it("formats elapsed answering time", () => {
    expect(formatElapsedSeconds(0)).toBe("00:00");
    expect(formatElapsedSeconds(65)).toBe("01:05");
  });

  it("creates an async generation task and refreshes history", async () => {
    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/history") {
        return Promise.resolve({ list: [], total: 0, page: 1, pageSize: 10 });
      }
      if (config.url === "/context-lab/generate-task") {
        return Promise.resolve({
          id: 12,
          taskId: 12,
          status: "pending",
          sourceType: "proficiency",
          words: ["fragile", "steady", "recover"],
        });
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
          count: 8,
        },
        __responseType: undefined,
      });
    });
    expect((await screen.findAllByText("等待回调")).length).toBeGreaterThan(0);
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
          errorMessage: "AI 返回格式异常",
        },
      ],
      total: 2,
      page: 1,
      pageSize: 10,
    });

    render(<ContextLabPage />);

    expect(await screen.findByText("生成完成")).toBeInTheDocument();
    expect(screen.getByText("生成失败")).toBeInTheDocument();
    expect(screen.getByText("AI 返回格式异常")).toBeInTheDocument();
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
              explanation: "解析：正确答案为0，fragile 表示容易损坏，和文章语境一致。",
            },
          ],
        });
      }
      return Promise.resolve({});
    });

    render(<ContextLabPage />);

    await userEvent.click(await screen.findByRole("button", { name: "开始练习" }));
    expect(screen.getByRole("dialog", { name: /AI 语境练习/ })).toBeInTheDocument();
    expect(screen.getByText("A. Easy to break")).toBeInTheDocument();
    expect(screen.getByText("B. Very fast")).toBeInTheDocument();
    await userEvent.click(screen.getByText("A. Easy to break"));
    await userEvent.click(screen.getByRole("button", { name: "提交练习" }));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith({
        url: "/context-lab/submit",
        method: "POST",
        data: {
          sessionId: 88,
          answers: [{ questionId: "q1", selectedIndex: 0 }],
        },
        __responseType: undefined,
      });
    });
    expect(
      await screen.findByText("解析：正确答案为 A，fragile 表示容易损坏，和文章语境一致。"),
    ).toBeInTheDocument();
  });

  it("shows a result review with weak-word next actions after submitting answers", async () => {
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
    expect(screen.getByRole("dialog", { name: /AI 语境练习/ })).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "下载本次练习 PDF" }),
    );

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
    expect(screen.getByRole("dialog", { name: /AI 语境练习/ })).toBeInTheDocument();
    expect(screen.getByText("雅思阅读")).toBeInTheDocument();
    expect(screen.queryByText("短阅读")).not.toBeInTheDocument();

    expect(screen.getByText("First paragraph.")).toHaveClass(
      "context-lab-article-paragraph",
    );
    expect(screen.getByText("Second paragraph.")).toHaveClass(
      "context-lab-article-paragraph",
    );
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
    expect(screen.getByRole("dialog", { name: /AI 语境练习/ })).toBeInTheDocument();

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
    const practiceDialog = screen.getByRole("dialog", { name: /AI 语境练习/ });

    expect(practiceDialog).toHaveClass("context-lab-practice-modal");
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

  it("lets the user expand the practice window to fill the screen", async () => {
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

    render(<ContextLabPage />);

    await userEvent.click(await screen.findByRole("button", { name: "开始练习" }));
    const practiceDialog = screen.getByRole("dialog", { name: /AI 语境练习/ });

    await userEvent.click(screen.getByRole("button", { name: "占满屏幕" }));

    expect(practiceDialog).toHaveClass(
      "context-lab-practice-modal-fullscreen",
    );
    expect(
      screen.getByRole("button", { name: "退出满屏" }),
    ).toBeInTheDocument();
  });

  it("keeps the full practice workspace out of the main task card", async () => {
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
    expect(screen.getByRole("dialog", { name: /AI 语境练习/ })).toBeInTheDocument();
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
    expect(screen.getByRole("dialog", { name: /AI 语境练习/ })).toBeInTheDocument();
    await userEvent.click(screen.getByText("A. able to recover"));
    await userEvent.click(screen.getByRole("button", { name: "提交练习" }));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith({
        url: "/context-lab/submit",
        method: "POST",
        data: {
          sessionId: 12,
          answers: [{ questionId: "q1", selectedIndex: 0 }],
        },
        __responseType: undefined,
      });
    });
  });

  it("adds selected article text to the word library through AI completion", async () => {
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
      if (config.url === "/english/existEnglishWord") {
        return Promise.resolve(false);
      }
      if (config.url === "/english/AddEnglishWord") {
        return Promise.resolve({ success: true });
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
      toString: () => "urban farming",
      rangeCount: 1,
      removeAllRanges: vi.fn(),
    };
    vi.spyOn(window, "getSelection").mockReturnValue(
      selection as unknown as Selection,
    );

    await user.pointer({ target: paragraph, keys: "[MouseRight]" });
    await user.click(await screen.findByText("一键添加到词库"));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith({
        url: "/word-agent/query",
        method: "POST",
        data: { word: "urban farming" },
        __responseType: undefined,
      });
    });
    expect(await screen.findByText("添加单词")).toBeInTheDocument();
    expect(screen.getByLabelText("单词名")).toHaveValue("urban farming");
    expect(screen.getByLabelText("音标")).toHaveValue("/ˈɜːbən ˈfɑːmɪŋ/");
    expect(screen.getByLabelText("中文")).toHaveValue("城市农业；都市农耕");

    await user.click(screen.getByRole("button", { name: /确\s*认/ }));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith({
        url: "/english/AddEnglishWord",
        method: "POST",
        data: expect.objectContaining({
          englishWord: "urban farming",
          englishPhonetic: "/ˈɜːbən ˈfɑːmɪŋ/",
          englishChinese: "城市农业；都市农耕",
          englishPartSpeech: [2],
          englishLevel: 0,
          englishType: 1,
        }),
      });
    });
  });

  it("keeps the add modal open and does not save when the selected word already exists", async () => {
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
      if (config.url === "/english/existEnglishWord") {
        return Promise.resolve(true);
      }
      if (config.url === "/english/AddEnglishWord") {
        throw new Error("wordAdd should not be called for duplicate words");
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
      toString: () => "  “urban farming,” ",
      rangeCount: 1,
      removeAllRanges: vi.fn(),
    } as unknown as Selection);

    await user.pointer({ target: paragraph, keys: "[MouseRight]" });
    await user.click(await screen.findByText("一键添加到词库"));
    expect(await screen.findByText("添加单词")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /确\s*认/ }));

    expect(screen.getByLabelText("单词名")).toHaveValue("urban farming");
    expect(requestMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ url: "/english/AddEnglishWord" }),
    );
  });

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
});
