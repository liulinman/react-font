import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
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
      return (
        <div data-testid="word-table">
          {columns.map((column, index) =>
            typeof column.title === "string" ? (
              <span key={`${column.title}-${index}`}>{column.title}</span>
            ) : null,
          )}
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
  });

  it("renders the word library when pathname is /englishWorld/words", () => {
    render(
      <MemoryRouter initialEntries={["/englishWorld/words"]}>
        <EnglishWorld />
      </MemoryRouter>,
    );

    expect(screen.getByText("词库管理")).toBeInTheDocument();
    expect(
      screen.getByText("保留筛选字段、表格列和添加/编辑单词字段"),
    ).toBeInTheDocument();
    expect(screen.getByText("时间范围")).toBeInTheDocument();
    expect(screen.getByText("中文名")).toBeInTheDocument();
    expect(screen.getByText("英文名")).toBeInTheDocument();
    expect(screen.getAllByText("音标").length).toBeGreaterThan(0);
    expect(screen.getAllByText("类型").length).toBeGreaterThan(0);
    expect(screen.getAllByText("掌握程度").length).toBeGreaterThan(0);
    expect(screen.queryByText("Mock Cockpit")).not.toBeInTheDocument();
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

    expect(screen.getByText("词库管理")).toBeInTheDocument();

    cleanup();

    render(
      <MemoryRouter initialEntries={["/englishWorld#stat"]}>
        <EnglishWorld />
      </MemoryRouter>,
    );

    expect(screen.getByText("Mock Stats")).toBeInTheDocument();
  });
});
