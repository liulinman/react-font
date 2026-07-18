import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryMapPage } from "./MemoryMapPage";

const { requestMock } = vi.hoisted(() => ({
  requestMock: vi.fn(),
}));

vi.mock("@font/api", () => ({
  default: (requestConfig: unknown) => requestMock(requestConfig),
  getApiBaseUrl: () => "/api",
}));

function LocationProbe() {
  const location = useLocation();
  return (
    <div data-testid="location">
      {location.pathname}
      {location.search}
      {location.hash}
    </div>
  );
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("MemoryMapPage", () => {
  afterEach(() => {
    cleanup();
    requestMock.mockReset();
  });

  it("turns the memory map into a weak-word workspace with actions", async () => {
    requestMock.mockImplementation((requestConfig: { url: string }) => {
      if (requestConfig.url === "/memory-map/overview") {
        return Promise.resolve({
          levels: [
            { level: 0, count: 2 },
            { level: 1, count: 1 },
            { level: 2, count: 0 },
            { level: 3, count: 0 },
          ],
          dueWords: [],
          weakWords: [
            {
              id: 1,
              word: "vibe",
              meaning: "氛围",
              phonetic: "/vaɪb/",
              level: 0,
              journey: {
                wordId: 1,
                stage: "needs_review",
                label: "待巩固",
                reason: "最近一次独立回忆未通过，先用短语境修复这个词。",
                suggestedTiming: "现在修复",
                nextAction: {
                  type: "context",
                  label: "进入语境修复",
                  description: "先在短语境里重新建立词义和用法联系。",
                },
                evidence: [],
              },
            },
            {
              id: 2,
              word: "flush",
              meaning: "冲洗",
              phonetic: "/flʌʃ/",
              level: 1,
              journey: {
                wordId: 2,
                stage: "repairing",
                label: "修复中",
                reason: "答错后已在语境中通过，还需要一次间隔后的独立回忆。",
                suggestedTiming: "至少间隔 8 小时后复查",
                nextAction: {
                  type: "review",
                  label: "安排间隔复查",
                  description: "换一个时段再独立答一次，确认不是短时记忆。",
                },
                evidence: [
                  {
                    type: "context_passed",
                    title: "语境中已通过",
                    detail: "目标词对应题目已答对，这是一条语境理解证据。",
                    occurredAt: "2026-07-18T09:00:00.000Z",
                  },
                  {
                    type: "recall_wrong",
                    title: "中译英未通过",
                    detail: "本次没有答对，阶段会以这条最新事实为准。",
                    occurredAt: "2026-07-18T08:00:00.000Z",
                  },
                ],
              },
            },
          ],
          recentMistakes: [
            {
              wordId: 1,
              word: "vibe",
              meaning: "氛围",
              mistakeCount: 2,
              cluster: "low-mastery",
            },
          ],
          streakLikeStats: { recentSessions: 3, recentAccuracy: 62 },
        });
      }

      if (requestConfig.url === "/memory-map/word-detail") {
        return Promise.resolve({
          id: 2,
          word: "flush",
          meaning: "冲洗",
          phonetic: "/flʌʃ/",
          level: 1,
          journey: {
            wordId: 2,
            stage: "repairing",
            label: "修复中",
            reason: "答错后已在语境中通过，还需要一次间隔后的独立回忆。",
            suggestedTiming: "至少间隔 8 小时后复查",
            nextAction: {
              type: "review",
              label: "安排间隔复查",
              description: "换一个时段再独立答一次，确认不是短时记忆。",
            },
            evidence: [
              {
                type: "context_passed",
                title: "语境中已通过",
                detail: "目标词对应题目已答对，这是一条语境理解证据。",
                occurredAt: "2026-07-18T09:00:00.000Z",
              },
            ],
          },
        });
      }

      return Promise.resolve(true);
    });

    render(
      <MemoryRouter>
        <MemoryMapPage />
        <LocationProbe />
      </MemoryRouter>,
    );

    expect(await screen.findByText("弱词队列")).toBeInTheDocument();
    expect(screen.getByText("当前词详情")).toBeInTheDocument();
    expect(screen.getByText("行动中心")).toBeInTheDocument();
    expect(screen.getAllByText("vibe").length).toBeGreaterThan(0);
    expect(screen.getAllByText("/vaɪb/").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("播放英式发音").length).toBeGreaterThan(0);

    const flushSelector = screen.getByRole("button", {
      name: "查看 flush 的掌握轨迹",
    });
    flushSelector.focus();
    await userEvent.keyboard("{Enter}");

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith({
        url: "/memory-map/word-detail",
        method: "POST",
        data: { wordId: 2 },
        __responseType: undefined,
      });
    });
    expect(
      within(screen.getByLabelText("当前词详情")).getByText(/冲洗/),
    ).toBeInTheDocument();
    expect(
      within(screen.getByLabelText("当前词详情")).getByText("/flʌʃ/"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("修复中").length).toBeGreaterThan(0);
    expect(
      screen.getByText("答错后已在语境中通过，还需要一次间隔后的独立回忆。"),
    ).toBeInTheDocument();
    expect(screen.getByText("语境中已通过")).toBeInTheDocument();
    expect(screen.getByText("至少间隔 8 小时后复查")).toBeInTheDocument();

    expect(screen.queryByText(/Please flush/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "AI 生成例句" }));

    const examplePanel = screen.getByLabelText("AI 例句练习");
    expect(
      within(examplePanel).getByText(
        "Please flush the glass with clean water before using it.",
      ),
    ).toBeInTheDocument();
    expect(
      within(examplePanel).getByRole("button", { name: "播放例句发音" }),
    ).toBeInTheDocument();
    expect(within(examplePanel).queryByText("使用前，请用清水冲洗这个杯子。"))
      .not.toBeInTheDocument();

    await userEvent.click(within(examplePanel).getByRole("button", { name: "查看翻译" }));
    expect(
      within(examplePanel).getByText("使用前，请用清水冲洗这个杯子。"),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "AI 生成例句" }));
    expect(
      within(examplePanel).getByText("A quick flush cleared the dust from the pipe."),
    ).toBeInTheDocument();
    expect(
      within(examplePanel).queryByText("快速冲洗一下就把管道里的灰尘清掉了。"),
    ).not.toBeInTheDocument();
    expect(
      within(examplePanel).queryByText(
        "Please flush the glass with clean water before using it.",
      ),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole("button", { name: /标记为已掌握/ }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: /安排间隔复查/ }),
    );
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/englishWorld/recite?source=repair",
    );
    expect(screen.getByTestId("location")).toHaveTextContent("wordIds=2");
  });

  it("opens context repair with the selected word when that is the next action", async () => {
    requestMock.mockResolvedValue({
      levels: [{ level: 0, count: 1 }],
      dueWords: [],
      weakWords: [
        {
          id: 1,
          word: "vibe",
          meaning: "氛围",
          level: 0,
          journey: {
            wordId: 1,
            stage: "needs_review",
            label: "待巩固",
            reason: "最近一次独立回忆未通过，先用短语境修复这个词。",
            suggestedTiming: "现在修复",
            nextAction: {
              type: "context",
              label: "进入语境修复",
              description: "先在短语境里重新建立词义和用法联系。",
            },
            evidence: [],
          },
        },
      ],
      recentMistakes: [],
      streakLikeStats: { recentSessions: 1, recentAccuracy: 0 },
    });

    render(
      <MemoryRouter>
        <MemoryMapPage />
        <LocationProbe />
      </MemoryRouter>,
    );

    await userEvent.click(
      await screen.findByRole("button", { name: /进入语境修复/ }),
    );

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/englishWorld/context-lab?source=cockpit&words=vibe",
    );
  });

  it("does not show an inactive voluntary-review action while evidence is loading", () => {
    requestMock.mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <MemoryMapPage />
      </MemoryRouter>,
    );

    expect(
      screen.queryByRole("button", { name: /仍要复习这个词/ }),
    ).not.toBeInTheDocument();
  });

  it("keeps the newest word selected when detail requests finish out of order", async () => {
    const flushDetail = createDeferred<Record<string, unknown>>();
    const vibeDetail = createDeferred<Record<string, unknown>>();
    requestMock.mockImplementation(
      (requestConfig: { url: string; data?: { wordId?: number } }) => {
        if (requestConfig.url === "/memory-map/overview") {
          return Promise.resolve({
            levels: [{ level: 0, count: 2 }],
            dueWords: [],
            weakWords: [
              { id: 1, word: "vibe", meaning: "氛围", level: 0 },
              { id: 2, word: "flush", meaning: "冲洗", level: 0 },
            ],
            recentMistakes: [],
            streakLikeStats: { recentSessions: 0, recentAccuracy: 0 },
          });
        }
        return requestConfig.data?.wordId === 2
          ? flushDetail.promise
          : vibeDetail.promise;
      },
    );

    render(
      <MemoryRouter>
        <MemoryMapPage />
      </MemoryRouter>,
    );

    await userEvent.click(
      await screen.findByRole("button", {
        name: "查看 flush 的掌握轨迹",
      }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "查看 vibe 的掌握轨迹" }),
    );

    vibeDetail.resolve({ id: 1, word: "vibe", meaning: "最新选择", level: 0 });
    expect(await screen.findByText(/最新选择/)).toBeInTheDocument();

    flushDetail.resolve({ id: 2, word: "flush", meaning: "旧请求", level: 0 });
    await waitFor(() => {
      expect(screen.queryByText(/旧请求/)).not.toBeInTheDocument();
    });
  });

  it("returns to the real word library path instead of the legacy list hash", async () => {
    requestMock.mockResolvedValue({
      levels: [
        { level: 0, count: 0 },
        { level: 1, count: 0 },
        { level: 2, count: 0 },
        { level: 3, count: 0 },
      ],
      dueWords: [],
      weakWords: [],
      recentMistakes: [],
      streakLikeStats: { recentSessions: 0, recentAccuracy: 0 },
    });

    render(
      <MemoryRouter initialEntries={["/englishWorld/memory-map"]}>
        <MemoryMapPage />
        <LocationProbe />
      </MemoryRouter>,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /返回单词列表/ }),
    );

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/englishWorld/words",
    );
    expect(screen.getByTestId("location")).not.toHaveTextContent("#list");
  });
});
