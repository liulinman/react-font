import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
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

  it("renders one primary learning route with a supporting memory summary", async () => {
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

    expect(screen.getByText("今天的学习重点")).toBeInTheDocument();
    expect(
      await screen.findByRole("region", { name: "学习概览" }),
    ).toBeInTheDocument();
    expect(document.querySelector(".learning-cockpit-stats")).not.toBeInTheDocument();
    expect(await screen.findByText("今天先做这一步")).toBeInTheDocument();
    expect(await screen.findByText("记忆地图")).toBeInTheDocument();
    expect(screen.queryByText("AI 语境实验室")).not.toBeInTheDocument();
    expect(screen.queryByText("常用工具")).not.toBeInTheDocument();
  });

  it("presents the cockpit as a route-first learning page", async () => {
    requestMock.mockImplementation((requestConfig: unknown) => {
      const config = requestConfig as { url?: string };
      if (config.url === "/daily-coach/summary") {
        return Promise.resolve({
          totalWords: 513,
          todayNewWords: 4,
          reciteAccuracy: 0,
          levelDistribution: [],
          weakWords: [
            { id: 1, word: "memorable", level: 0 },
            { id: 2, word: "gradient", level: 1 },
          ],
          suggestedActions: [
            {
              type: "review",
              title: "开始今日复习",
              description: "优先处理低掌握度单词，完成一轮短复习。",
              wordIds: [1, 2],
              estimatedMinutes: 4,
            },
            {
              type: "context",
              title: "进入语境练习",
              description: "把薄弱词放入短阅读和选择题里练一遍。",
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
    const { container } = render(
      <MemoryRouter>
        <LearningCockpitPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("今天先做这一步")).toBeInTheDocument();
    expect(await screen.findByText("今日重点")).toBeInTheDocument();
    expect(screen.queryByText("B. Context Lab")).not.toBeInTheDocument();
    expect(container.querySelector(".learning-cockpit-route-board")).toBeInTheDocument();
    expect(container.querySelector(".learning-cockpit-status-strip")).not.toBeInTheDocument();
    expect(container.querySelector(".learning-cockpit-support-rail")).toBeInTheDocument();
    expect(
      container.querySelector(".learning-cockpit-support-rail .learning-snapshot"),
    ).toBeInTheDocument();
    const route = screen.getByRole("list", { name: "今日行动清单" });
    expect(within(route).getByRole("button", { name: "定向复习" })).toHaveClass(
      "ant-btn-primary",
    );
    const contextAction = within(route).getByRole("button", {
      name: "进入练习",
    });
    expect(contextAction).toHaveClass("ant-btn-default");
    expect(contextAction.querySelector(".anticon-experiment")).toBeInTheDocument();
    expect(contextAction.querySelector(".anticon-arrow-right")).not.toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledTimes(2);
  });

  it("requests cockpit data from the learning API contracts", () => {
    render(
      <MemoryRouter>
        <LearningCockpitPage />
      </MemoryRouter>,
    );

    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/daily-coach/summary",
        data: {
          days: 7,
          timezoneOffsetMinutes: -new Date().getTimezoneOffset(),
        },
      }),
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

    const route = screen.getByRole("list", { name: "今日行动清单" });
    expect(route).toBeInTheDocument();
    expect(within(route).getAllByRole("listitem")).toHaveLength(1);
    expect(within(route).getByRole("listitem")).toHaveAttribute(
      "aria-current",
      "step",
    );

    await user.click(screen.getByRole("button", { name: "进入练习" }));

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/englishWorld/context-lab?source=cockpit&words=fragile%2Cresilient",
    );
  });

  it("opens Context Lab with the clicked context action word subset", async () => {
    const user = userEvent.setup();
    requestMock.mockImplementation((requestConfig: unknown) => {
      const config = requestConfig as { url?: string };
      if (config.url === "/daily-coach/summary") {
        return Promise.resolve({
          totalWords: 3,
          todayNewWords: 0,
          reciteAccuracy: 58,
          levelDistribution: [],
          weakWords: [
            { id: 1, word: "fragile", level: 0 },
            { id: 2, word: "resilient", level: 1 },
            { id: 3, word: "steady", level: 0 },
          ],
          suggestedActions: [
            {
              type: "context",
              title: "只练一个词",
              description: "用指定薄弱词生成练习",
              wordIds: [2],
              estimatedMinutes: 5,
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

    await screen.findByText("只练一个词");

    await user.click(screen.getByRole("button", { name: "进入练习" }));

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/englishWorld/context-lab?source=cockpit&words=resilient",
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
