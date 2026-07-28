import "antd-mobile/es/global";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import request from "@font/api";
import EnglishWorldMobile from "./EnglishWorldMobile";

vi.mock("@font/api", () => ({
  default: vi.fn(() =>
    Promise.resolve({
      list: [],
      total: 0,
      totalPages: 0,
    }),
  ),
  useMutation: () => ({
    mutateAsync: vi.fn(() =>
      Promise.resolve({
        levelCount: 0,
        percentage: 0,
        totalCount: 0,
        dailyStats: [],
        partSpeechStatisticalClass: {},
      }),
    ),
    isPending: false,
  }),
}));

vi.mock("echarts-for-react", () => ({
  default: () => <div data-testid="mock-chart" />,
}));

vi.mock("react-photo-view", () => ({
  PhotoProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  PhotoView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("./WordAgentTabMobile", () => ({
  WordAgentTabMobile: () => <div>Mock Word Agent</div>,
}));

vi.mock("./ExerciseAgentTabMobile", () => ({
  ExerciseAgentTabMobile: () => <div>Mock Exercise Agent</div>,
}));

describe("EnglishWorldMobile ToC entry", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("默认首屏围绕今日学习和今日复习，而不是单词管理后台", () => {
    render(
      <MemoryRouter>
        <EnglishWorldMobile />
      </MemoryRouter>,
    );

    expect(document.querySelector(".adm-nav-bar-title")).toHaveTextContent(
      "今日学习",
    );
    expect(screen.getByText("今日复习")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "开始今日复习" }),
    ).toBeInTheDocument();
    expect(document.querySelector(".mobile-study-card-title")).toHaveTextContent(
      "词库",
    );
    expect(screen.queryByText("单词管理")).not.toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
  });

  it("switches the primary mobile destination from the persistent tab bar", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <EnglishWorldMobile />
      </MemoryRouter>,
    );

    expect(screen.getByRole("tab", { name: "今日学习" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "词库" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "统计" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "工具" })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "词库" }));

    expect(screen.getByPlaceholderText("搜索单词或中文")).toBeInTheDocument();
  });

  it("opens mobile Context Lab from the home context card", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <EnglishWorldMobile />
      </MemoryRouter>,
    );

    await user.click(screen.getByText("语境练习"));

    expect(await screen.findByText("Context Lab")).toBeInTheDocument();
    expect(screen.getByText("Mock Exercise Agent")).toBeInTheDocument();
  });
});
