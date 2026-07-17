import "@testing-library/jest-dom/vitest";
import type React from "react";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import EnglishWorld from "./EnglishWorld";

const { requestMock, tablePropsMock } = vi.hoisted(() => ({
  requestMock: vi.fn(),
  tablePropsMock: vi.fn(),
}));

vi.mock("antd", async () => {
  const actual = await vi.importActual<typeof import("antd")>("antd");
  return {
    ...actual,
    Table: (props: Record<string, unknown>) => {
      tablePropsMock(props);
      const columns = (props.columns ?? []) as Array<{ title?: unknown }>;
      const locale = props.locale as { emptyText?: React.ReactNode } | undefined;
      return (
        <div data-testid="word-table">
          {columns.map((column, index) =>
            typeof column.title === "string" ? (
              <span key={`${column.title}-${index}`}>{column.title}</span>
            ) : null,
          )}
          {locale?.emptyText}
        </div>
      );
    },
  };
});

vi.mock("@font/api", () => ({
  default: requestMock,
  useMutation: () => ({
    mutateAsync: vi.fn(() => Promise.resolve(false)),
    isPending: false,
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { username: "tester" },
    logout: vi.fn(),
  }),
}));

vi.mock("./cockpit/LearningCockpitPage", () => ({
  LearningCockpitPage: () => <div>Mock Cockpit</div>,
}));

vi.mock("./component/EnglishStats", () => ({
  EnglishStats: () => <div>Mock Stats</div>,
}));

vi.mock("./component/WordAgentTab", () => ({
  WordAgentTab: () => <div>Mock AI Word Query</div>,
}));

vi.mock("./contextLab/ContextLabPage", () => ({
  ContextLabPage: () => <div>Mock Context Lab</div>,
}));

vi.mock("./memoryMap/MemoryMapPage", () => ({
  MemoryMapPage: () => <div>Mock Memory Map</div>,
}));

describe("EnglishWorld ToC routing", () => {
  beforeEach(() => {
    requestMock.mockReset();
    requestMock.mockResolvedValue({
      list: [],
      total: 0,
      totalPages: 0,
    });
    tablePropsMock.mockClear();
  });

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
  });

  it("renders the word library when pathname is /englishWorld/words", () => {
    render(
      <MemoryRouter initialEntries={["/englishWorld/words"]}>
        <EnglishWorld />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "词库" })).toBeInTheDocument();
    expect(screen.getByText("全部词条")).toBeInTheDocument();
    expect(
      screen.queryByText("保留筛选字段、表格列和添加/编辑单词字段"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "AI 查词" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "记忆地图" })).toBeInTheDocument();
    expect(screen.getByText("时间范围")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "中文" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "英文" })).toBeInTheDocument();
    expect(screen.getAllByText("音标").length).toBeGreaterThan(0);
    expect(screen.getAllByText("类型").length).toBeGreaterThan(0);
    expect(screen.getAllByText("掌握程度").length).toBeGreaterThan(0);
    expect(screen.queryByText("Mock Cockpit")).not.toBeInTheDocument();
  });

  it("uses the shared collapsible shell without hiding the word library", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MemoryRouter initialEntries={["/englishWorld/words"]}>
        <EnglishWorld />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "收起侧栏" }));

    expect(container.querySelector(".english-world-shell-collapsed")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "词库" })).toBeInTheDocument();
  });

  it("shows a useful Chinese empty state for a new word library", () => {
    render(
      <MemoryRouter initialEntries={["/englishWorld/words"]}>
        <EnglishWorld />
      </MemoryRouter>,
    );

    expect(screen.getByText("词库还是空的")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "添加第一个单词" })).toBeInTheDocument();
  });

  it("renders the word filters as a compact management toolbar", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/englishWorld/words"]}>
        <EnglishWorld />
      </MemoryRouter>,
    );

    const filterPanel = screen.getByLabelText("词库筛选");
    const filterForm = container.querySelector(".english-world-filter-form");

    expect(filterPanel).toHaveClass("english-world-filter-panel");
    expect(filterForm).toHaveClass("english-world-filter-form-compact");
    expect(
      container.querySelector(".english-world-filter-grid"),
    ).toBeInTheDocument();
    expect(
      container.querySelector(".english-world-filter-actions"),
    ).toBeInTheDocument();
  });

  it("uses virtual table rendering for large page sizes", () => {
    render(
      <MemoryRouter initialEntries={["/englishWorld/words"]}>
        <EnglishWorld />
      </MemoryRouter>,
    );

    const tableProps = tablePropsMock.mock.calls.at(-1)?.[0] as {
      virtual?: boolean;
      scroll?: { x?: number; y?: number | string };
      pagination?: { pageSizeOptions?: string[] };
    };

    expect(tableProps.virtual).toBe(true);
    expect(tableProps.scroll).toEqual(
      expect.objectContaining({ x: 1360, y: expect.any(Number) }),
    );
    expect(tableProps.pagination?.pageSizeOptions).toContain("500");
  });

  it("renders context lab references as readable source buttons in the table", () => {
    render(
      <MemoryRouter initialEntries={["/englishWorld/words"]}>
        <EnglishWorld />
      </MemoryRouter>,
    );

    const tableProps = tablePropsMock.mock.calls.at(-1)?.[0] as {
      columns?: Array<{
        title?: string;
        dataIndex?: string;
        render?: (value: string) => React.ReactNode;
      }>;
    };
    const referenceColumn = tableProps.columns?.find(
      (column) => column.dataIndex === "englishReference",
    );

    expect(referenceColumn).toBeDefined();
    render(
      <MemoryRouter>
        {referenceColumn?.render?.(
          "/englishWorld/context-lab?taskId=12&word=urban+farming",
        )}
      </MemoryRouter>,
    );

    const referenceButton = screen.getByRole("button", {
      name: "来自阅读 · 练习包 #12",
    });
    expect(referenceButton).toHaveClass("word-reference-link-internal");
  });

  it("opens a context lab reference in the word library instead of routing immediately", async () => {
    const user = userEvent.setup();
    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/detail") {
        return Promise.resolve({
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
        });
      }
      return Promise.resolve({ list: [], total: 0, totalPages: 0 });
    });

    const { container } = render(
      <MemoryRouter initialEntries={["/englishWorld/words"]}>
        <EnglishWorld />
      </MemoryRouter>,
    );

    const tableProps = tablePropsMock.mock.calls.at(-1)?.[0] as {
      columns?: Array<{
        dataIndex?: string;
        render?: (
          value: string,
          record?: Record<string, unknown>,
        ) => React.ReactNode;
      }>;
    };
    const referenceColumn = tableProps.columns?.find(
      (column) => column.dataIndex === "englishReference",
    );

    render(
      <MemoryRouter>
        {referenceColumn?.render?.(
          "/englishWorld/context-lab?taskId=12&word=urban+farming",
        )}
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole("button", { name: "来自阅读 · 练习包 #12" }),
    );

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/context-lab/detail",
          method: "POST",
          data: { taskId: 12 },
        }),
      );
    });
    expect(screen.getByText("全部词条")).toBeInTheDocument();
    const dialog = await screen.findByRole("dialog", {
      name: /单词来源文章/,
    });
    expect(dialog).toBeInTheDocument();
    expect(container).not.toHaveTextContent("Mock Context Lab");
    expect(
      within(dialog).getByRole("button", { name: "占满屏幕" }),
    ).toBeInTheDocument();
  });

  it("shows a stale reference state when the source task has been deleted", async () => {
    const user = userEvent.setup();
    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/detail") {
        return Promise.reject({
          code: 404,
          message: "生成任务不存在或无权限",
        });
      }
      return Promise.resolve({ list: [], total: 0, totalPages: 0 });
    });

    render(
      <MemoryRouter initialEntries={["/englishWorld/words"]}>
        <EnglishWorld />
      </MemoryRouter>,
    );

    const tableProps = tablePropsMock.mock.calls.at(-1)?.[0] as {
      columns?: Array<{
        dataIndex?: string;
        render?: (
          value: string,
          record?: Record<string, unknown>,
        ) => React.ReactNode;
      }>;
    };
    const referenceColumn = tableProps.columns?.find(
      (column) => column.dataIndex === "englishReference",
    );

    render(
      <MemoryRouter>
        {referenceColumn?.render?.(
          "/englishWorld/context-lab?taskId=16&word=undergone",
          {
            id: 1,
            englishWord: "undergone",
            englishReference:
              "/englishWorld/context-lab?taskId=16&word=undergone",
          },
        )}
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole("button", { name: "来自阅读 · 练习包 #16" }),
    );

    const dialog = await screen.findByRole("dialog", {
      name: /单词来源文章/,
    });
    expect(within(dialog).getByText(/来源引用已失效/)).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("button", { name: "开始练习" }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "编辑词条" }),
    ).toBeInTheDocument();
  });

  it("switches the word library between list and card views", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/englishWorld/words"]}>
        <EnglishWorld />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("词库列表视图")).toBeInTheDocument();
    expect(screen.queryByLabelText("词库卡片视图")).not.toBeInTheDocument();

    await user.click(screen.getByText("卡片"));

    expect(screen.queryByLabelText("词库列表视图")).not.toBeInTheDocument();
    expect(screen.getByLabelText("词库卡片视图")).toBeInTheDocument();
  });

  it("only renders an image area in card view when a word has an image", async () => {
    const user = userEvent.setup();
    requestMock.mockResolvedValue({
      list: [
        {
          id: 1,
          englishWord: "memorable",
          englishPhonetic: "/ˈmem.ər.ə.bəl/",
          englishChinese: "难忘的、值得纪念的",
          englishType: 0,
          englishLevel: 0,
          englishPartSpeech: [3],
        },
      ],
      total: 1,
      totalPages: 1,
    });
    const { container } = render(
      <MemoryRouter initialEntries={["/englishWorld/words"]}>
        <EnglishWorld />
      </MemoryRouter>,
    );

    await user.click(screen.getByText("卡片"));
    await screen.findByText("memorable");

    expect(screen.getByLabelText("词库卡片视图")).toBeInTheDocument();
    expect(container.querySelector(".word-card-image-placeholder")).toBeNull();
  });

  it("updates one card mastery level without opening the edit modal", async () => {
    const user = userEvent.setup();
    let persistedLevel = 1;
    requestMock.mockImplementation((config: {
      url?: string;
      data?: { englishLevel?: number };
    }) => {
      if (config.url === "/english/updateEnglishWordLevel") {
        persistedLevel = config.data?.englishLevel ?? persistedLevel;
        return Promise.resolve(true);
      }
      return Promise.resolve({
        list: [
          {
            id: 21,
            englishWord: "humor",
            englishChinese: "幽默",
            englishType: 0,
            englishLevel: persistedLevel,
            englishPartSpeech: [1],
          },
        ],
        total: 1,
        totalPages: 1,
      });
    });

    render(
      <MemoryRouter initialEntries={["/englishWorld/words"]}>
        <EnglishWorld />
      </MemoryRouter>,
    );

    await user.click(screen.getByText("卡片"));
    await screen.findByText("humor");
    await user.click(
      screen.getByRole("button", {
        name: "修改 humor 的掌握程度，当前一般",
      }),
    );
    await user.click(await screen.findByRole("menuitem", { name: /熟练/ }));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith({
        url: "/english/updateEnglishWordLevel",
        method: "POST",
        data: { id: 21, englishLevel: 2 },
        config: { suppressErrorMessage: true },
      });
    });
    await waitFor(() => {
      const listCalls = requestMock.mock.calls.filter(
        ([config]) => config.url === "/english/filterWordList",
      );
      expect(listCalls).toHaveLength(2);
    });
    expect(
      screen.getByRole("button", {
        name: "修改 humor 的掌握程度，当前熟练",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("selects the current card page and updates mastery in one batch", async () => {
    const user = userEvent.setup();
    requestMock.mockImplementation((config: { url?: string }) => {
      if (config.url === "/english/updateEnglishWordLevel") {
        return Promise.resolve(true);
      }
      return Promise.resolve({
        list: [
          {
            id: 21,
            englishWord: "humor",
            englishType: 0,
            englishLevel: 1,
          },
          {
            id: 22,
            englishWord: "march",
            englishType: 0,
            englishLevel: 0,
          },
        ],
        total: 2,
        totalPages: 1,
      });
    });

    render(
      <MemoryRouter initialEntries={["/englishWorld/words"]}>
        <EnglishWorld />
      </MemoryRouter>,
    );

    await user.click(screen.getByText("卡片"));
    await screen.findByText("humor");
    await user.click(screen.getByRole("button", { name: "批量管理" }));
    await user.click(screen.getByRole("button", { name: "全选当前页" }));

    expect(screen.getByText("已选 2 项")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "批量设为精通" }));

    await waitFor(() => {
      const levelCalls = requestMock.mock.calls.filter(
        ([config]) => config.url === "/english/updateEnglishWordLevel",
      );
      expect(levelCalls).toHaveLength(2);
      expect(levelCalls.map(([config]) => config.data)).toEqual(
        expect.arrayContaining([
          { id: 21, englishLevel: 3 },
          { id: 22, englishLevel: 3 },
        ]),
      );
    });
    await waitFor(() => {
      const listCalls = requestMock.mock.calls.filter(
        ([config]) => config.url === "/english/filterWordList",
      );
      expect(listCalls).toHaveLength(2);
    });
  });

  it("rolls back a failed card mastery update", async () => {
    const user = userEvent.setup();
    requestMock.mockImplementation((config: { url?: string }) => {
      if (config.url === "/english/updateEnglishWordLevel") {
        return Promise.resolve(false);
      }
      return Promise.resolve({
        list: [
          {
            id: 21,
            englishWord: "humor",
            englishType: 0,
            englishLevel: 1,
          },
        ],
        total: 1,
        totalPages: 1,
      });
    });

    render(
      <MemoryRouter initialEntries={["/englishWorld/words"]}>
        <EnglishWorld />
      </MemoryRouter>,
    );

    await user.click(screen.getByText("卡片"));
    await screen.findByText("humor");
    await user.click(
      screen.getByRole("button", {
        name: "修改 humor 的掌握程度，当前一般",
      }),
    );
    await user.click(await screen.findByRole("menuitem", { name: /熟练/ }));

    expect(
      await screen.findByRole("button", {
        name: "修改 humor 的掌握程度，当前一般",
      }),
    ).toBeInTheDocument();
  });

  it("clears card selection when leaving card view", async () => {
    const user = userEvent.setup();
    requestMock.mockResolvedValue({
      list: [
        {
          id: 21,
          englishWord: "humor",
          englishType: 0,
          englishLevel: 1,
        },
      ],
      total: 1,
      totalPages: 1,
    });

    render(
      <MemoryRouter initialEntries={["/englishWorld/words"]}>
        <EnglishWorld />
      </MemoryRouter>,
    );

    await user.click(screen.getByText("卡片"));
    await screen.findByText("humor");
    await user.click(screen.getByRole("button", { name: "批量管理" }));
    await user.click(screen.getByRole("button", { name: "全选当前页" }));
    expect(screen.getByText("已选 1 项")).toBeInTheDocument();

    await user.click(screen.getByText("列表"));
    await user.click(screen.getByText("卡片"));
    await user.click(screen.getByRole("button", { name: "批量管理" }));

    expect(screen.getByText("已选 0 项")).toBeInTheDocument();
  });

  it("renders stats when pathname is /englishWorld/stats", () => {
    render(
      <MemoryRouter initialEntries={["/englishWorld/stats"]}>
        <EnglishWorld />
      </MemoryRouter>,
    );

    expect(screen.getByText("Mock Stats")).toBeInTheDocument();
    expect(screen.queryByText("Mock Cockpit")).not.toBeInTheDocument();
  });

  it("renders AI word query when pathname is /englishWorld/ai-word", () => {
    render(
      <MemoryRouter initialEntries={["/englishWorld/ai-word"]}>
        <EnglishWorld />
      </MemoryRouter>,
    );

    expect(screen.getByText("Mock AI Word Query")).toBeInTheDocument();
    expect(screen.queryByText("Mock Cockpit")).not.toBeInTheDocument();
  });

  it("keeps legacy hash entries usable for list and stats", () => {
    render(
      <MemoryRouter initialEntries={["/englishWorld#list"]}>
        <EnglishWorld />
      </MemoryRouter>,
    );

    expect(screen.getByText("全部词条")).toBeInTheDocument();

    cleanup();

    render(
      <MemoryRouter initialEntries={["/englishWorld#stat"]}>
        <EnglishWorld />
      </MemoryRouter>,
    );

    expect(screen.getByText("Mock Stats")).toBeInTheDocument();
  });
});
