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
      {location.hash}
    </div>
  );
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
            { id: 1, word: "vibe", meaning: "氛围", phonetic: "/vaɪb/", level: 0 },
            { id: 2, word: "flush", meaning: "冲洗", phonetic: "/flʌʃ/", level: 1 },
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
        });
      }

      return Promise.resolve(true);
    });

    render(
      <MemoryRouter>
        <MemoryMapPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("弱词队列")).toBeInTheDocument();
    expect(screen.getByText("当前词详情")).toBeInTheDocument();
    expect(screen.getByText("行动中心")).toBeInTheDocument();
    expect(screen.getByText("vibe")).toBeInTheDocument();
    expect(screen.getByText("/vaɪb/")).toBeInTheDocument();
    expect(screen.getAllByLabelText("播放英式发音").length).toBeGreaterThan(0);

    await userEvent.click(screen.getByText("flush"));

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

    await userEvent.click(screen.getByRole("button", { name: /标记为已掌握/ }));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith({
        url: "/memory-map/update-level",
        method: "POST",
        data: { wordId: 2, level: 3 },
        __responseType: undefined,
      });
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
