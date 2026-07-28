import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import { IeltsCoreReviewPage } from "./IeltsCoreReviewPage";

const requestMock = vi.fn();

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

vi.mock("@font/api", () => ({
  default: (requestConfig: unknown) => requestMock(requestConfig),
}));

describe("IeltsCoreReviewPage", () => {
  beforeEach(() => {
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
    requestMock.mockReset();
  });

  it("loads IELTS core candidates and creates a Context Lab task", async () => {
    const user = userEvent.setup();
    requestMock.mockImplementation((config) => {
      if (config.url === "/english/ieltsCoreReview") {
        return Promise.resolve({
          sourceType: "ielts-core",
          selectedLevels: [0, 1],
          count: 8,
          totalMatched: 3,
          vocabulary: {
            totalActive: 120,
            lastCollectedAt: "2026-07-25T03:00:00.000Z",
            sourceWindow: "2023-2026",
          },
          candidates: [
            {
              id: 1,
              word: "mitigate",
              meaning: "减轻",
              level: 1,
              coreBand: "core",
              coreScore: 70,
              reviewScore: 98,
              matchedTopics: ["environment"],
              reason: "IELTS environment 高频核心词，当前标记为一般。",
            },
            {
              id: 2,
              word: "habitat",
              level: 0,
              coreBand: "high",
              coreScore: 55,
              reviewScore: 90,
              matchedTopics: ["environment"],
              reason: "环境类阅读高价值词，适合复习。",
            },
            {
              id: 3,
              word: "evidence",
              level: 1,
              coreBand: "core",
              coreScore: 70,
              reviewScore: 98,
              matchedTopics: ["research"],
              reason: "论证类阅读高频词，适合语境巩固。",
            },
          ],
        });
      }
      if (config.url === "/context-lab/generate-task") {
        return Promise.resolve({
          taskId: 31,
          status: "pending",
          sourceType: "ielts-core",
          words: ["mitigate", "habitat", "evidence"],
        });
      }
      if (config.url === "/english/ieltsCoreVocabulary/list") {
        return Promise.resolve({
          page: 1,
          pageSize: 10,
          total: 1,
          list: [
            {
              word: "mitigate",
              translation: "缓解",
              definition: "make something less severe",
              band: "core",
              importanceScore: 96,
              examFrequencyScore: 89,
              topics: ["environment", "public policy"],
              sourceWindow: "2023-2026",
              sourceType: "ai-manual",
              collectedAt: "2026-07-25T03:00:00.000Z",
              lastSeenAt: "2026-07-25T03:05:00.000Z",
              sourceRefs: [
                {
                  sourceType: "official-ielts",
                  title: "IELTS Academic Reading test format",
                  publisher: "IELTS.org",
                  url: "https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-reading",
                  evidenceNote:
                    "Academic Reading uses books, journals, magazines, newspapers and online resources.",
                  verificationStatus: "format_reference",
                },
                {
                  sourceType: "newspaper",
                  title: "Climate policy coverage pattern",
                  publisher: "Public news corpus",
                  evidenceNote:
                    "AI selected this as a recurring public-news source pattern.",
                  verificationStatus: "ai_suggested",
                },
              ],
            },
          ],
        });
      }
      return Promise.resolve({});
    });

    render(
      <MemoryRouter initialEntries={["/englishWorld/ielts-core"]}>
        <IeltsCoreReviewPage />
        <LocationProbe />
      </MemoryRouter>,
    );

    expect((await screen.findAllByText("mitigate")).length).toBeGreaterThan(0);
    expect(screen.queryByText("IELTS Core Review")).not.toBeInTheDocument();
    expect(screen.queryByText("Filter")).not.toBeInTheDocument();
    expect(screen.queryByText("Queue")).not.toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /词库来源/ }));
    expect(await screen.findByText("Climate policy coverage pattern")).toBeInTheDocument();
    expect(screen.queryByText("Vocabulary Audit")).not.toBeInTheDocument();
    expect(screen.getByText("公共报刊")).toBeInTheDocument();
    expect(screen.getByText("AI 建议")).toBeInTheDocument();
    expect(screen.getByText(/词库 120 个/)).toBeInTheDocument();
    expect(screen.getByText("IELTS environment 高频核心词，当前标记为一般。")).toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledWith({
      url: "/english/ieltsCoreReview",
      method: "POST",
      data: {
            proficiencyLevels: [0, 1],
            count: 8,
            useAi: true,
          },
      __responseType: undefined,
    });

    await user.click(screen.getByRole("tab", { name: /复习生成/ }));
    await user.click(screen.getByRole("button", { name: /生成练习包/ }));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith({
        url: "/context-lab/generate-task",
        method: "POST",
        data: {
          sourceType: "ielts-core",
          proficiencyLevels: [0, 1],
          count: 8,
        },
        __responseType: undefined,
      });
    });
    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent(
        "/englishWorld/context-lab",
      );
    });
  });

  it("paginates the vocabulary source audit list", async () => {
    const user = userEvent.setup();
    requestMock.mockImplementation((config) => {
      if (config.url === "/english/ieltsCoreVocabulary/list") {
        const page = config.data?.page ?? 1;
        return Promise.resolve({
          page,
          pageSize: 10,
          total: 18,
          list: [
            {
              word: page === 1 ? "mitigate" : "innovation",
              translation: page === 1 ? "缓解" : "创新",
              definition: "A high-value IELTS academic word.",
              band: page === 1 ? "core" : "high",
              importanceScore: 90,
              examFrequencyScore: 85,
              topics: page === 1 ? ["environment"] : ["technology"],
              sourceWindow: "2023-2026",
              sourceType: "ai-manual",
              collectedAt: "2026-07-25T03:00:00.000Z",
              lastSeenAt: "2026-07-25T03:05:00.000Z",
              sourceRefs: [
                {
                  sourceType: page === 1 ? "journal" : "recent-event",
                  title:
                    page === 1
                      ? "Environmental research source pattern"
                      : "Recent technology event pattern",
                  verificationStatus: "ai_suggested",
                },
              ],
            },
          ],
        });
      }
      return Promise.resolve({
        sourceType: "ielts-core",
        selectedLevels: [0, 1],
        count: 8,
        totalMatched: 0,
        vocabulary: {
          totalActive: 18,
          lastCollectedAt: "2026-07-25T03:05:00.000Z",
          sourceWindow: "2023-2026",
        },
        candidates: [],
      });
    });

    render(
      <MemoryRouter>
        <IeltsCoreReviewPage />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("tab", { name: /词库来源/ }));
    expect(await screen.findByText("Environmental research source pattern")).toBeInTheDocument();
    expect(screen.getByText("共 18 个词条")).toBeInTheDocument();

    await user.click(screen.getByTitle("2"));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith({
        url: "/english/ieltsCoreVocabulary/list",
        method: "POST",
        data: {
          page: 2,
          pageSize: 10,
        },
        __responseType: undefined,
      });
    });
    expect(await screen.findByText("Recent technology event pattern")).toBeInTheDocument();
  });

  it("does not allow practice generation with fewer than three candidates", async () => {
    requestMock.mockResolvedValue({
      sourceType: "ielts-core",
      selectedLevels: [0, 1],
      count: 8,
      totalMatched: 2,
      vocabulary: {
        totalActive: 120,
        lastCollectedAt: null,
        sourceWindow: "2023-2026",
      },
      candidates: [
        {
          id: 1,
          word: "mitigate",
          level: 1,
          coreBand: "core",
          coreScore: 70,
          reviewScore: 98,
          matchedTopics: ["environment"],
          reason: "核心词。",
        },
      ],
    });
    requestMock.mockImplementation((config) => {
      if (config.url === "/english/ieltsCoreVocabulary/list") {
        return Promise.resolve({ page: 1, pageSize: 8, total: 0, list: [] });
      }
      return Promise.resolve({
        sourceType: "ielts-core",
        selectedLevels: [0, 1],
        count: 8,
        totalMatched: 2,
        vocabulary: {
          totalActive: 120,
          lastCollectedAt: null,
          sourceWindow: "2023-2026",
        },
        candidates: [
          {
            id: 1,
            word: "mitigate",
            level: 1,
            coreBand: "core",
            coreScore: 70,
            reviewScore: 98,
            matchedTopics: ["environment"],
            reason: "核心词。",
          },
        ],
      });
    });

    render(
      <MemoryRouter>
        <IeltsCoreReviewPage />
      </MemoryRouter>,
    );

    expect((await screen.findAllByText("mitigate")).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /生成练习包/ })).toBeDisabled();
  });

  it("manually refreshes the dynamic IELTS vocabulary and reloads the queue", async () => {
    const user = userEvent.setup();
    requestMock.mockImplementation((config) => {
      if (config.url === "/english/ieltsCoreVocabulary/refresh") {
        return Promise.resolve({
          sourceType: "ai-manual",
          requested: 120,
          received: 120,
          inserted: 14,
          updated: 6,
          skippedInvalid: 0,
          totalActive: 134,
          sourceWindow: "2023-2026",
          message: "IELTS 核心词库已更新：新增 14，更新 6。",
        });
      }
      if (config.url === "/english/ieltsCoreVocabulary/list") {
        return Promise.resolve({
          page: 1,
          pageSize: 10,
          total: 1,
          list: [
            {
              word: "mitigate",
              band: "core",
              importanceScore: 96,
              examFrequencyScore: 88,
              topics: ["environment"],
              sourceWindow: "2023-2026",
              sourceType: "ai-manual",
              sourceRefs: [
                {
                  sourceType: "topic-cluster",
                  title: "Environment topic cluster",
                  verificationStatus: "ai_suggested",
                },
              ],
            },
          ],
        });
      }
      return Promise.resolve({
        sourceType: "ielts-core",
        selectedLevels: [0, 1],
        count: 8,
        totalMatched: 3,
        vocabulary: {
          totalActive: config.url === "/english/ieltsCoreReview" && requestMock.mock.calls.length > 1 ? 134 : 120,
          lastCollectedAt: "2026-07-25T03:05:00.000Z",
          sourceWindow: "2023-2026",
        },
        candidates: [
          {
            id: 1,
            word: "mitigate",
            level: 1,
            coreBand: "core",
            coreScore: 96,
            examFrequencyScore: 88,
            reviewScore: 142,
            matchedTopics: ["environment"],
            reason: "环境类核心词。",
          },
          {
            id: 2,
            word: "habitat",
            level: 0,
            coreBand: "high",
            coreScore: 80,
            reviewScore: 129,
            matchedTopics: ["environment"],
            reason: "生态类高频词。",
          },
          {
            id: 3,
            word: "evidence",
            level: 1,
            coreBand: "core",
            coreScore: 96,
            reviewScore: 142,
            matchedTopics: ["research"],
            reason: "论证类高频词。",
          },
        ],
      });
    });

    render(
      <MemoryRouter>
        <IeltsCoreReviewPage />
      </MemoryRouter>,
    );

    expect((await screen.findAllByText("mitigate")).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: /更新核心词库/ }));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith({
        url: "/english/ieltsCoreVocabulary/refresh",
        method: "POST",
        data: { limit: 120 },
        __responseType: undefined,
      });
    });
    expect((await screen.findAllByText(/新增 14/)).length).toBeGreaterThan(0);
    expect(screen.getByText(/词库 134 个/)).toBeInTheDocument();
  });
});
