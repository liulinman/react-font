import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { EnglishStats } from "./EnglishStats";

const { statsMock } = vi.hoisted(() => ({ statsMock: vi.fn() }));

vi.mock("@font/api", () => ({
  useMutation: () => ({ mutateAsync: statsMock }),
}));

vi.mock("echarts-for-react", () => ({
  default: ({ option }: { option: { series?: unknown[] } }) => (
    <div data-testid="chart">{option.series?.length ?? 0}</div>
  ),
}));

describe("EnglishStats", () => {
  beforeAll(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    cleanup();
    statsMock.mockReset();
  });

  it("shows a deliberate empty state instead of empty charts", async () => {
    statsMock.mockResolvedValue({
      levelCount: 0,
      percentage: 0,
      totalCount: 0,
      dailyStats: [],
      partSpeechStatisticalClass: {},
    });

    render(
      <MemoryRouter>
        <EnglishStats />
      </MemoryRouter>,
    );

    expect(await screen.findByText("还没有学习数据")).toBeInTheDocument();
    expect(screen.queryByText("每日新增单词")).not.toBeInTheDocument();
    expect(screen.queryByTestId("chart")).not.toBeInTheDocument();
  });

  it("keeps the summary and charts when learning data exists", async () => {
    statsMock.mockResolvedValue({
      levelCount: 1,
      percentage: 50,
      totalCount: 2,
      dailyStats: [{ date: "2026-07-15", count: 2 }],
      partSpeechStatisticalClass: { 1: 2 },
    });

    render(
      <MemoryRouter>
        <EnglishStats />
      </MemoryRouter>,
    );

    expect(await screen.findByText("每日新增单词")).toBeInTheDocument();
    expect(screen.getByText("词性分布")).toBeInTheDocument();
    expect(screen.getAllByTestId("chart")).toHaveLength(2);
  });
});
