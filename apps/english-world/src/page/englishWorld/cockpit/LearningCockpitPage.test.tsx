import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import { LearningCockpitPage } from "./LearningCockpitPage";

const requestMock = vi.fn<(requestConfig: unknown) => Promise<never>>(() =>
  Promise.reject(new Error("offline")),
);

vi.mock("@font/api", () => ({
  default: (requestConfig: unknown) => requestMock(requestConfig),
  getApiBaseUrl: () => "/api",
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

describe("LearningCockpitPage", () => {
  afterEach(() => {
    cleanup();
    requestMock.mockClear();
  });

  it("renders the AI learning cockpit with all three MVP pillars", async () => {
    requestMock.mockImplementation((requestConfig: unknown) => {
      const config = requestConfig as { url?: string };
      if (config.url === "/daily-coach/summary") {
        return Promise.resolve({
          totalWords: 2,
          todayNewWords: 0,
          reciteAccuracy: 50,
          levelDistribution: [],
          weakWords: [],
          suggestedActions: [],
        } as never);
      }
      if (config.url === "/memory-map/overview") {
        return Promise.resolve({
          levels: [],
          dueWords: [],
          weakWords: [],
          recentMistakes: [],
          streakLikeStats: { recentSessions: 0, recentAccuracy: 0 },
        } as never);
      }
      return Promise.reject(new Error("offline"));
    });

    render(
      <MemoryRouter>
        <LearningCockpitPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("AI Learning Cockpit")).toBeInTheDocument();
    expect(await screen.findByText("今日 AI 任务")).toBeInTheDocument();
    expect(await screen.findByText("AI 语境实验室")).toBeInTheDocument();
    expect(await screen.findByText("记忆地图")).toBeInTheDocument();
  });

  it("requests cockpit data from the learning API contracts", () => {
    render(
      <MemoryRouter>
        <LearningCockpitPage />
      </MemoryRouter>,
    );

    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({ url: "/daily-coach/summary" }),
    );
    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({ url: "/memory-map/overview" }),
    );
  });

  it("opens a plan review with the weak word ids from the daily action", async () => {
    const user = userEvent.setup();
    requestMock.mockImplementation((requestConfig: unknown) => {
      const config = requestConfig as { url?: string };
      if (config.url === "/daily-coach/summary") {
        return Promise.resolve({
          totalWords: 4,
          todayNewWords: 1,
          reciteAccuracy: 75,
          levelDistribution: [{ level: 0, count: 2 }],
          weakWords: [
            { id: 1, word: "fragile", level: 0 },
            { id: 2, word: "resilient", level: 1 },
            { id: 3, word: "recover", level: 0 },
            { id: 4, word: "steady", level: 1 },
          ],
          suggestedActions: [
            {
              type: "review",
              title: "定向复习",
              description: "用当前薄弱词做一轮复习",
              wordIds: [1, 2, 3, 4],
              estimatedMinutes: 6,
            },
          ],
        } as never);
      }
      if (config.url === "/memory-map/overview") {
        return Promise.resolve({
          levels: [],
          dueWords: [],
          weakWords: [],
          recentMistakes: [],
          streakLikeStats: { recentSessions: 0, recentAccuracy: 0 },
        } as never);
      }
      return Promise.reject(new Error("offline"));
    });

    render(
      <MemoryRouter initialEntries={["/englishWorld"]}>
        <LearningCockpitPage />
        <LocationProbe />
      </MemoryRouter>,
    );

    expect(await screen.findByLabelText("今日行动清单")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /定向复习/ }));

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/englishWorld/recite",
    );
    expect(screen.getByTestId("location")).toHaveTextContent("wordIds=1%2C2%2C3%2C4");
  });

  it("falls back to the normal review route when a review action has no words", async () => {
    const user = userEvent.setup();
    requestMock.mockImplementation((requestConfig: unknown) => {
      const config = requestConfig as { url?: string };
      if (config.url === "/daily-coach/summary") {
        return Promise.resolve({
          totalWords: 1,
          todayNewWords: 0,
          reciteAccuracy: 80,
          levelDistribution: [{ level: 1, count: 1 }],
          weakWords: [],
          suggestedActions: [
            {
              type: "review",
              title: "按配置复习",
              description: "没有指定词时走普通复习",
              estimatedMinutes: 3,
            },
          ],
        } as never);
      }
      return Promise.reject(new Error("offline"));
    });

    render(
      <MemoryRouter initialEntries={["/englishWorld"]}>
        <LearningCockpitPage />
        <LocationProbe />
      </MemoryRouter>,
    );

    await screen.findByText("按配置复习");
    await user.click(screen.getByRole("button", { name: /定向复习/ }));

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/englishWorld/recite",
    );
    expect(screen.getByTestId("location")).not.toHaveTextContent("wordIds=");
  });

  it("opens Context Lab with weak words from the daily context action", async () => {
    const user = userEvent.setup();
    requestMock.mockImplementation((requestConfig: unknown) => {
      const config = requestConfig as { url?: string };
      if (config.url === "/daily-coach/summary") {
        return Promise.resolve({
          totalWords: 2,
          todayNewWords: 0,
          reciteAccuracy: 50,
          levelDistribution: [],
          weakWords: [
            { id: 1, word: "fragile", level: 0 },
            { id: 2, word: "resilient", level: 1 },
          ],
          suggestedActions: [
            {
              type: "context",
              title: "进入语境练习",
              description: "用薄弱词生成练习",
              wordIds: [1, 2],
              estimatedMinutes: 8,
            },
          ],
        } as never);
      }
      if (config.url === "/memory-map/overview") {
        return Promise.resolve({
          levels: [],
          dueWords: [],
          weakWords: [],
          recentMistakes: [],
          streakLikeStats: { recentSessions: 0, recentAccuracy: 0 },
        } as never);
      }
      return Promise.reject(new Error("offline"));
    });

    render(
      <MemoryRouter initialEntries={["/englishWorld"]}>
        <LearningCockpitPage />
        <LocationProbe />
      </MemoryRouter>,
    );

    await screen.findByRole("button", { name: "进入练习" });

    await user.click(screen.getByRole("button", { name: "进入练习" }));

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/englishWorld/context-lab?source=cockpit&words=fragile%2Cresilient",
    );
  });

  it("shows a retryable unavailable state instead of demo metrics when coach loading fails", async () => {
    const user = userEvent.setup();
    requestMock.mockImplementation((requestConfig: unknown) => {
      const config = requestConfig as { url?: string };
      if (config.url === "/daily-coach/summary") {
        return Promise.reject(new Error("network down"));
      }
      if (config.url === "/memory-map/overview") {
        return Promise.resolve({
          levels: [],
          dueWords: [],
          weakWords: [],
          recentMistakes: [],
          streakLikeStats: { recentSessions: 0, recentAccuracy: 0 },
        } as never);
      }
      return Promise.reject(new Error("offline"));
    });

    render(
      <MemoryRouter initialEntries={["/englishWorld"]}>
        <LearningCockpitPage />
        <LocationProbe />
      </MemoryRouter>,
    );

    expect(await screen.findByText("今日任务暂不可用")).toBeInTheDocument();
    expect(screen.queryByText("Day 8 streak")).not.toBeInTheDocument();
    expect(screen.queryByText("词库总量")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "生成练习包" })).toBeInTheDocument();
    const openLibraryButtons = screen.getAllByRole("button", {
      name: "打开词库",
    });
    const statsButtons = screen.getAllByRole("button", { name: /看统计/ });
    expect(openLibraryButtons.length).toBeGreaterThan(0);
    expect(statsButtons.length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "开始今日复习" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "生成练习包" }));
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/englishWorld/context-lab",
    );
    expect(screen.getByTestId("location")).not.toHaveTextContent("words=");

    await user.click(openLibraryButtons[0]);
    expect(screen.getByTestId("location")).toHaveTextContent("/englishWorld/words");

    await user.click(statsButtons[0]);
    expect(screen.getByTestId("location")).toHaveTextContent("/englishWorld/stats");

    await user.click(screen.getByRole("button", { name: "开始今日复习" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/englishWorld/recite");
  });

  it("shows a memory unavailable card instead of demo memory stats when memory loading fails", async () => {
    requestMock.mockImplementation((requestConfig: unknown) => {
      const config = requestConfig as { url?: string };
      if (config.url === "/daily-coach/summary") {
        return Promise.resolve({
          totalWords: 4,
          todayNewWords: 1,
          reciteAccuracy: 75,
          levelDistribution: [{ level: 0, count: 2 }],
          weakWords: [],
          suggestedActions: [],
        } as never);
      }
      if (config.url === "/memory-map/overview") {
        return Promise.reject(new Error("memory down"));
      }
      return Promise.reject(new Error("offline"));
    });

    render(
      <MemoryRouter>
        <LearningCockpitPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("记忆地图暂不可用")).toBeInTheDocument();
    expect(screen.queryByText("掌握路径")).not.toBeInTheDocument();
    expect(screen.queryByText("weak")).not.toBeInTheDocument();
  });
});
