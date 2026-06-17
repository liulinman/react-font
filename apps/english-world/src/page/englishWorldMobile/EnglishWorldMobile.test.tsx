import "antd-mobile/es/global";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
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

    expect(screen.getByText("今日学习")).toBeInTheDocument();
    expect(screen.getByText("今日复习")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "开始今日复习" }),
    ).toBeInTheDocument();
    expect(screen.getByText("词库")).toBeInTheDocument();
    expect(screen.queryByText("单词管理")).not.toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
  });
});
