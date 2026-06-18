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

  it("renders the AI learning cockpit with all three MVP pillars", () => {
    render(
      <MemoryRouter>
        <LearningCockpitPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("AI Learning Cockpit")).toBeInTheDocument();
    expect(screen.getByText("今日 AI 任务")).toBeInTheDocument();
    expect(screen.getByText("AI 语境实验室")).toBeInTheDocument();
    expect(screen.getByText("记忆地图")).toBeInTheDocument();
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

    render(
      <MemoryRouter initialEntries={["/englishWorld"]}>
        <LearningCockpitPage />
        <LocationProbe />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("今日行动清单")).toBeInTheDocument();

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
});
