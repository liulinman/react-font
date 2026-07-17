import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ConfigProvider } from "antd";
import { EnglishStats } from "./EnglishStats";

const { statsMock, chartOptions } = vi.hoisted(() => ({
  statsMock: vi.fn(),
  chartOptions: [] as Array<{
    series?: Array<{ itemStyle?: { color?: string } }>;
  }>,
}));

vi.mock("@font/api", () => ({
  useMutation: () => ({ mutateAsync: statsMock }),
}));

vi.mock("echarts-for-react", () => ({
  default: ({
    option,
  }: {
    option: { series?: Array<{ itemStyle?: { color?: string } }> };
  }) => {
    chartOptions.push(option);
    return <div data-testid="chart">{option.series?.length ?? 0}</div>;
  },
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
    chartOptions.length = 0;
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
      <ConfigProvider theme={{ token: { colorPrimary: "#6f4bf2" } }}>
        <MemoryRouter>
          <EnglishStats />
        </MemoryRouter>
      </ConfigProvider>,
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
      <ConfigProvider theme={{ token: { colorPrimary: "#6f4bf2" } }}>
        <MemoryRouter>
          <EnglishStats />
        </MemoryRouter>
      </ConfigProvider>,
    );

    expect(await screen.findByText("每日新增单词")).toBeInTheDocument();
    expect(screen.getByText("词性分布")).toBeInTheDocument();
    expect(screen.getAllByTestId("chart")).toHaveLength(2);
    expect(chartOptions[0]?.series?.[0]?.itemStyle?.color).toBe("#6f4bf2");
  });
});
