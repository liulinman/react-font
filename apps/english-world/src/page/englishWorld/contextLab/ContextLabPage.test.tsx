import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContextLabPage } from "./ContextLabPage";
import { buildContextLabGenerateParams } from "./contextLabPlanning";

const { requestMock, startMock } = vi.hoisted(() => ({
  requestMock: vi.fn(),
  startMock: vi.fn(),
}));

vi.mock("@font/api", () => ({
  default: (requestConfig: unknown) => requestMock(requestConfig),
  getApiBaseUrl: () => "/api",
}));

vi.mock("../shared/hooks/useSseStream", () => ({
  useSseStream: () => ({
    loading: false,
    start: startMock,
    abort: vi.fn(),
  }),
}));

describe("ContextLabPage", () => {
  afterEach(() => {
    cleanup();
    requestMock.mockReset();
    startMock.mockReset();
  });

  it("lets the user choose weak words, random words, or custom words", () => {
    render(<ContextLabPage />);

    expect(screen.getByText("今日薄弱词")).toBeInTheDocument();
    expect(screen.getByText("随机词")).toBeInTheDocument();
    expect(screen.getByText("手输词")).toBeInTheDocument();
  });

  it("builds the weak word source as a proficiency request", () => {
    expect(
      buildContextLabGenerateParams({
        sourceMode: "weak",
        count: 8,
        customWords: "",
      }),
    ).toEqual({
      sourceType: "proficiency",
      proficiencyLevels: [0, 1],
      count: 8,
    });
  });

  it("splits custom words by spaces and commas", () => {
    expect(
      buildContextLabGenerateParams({
        sourceMode: "custom",
        count: 8,
        customWords: "resilient, recover，fragile steady",
      }),
    ).toEqual({
      sourceType: "custom",
      words: ["resilient", "recover", "fragile", "steady"],
    });
  });

  it("starts context generation with the context lab endpoint and weak-word body", async () => {
    render(<ContextLabPage />);

    await userEvent.click(screen.getByRole("button", { name: /生成练习包/ }));

    expect(startMock).toHaveBeenCalledWith(
      "/api/context-lab/generate",
      {
        sourceType: "proficiency",
        proficiencyLevels: [0, 1],
        count: 8,
      },
      expect.objectContaining({
        onChunk: expect.any(Function),
        onDone: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
  });

  it("submits generated question answers through the context lab submit contract", async () => {
    requestMock.mockResolvedValue({
      results: [
        {
          questionId: "q1",
          correct: true,
          correctIndex: 0,
          userSelectedIndex: 0,
          explanation: "ok",
        },
      ],
    });
    startMock.mockImplementation((_url, _body, handlers) => {
      handlers.onDone({
        sessionId: 12,
        article: "A short practice article.",
        words: ["resilient"],
        questions: [
          {
            id: "q1",
            stem: "What does resilient mean?",
            options: ["able to recover", "easy to break"],
          },
        ],
      });
    });

    render(<ContextLabPage />);

    await userEvent.click(screen.getByRole("button", { name: /生成练习包/ }));
    await userEvent.click(screen.getByText("able to recover"));
    await userEvent.click(screen.getByRole("button", { name: "提交练习" }));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith({
        url: "/context-lab/submit",
        method: "POST",
        data: {
          sessionId: 12,
          answers: [{ questionId: "q1", selectedIndex: 0 }],
        },
        __responseType: undefined,
      });
    });
  });
});
