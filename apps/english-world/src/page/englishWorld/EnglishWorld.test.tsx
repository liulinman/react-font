import "@testing-library/jest-dom/vitest";
import type React from "react";
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
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { message } from "antd";
import type { WordList } from "@/server/word/word.type";
import EnglishWorld from "./EnglishWorld";

const { requestMock, tablePropsMock } = vi.hoisted(() => ({
  requestMock: vi.fn(),
  tablePropsMock: vi.fn(),
}));

function LocationProbe() {
  const location = useLocation();
  return (
    <div data-testid="location">{`${location.pathname}${location.search}`}</div>
  );
}

function LeaveWordLibraryButton() {
  const navigate = useNavigate();
  return <button onClick={() => navigate("/englishWorld/stats")}>离开词库</button>;
}

function makeWordList(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    englishWord: `word-${index + 1}`,
    englishType: 0,
    englishLevel: index % 4,
  }));
}

vi.mock("antd", async () => {
  const actual = await vi.importActual<typeof import("antd")>("antd");
  return {
    ...actual,
    Table: (props: Record<string, unknown>) => {
      tablePropsMock(props);
      const columns = (props.columns ?? []) as Array<{ title?: unknown }>;
      const dataSource = (props.dataSource ?? []) as WordList[];
      const rowSelection = props.rowSelection as
        | {
            selectedRowKeys?: React.Key[];
            onChange?: (keys: React.Key[]) => void;
          }
        | undefined;
      const locale = props.locale as { emptyText?: React.ReactNode } | undefined;
      return (
        <div data-testid="word-table">
          {columns.map((column, index) =>
            typeof column.title === "string" ? (
              <span key={`${column.title}-${index}`}>{column.title}</span>
            ) : null,
          )}
          {dataSource.map((word) => (
            <label key={word.id}>
              <input
                aria-label={`选择 ${word.englishWord}`}
                type="checkbox"
                checked={rowSelection?.selectedRowKeys?.includes(word.id) ?? false}
                onChange={(event) =>
                  rowSelection?.onChange?.(
                    event.target.checked
                      ? [...(rowSelection.selectedRowKeys ?? []), word.id]
                      : (rowSelection.selectedRowKeys ?? []).filter((id) => id !== word.id),
                  )
                }
              />
              {word.englishWord}
            </label>
          ))}
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
    expect(screen.queryByText("词汇资产")).not.toBeInTheDocument();
    expect(
      screen.queryByText("集中管理释义、音标、掌握程度和学习来源。"),
    ).not.toBeInTheDocument();
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

  it("opens mixed-memory setup only from an explicit word selection", async () => {
    const user = userEvent.setup();
    requestMock.mockImplementation(async (descriptor: { url: string; data?: unknown }) => {
      if (descriptor.url === "/english/filterWordList") {
        return { list: makeWordList(2), total: 2, totalPages: 1 };
      }
      if (descriptor.url === "/learning-session/capabilities") {
        return { modes: [{ mode: "listening", status: "enabled" }] };
      }
      if (descriptor.url === "/learning-session/preview") {
        const wordIds = (descriptor.data as { wordIds: number[] }).wordIds;
        return {
          wordCount: wordIds.length,
          estimatedSeconds: 35,
          modeCapabilities: [{ mode: "listening", status: "enabled" }],
          words: wordIds.map((wordId, sourceOrder) => ({
            wordId,
            sourceOrder,
            primaryMode: "listening",
            eligibleModes: ["listening"],
            audioEligibility: "eligible",
            adaptationStatus: "adapted",
          })),
          blocks: [],
        };
      }
      throw new Error(`unexpected request: ${descriptor.url}`);
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/englishWorld/words"]}>
          <EnglishWorld />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const startButton = await screen.findByRole("button", { name: "开始记忆" });
    expect(startButton).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: "选择 word-1" }));
    expect(startButton).toBeEnabled();
    await user.click(startButton);

    expect(screen.getByRole("dialog", { name: "开始混合记忆" })).toBeVisible();
    expect(screen.getByText("本次 1 个词")).toBeInTheDocument();
    const previewCall = await waitFor(() => {
      const call = requestMock.mock.calls.find(
        ([descriptor]) => descriptor.url === "/learning-session/preview",
      );
      expect(call).toBeDefined();
      return call;
    });
    expect(previewCall?.[0].data.wordIds).toEqual([1]);
  });

  it("blocks more than twenty selected words before setup or preview", async () => {
    requestMock.mockResolvedValue({
      list: makeWordList(21),
      total: 21,
      totalPages: 1,
    });
    render(
      <MemoryRouter initialEntries={["/englishWorld/words"]}>
        <EnglishWorld />
      </MemoryRouter>,
    );
    await screen.findByRole("checkbox", { name: "选择 word-21" });
    const tableProps = tablePropsMock.mock.calls.at(-1)?.[0] as {
      rowSelection?: { onChange?: (keys: React.Key[]) => void };
    };

    act(() => {
      tableProps.rowSelection?.onChange?.(
        Array.from({ length: 21 }, (_, index) => index + 1),
      );
    });

    expect(screen.getByRole("alert")).toHaveTextContent("一次最多 20 个单词");
    expect(screen.getByRole("button", { name: "开始记忆" })).toBeDisabled();
    expect(screen.queryByRole("dialog", { name: "开始混合记忆" })).not.toBeInTheDocument();
    expect(
      requestMock.mock.calls.some(
        ([descriptor]) => descriptor.url === "/learning-session/preview",
      ),
    ).toBe(false);
    expect(
      requestMock.mock.calls.some(
        ([descriptor]) => descriptor.url === "/learning-session/create",
      ),
    ).toBe(false);
  });

  it("fills and automatically searches the word from the URL", async () => {
    render(
      <MemoryRouter
        initialEntries={[
          "/englishWorld/words?englishWord=urban+farming",
        ]}
      >
        <EnglishWorld />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("textbox", { name: "英文" })).toHaveValue(
      "urban farming",
    );

    await waitFor(() => {
      const filterCalls = requestMock.mock.calls.filter(
        ([config]) => config.url === "/english/filterWordList",
      );
      expect(filterCalls.at(-1)?.[0]).toEqual({
        url: "/english/filterWordList",
        method: "POST",
        data: {
          englishWord: "urban farming",
          page: 1,
          pageSize: 10,
        },
      });
    });

    expect(screen.getByRole("textbox", { name: "中文" })).toHaveValue("");
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

  it("exposes notes through expandable table rows beside the word", async () => {
    const user = userEvent.setup();
    const record: WordList = {
      id: 7,
      englishWord: "preserve",
      englishPhonetic: "/prɪˈzɜːv/",
      englishChinese: "保护；保存",
      englishType: 0,
      englishLevel: 1,
      englishNote: "first line\nsecond line",
    };

    render(
      <MemoryRouter initialEntries={["/englishWorld/words"]}>
        <EnglishWorld />
      </MemoryRouter>,
    );

    const tableProps = tablePropsMock.mock.calls.at(-1)?.[0] as {
      columns?: Array<{ dataIndex?: string }>;
      expandable?: {
        expandRowByClick?: boolean;
        rowExpandable?: (word: WordList) => boolean;
        expandedRowRender?: (word: WordList) => React.ReactNode;
        expandIcon?: (props: {
          expanded: boolean;
          onExpand: (word: WordList, event: React.MouseEvent) => void;
          record: WordList;
        }) => React.ReactNode;
      };
    };

    expect(
      tableProps.columns?.some(
        (column) => column.dataIndex === "englishNote",
      ),
    ).toBe(false);
    expect(tableProps.expandable?.expandRowByClick).toBe(false);
    expect(tableProps.expandable?.rowExpandable?.(record)).toBe(true);
    expect(
      tableProps.expandable?.rowExpandable?.({
        ...record,
        englishNote: "  \n ",
      }),
    ).toBe(false);

    render(<>{tableProps.expandable?.expandedRowRender?.(record)}</>);
    expect(screen.getByText("first line second line")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "编辑 preserve 的笔记" }),
    );
    expect(
      await screen.findByRole("dialog", { name: "编辑单词" }),
    ).toBeInTheDocument();

    const onExpand = vi.fn();
    render(
      <>{
        tableProps.expandable?.expandIcon?.({
          expanded: false,
          onExpand,
          record,
        })
      }</>,
    );
    await user.click(
      screen.getByRole("button", { name: "展开 preserve 的笔记" }),
    );
    expect(onExpand).toHaveBeenCalledWith(record, expect.anything());
  });

  it("marks note-bearing words next to the word instead of in a remote column", () => {
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
          record: WordList,
          index: number,
        ) => React.ReactNode;
      }>;
    };
    const wordColumn = tableProps.columns?.find(
      (column) => column.dataIndex === "englishWord",
    );
    const record: WordList = {
      id: 8,
      englishWord: "insect",
      englishType: 0,
      englishLevel: 0,
      englishNote: "原始词形：insects",
    };

    const noteWord = render(
      <MemoryRouter>{wordColumn?.render?.("insect", record, 0)}</MemoryRouter>,
    );
    expect(screen.getByText("有笔记")).toHaveClass("word-note-indicator");
    noteWord.unmount();

    render(
      <MemoryRouter>
        {wordColumn?.render?.(
          "insect",
          { ...record, englishNote: "  \n " },
          0,
        )}
      </MemoryRouter>,
    );
    expect(screen.queryByText("有笔记")).not.toBeInTheDocument();
  });

  it("renders note text directly inside card view", async () => {
    const user = userEvent.setup();
    requestMock.mockResolvedValue({
      list: [
        {
          id: 9,
          englishWord: "preserve",
          englishPhonetic: "/prɪˈzɜːv/",
          englishChinese: "保护；保存",
          englishType: 0,
          englishLevel: 1,
          englishPartSpeech: [1],
          englishNote: "常见搭配 preserve food / preserve evidence",
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

    expect(await screen.findByText("我的笔记")).toBeInTheDocument();
    expect(
      screen.getByText("常见搭配 preserve food / preserve evidence"),
    ).toBeInTheDocument();
    expect(screen.queryByText("有笔记")).not.toBeInTheDocument();
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

  it("translates the source article and reuses the cached result when toggled", async () => {
    const user = userEvent.setup();
    const article =
      "Urban Farming\n\nUrban farming improves local food supply.\n\nIt also strengthens communities.\n\nLong-term planning remains essential.";
    requestMock.mockImplementation((config) => {
      if (config.url === "/context-lab/detail") {
        return Promise.resolve({
          id: 12,
          taskId: 12,
          status: "succeeded",
          sourceType: "custom",
          words: ["urban farming"],
          article,
          questions: [],
        });
      }
      if (config.url === "/context-lab/translate-article") {
        return Promise.resolve({
          translations: [
            "城市农业",
            "城市农业改善了当地的食品供应。",
            "它也增强了社区凝聚力。",
            "长期规划仍然至关重要。",
          ],
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
        render?: (value: string) => React.ReactNode;
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
    const dialog = await screen.findByRole("dialog", {
      name: /单词来源文章/,
    });
    await user.click(
      within(dialog).getByRole("button", { name: "翻译全文" }),
    );
    expect(
      await within(dialog).findByText("城市农业改善了当地的食品供应。"),
    ).toBeInTheDocument();
    expect(
      requestMock.mock.calls.filter(
        ([config]) => config.url === "/context-lab/translate-article",
      ),
    ).toHaveLength(1);
    await user.click(within(dialog).getByRole("button", { name: "隐藏译文" }));
    expect(
      within(dialog).queryByText("城市农业改善了当地的食品供应。"),
    ).not.toBeInTheDocument();
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
    expect(
      window.localStorage.getItem("english-world:word-library-view"),
    ).toBe("card");
  });

  it("restores the saved card view when the word library opens", () => {
    window.localStorage.setItem("english-world:word-library-view", "card");

    render(
      <MemoryRouter initialEntries={["/englishWorld/words"]}>
        <EnglishWorld />
      </MemoryRouter>,
    );

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

  it("requires at least three cards before opening batch context generation", async () => {
    const user = userEvent.setup();
    requestMock.mockResolvedValue({
      list: makeWordList(2),
      total: 2,
      totalPages: 1,
    });

    render(
      <MemoryRouter initialEntries={["/englishWorld/words"]}>
        <EnglishWorld />
      </MemoryRouter>,
    );

    await user.click(screen.getByText("卡片"));
    await screen.findByText("word-1");
    await user.click(screen.getByRole("button", { name: "批量管理" }));
    await user.click(screen.getByRole("button", { name: "全选当前页" }));

    expect(
      screen.getByRole("button", { name: "生成语境题" }),
    ).toBeDisabled();
    expect(screen.queryByRole("dialog", { name: "生成语境练习" })).toBeNull();
  });

  it("rejects more than twenty selected cards without opening the modal", async () => {
    const user = userEvent.setup();
    const warningSpy = vi
      .spyOn(message, "warning")
      .mockImplementation(() => undefined as never);
    requestMock.mockResolvedValue({
      list: makeWordList(21),
      total: 21,
      totalPages: 1,
    });

    render(
      <MemoryRouter initialEntries={["/englishWorld/words"]}>
        <EnglishWorld />
      </MemoryRouter>,
    );

    await user.click(screen.getByText("卡片"));
    await screen.findByText("word-1");
    await user.click(screen.getByRole("button", { name: "批量管理" }));
    await user.click(screen.getByRole("button", { name: "全选当前页" }));
    await user.click(screen.getByRole("button", { name: "生成语境题" }));

    expect(warningSpy).toHaveBeenCalledWith(
      "每次最多选择 20 个词，请减少选择",
    );
    expect(screen.queryByRole("dialog", { name: "生成语境练习" })).toBeNull();
    expect(
      requestMock.mock.calls.filter(
        ([config]) => config.url === "/context-lab/generate-task",
      ),
    ).toHaveLength(0);
  }, 60_000);

  it("creates one configured custom task and navigates to its focused status", async () => {
    const user = userEvent.setup();
    const words = makeWordList(3);
    let resolveTask: ((value: unknown) => void) | undefined;
    requestMock.mockImplementation((config: { url?: string }) => {
      if (config.url === "/context-lab/generate-task") {
        return new Promise((resolve) => {
          resolveTask = resolve;
        });
      }
      return Promise.resolve({ list: words, total: 3, totalPages: 1 });
    });

    render(
      <MemoryRouter initialEntries={["/englishWorld/words"]}>
        <EnglishWorld />
        <LocationProbe />
      </MemoryRouter>,
    );

    await user.click(screen.getByText("卡片"));
    await screen.findByText("word-1");
    await user.click(screen.getByRole("button", { name: "批量管理" }));
    await user.click(screen.getByRole("button", { name: "全选当前页" }));
    await user.click(screen.getByRole("button", { name: "生成语境题" }));

    const dialog = screen.getByRole("dialog", { name: "生成语境练习" });
    expect(within(dialog).getByText("已选 3/20")).toBeInTheDocument();
    await user.click(within(dialog).getByText("GPT-5.6"));
    const band = within(dialog).getByRole("spinbutton", {
      name: "雅思分数等级",
    });
    await user.clear(band);
    await user.type(band, "7.5");
    await user.click(within(dialog).getByRole("button", { name: "开始生成" }));
    await user.click(within(dialog).getByRole("button", { name: "开始生成" }));

    await waitFor(() => {
      expect(
        requestMock.mock.calls.filter(
          ([config]) => config.url === "/context-lab/generate-task",
        ),
      ).toHaveLength(1);
    });
    expect(requestMock).toHaveBeenCalledWith({
      url: "/context-lab/generate-task",
      method: "POST",
      data: {
        sourceType: "custom",
        words: ["word-1", "word-2", "word-3"],
        ieltsBand: 7.5,
        modelProvider: "gpt",
      },
      __responseType: undefined,
    });

    resolveTask?.({
      id: 44,
      taskId: 44,
      status: "pending",
      sourceType: "custom",
      words: ["word-1", "word-2", "word-3"],
    });

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent(
        "/englishWorld/context-lab?source=word-library&taskId=44",
      );
    });
  });

  it("keeps the batch modal and configuration after task creation fails", async () => {
    const user = userEvent.setup();
    const errorSpy = vi
      .spyOn(message, "error")
      .mockImplementation(() => undefined as never);
    const words = makeWordList(3);
    requestMock.mockImplementation((config: { url?: string }) =>
      config.url === "/context-lab/generate-task"
        ? Promise.reject(new Error("AI 服务暂不可用"))
        : Promise.resolve({ list: words, total: 3, totalPages: 1 }),
    );

    render(
      <MemoryRouter initialEntries={["/englishWorld/words"]}>
        <EnglishWorld />
      </MemoryRouter>,
    );

    await user.click(screen.getByText("卡片"));
    await screen.findByText("word-1");
    await user.click(screen.getByRole("button", { name: "批量管理" }));
    await user.click(screen.getByRole("button", { name: "全选当前页" }));
    await user.click(screen.getByRole("button", { name: "生成语境题" }));
    const dialog = screen.getByRole("dialog", { name: "生成语境练习" });
    await user.click(within(dialog).getByText("GPT-5.6"));
    await user.click(within(dialog).getByRole("button", { name: "开始生成" }));

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith("AI 服务暂不可用");
    });
    expect(screen.getByRole("dialog", { name: "生成语境练习" })).toBeVisible();
    expect(screen.getByText("已选 3/20")).toBeInTheDocument();
    expect(screen.getByText("GPT-5.6").closest(".ant-segmented-item")).toHaveClass(
      "ant-segmented-item-selected",
    );
  });

  it("keeps the batch modal open when Escape is pressed during a failed creation", async () => {
    const user = userEvent.setup();
    const errorSpy = vi
      .spyOn(message, "error")
      .mockImplementation(() => undefined as never);
    const words = makeWordList(3);
    let rejectTask: ((reason?: unknown) => void) | undefined;
    requestMock.mockImplementation((config: { url?: string }) => {
      if (config.url === "/context-lab/generate-task") {
        return new Promise((_, reject) => {
          rejectTask = reject;
        });
      }
      return Promise.resolve({ list: words, total: 3, totalPages: 1 });
    });

    render(
      <MemoryRouter initialEntries={["/englishWorld/words"]}>
        <EnglishWorld />
      </MemoryRouter>,
    );

    await user.click(screen.getByText("卡片"));
    await screen.findByText("word-1");
    await user.click(screen.getByRole("button", { name: "批量管理" }));
    await user.click(screen.getByRole("button", { name: "全选当前页" }));
    await user.click(screen.getByRole("button", { name: "生成语境题" }));
    const dialog = screen.getByRole("dialog", { name: "生成语境练习" });
    await user.click(within(dialog).getByText("GPT-5.6"));
    await user.click(within(dialog).getByRole("button", { name: "开始生成" }));

    await waitFor(() => {
      expect(
        requestMock.mock.calls.filter(
          ([config]) => config.url === "/context-lab/generate-task",
        ),
      ).toHaveLength(1);
    });
    fireEvent.keyDown(dialog.parentElement as HTMLElement, {
      code: "Escape",
      key: "Escape",
      keyCode: 27,
    });
    rejectTask?.(new Error("AI 服务暂不可用"));

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith("AI 服务暂不可用");
    });
    expect(screen.getByRole("dialog", { name: "生成语境练习" })).toBeVisible();
    expect(screen.getByText("已选 3/20")).toBeInTheDocument();
    expect(screen.getByText("已选 3 项")).toBeInTheDocument();
    expect(screen.getByText("GPT-5.6").closest(".ant-segmented-item")).toHaveClass(
      "ant-segmented-item-selected",
    );
  });

  it("blocks context generation while a batch mastery update is in flight", async () => {
    const user = userEvent.setup();
    const words = makeWordList(3);
    let resolveLevelUpdate: (success: boolean) => void = () => undefined;
    const pendingLevelUpdate = new Promise<boolean>((resolve) => {
      resolveLevelUpdate = resolve;
    });
    requestMock.mockImplementation((config: { url?: string }) => {
      if (config.url === "/english/updateEnglishWordLevel") {
        return pendingLevelUpdate;
      }
      return Promise.resolve({ list: words, total: 3, totalPages: 1 });
    });

    render(
      <MemoryRouter initialEntries={["/englishWorld/words"]}>
        <EnglishWorld />
      </MemoryRouter>,
    );

    await user.click(screen.getByText("卡片"));
    await screen.findByText("word-1");
    await user.click(screen.getByRole("button", { name: "批量管理" }));
    await user.click(screen.getByRole("button", { name: "全选当前页" }));
    await user.click(screen.getByRole("button", { name: "批量设为精通" }));

    const generateButton = screen.getByRole("button", { name: "生成语境题" });
    expect(generateButton).toBeDisabled();
    await user.click(generateButton);
    expect(screen.queryByRole("dialog", { name: "生成语境练习" })).toBeNull();
    expect(
      requestMock.mock.calls.filter(
        ([config]) => config.url === "/context-lab/generate-task",
      ),
    ).toHaveLength(0);

    await act(async () => {
      resolveLevelUpdate(true);
    });
  });

  it("does not redirect or announce success when task creation resolves after navigation", async () => {
    const user = userEvent.setup();
    const successSpy = vi
      .spyOn(message, "success")
      .mockImplementation(() => undefined as never);
    const words = makeWordList(3);
    let resolveTask: (task: unknown) => void = () => undefined;
    const pendingTask = new Promise((resolve) => {
      resolveTask = resolve;
    });
    requestMock.mockImplementation((config: { url?: string }) => {
      if (config.url === "/context-lab/generate-task") return pendingTask;
      return Promise.resolve({ list: words, total: 3, totalPages: 1 });
    });

    render(
      <MemoryRouter initialEntries={["/englishWorld/words"]}>
        <EnglishWorld />
        <LocationProbe />
        <LeaveWordLibraryButton />
      </MemoryRouter>,
    );

    await user.click(screen.getByText("卡片"));
    await screen.findByText("word-1");
    await user.click(screen.getByRole("button", { name: "批量管理" }));
    await user.click(screen.getByRole("button", { name: "全选当前页" }));
    await user.click(screen.getByRole("button", { name: "生成语境题" }));
    await user.click(
      screen.getByRole("button", { name: "开始生成" }),
    );
    await waitFor(() => {
      expect(
        requestMock.mock.calls.filter(
          ([config]) => config.url === "/context-lab/generate-task",
        ),
      ).toHaveLength(1);
    });

    await user.click(screen.getByRole("button", { name: "离开词库" }));
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/englishWorld/stats",
    );

    await act(async () => {
      resolveTask({
        id: 50,
        taskId: 50,
        status: "pending",
        sourceType: "custom",
        words: ["word-1", "word-2", "word-3"],
      });
    });

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/englishWorld/stats",
    );
    expect(successSpy).not.toHaveBeenCalledWith("语境练习任务已提交");
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
