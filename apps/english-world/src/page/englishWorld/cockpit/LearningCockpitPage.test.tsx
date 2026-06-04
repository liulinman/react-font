import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LearningCockpitPage } from "./LearningCockpitPage";

const requestMock = vi.fn<(requestConfig: unknown) => Promise<never>>(() =>
  Promise.reject(new Error("offline")),
);

vi.mock("@font/api", () => ({
  default: (requestConfig: unknown) => requestMock(requestConfig),
  getApiBaseUrl: () => "/api",
}));

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
});
