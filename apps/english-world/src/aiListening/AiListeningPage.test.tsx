import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("./audio", () => ({
  playListeningAudio: vi.fn(),
  stopListeningAudio: vi.fn(),
}));
vi.mock("./api", () => ({
  requestUid: () => "uid-test",
  listeningFetch: vi.fn(),
}));
import { listeningFetch } from "./api";
import { playListeningAudio } from "./audio";
import AiListeningPage from "./AiListeningPage";
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("reviews selected words then hides answer text in listening phase", async () => {
  let current = {
    id: "s1",
    status: "review",
    words: [
      {
        id: 1,
        word: "postpone",
        meaning: "推迟",
        validation: { status: "valid", reason: "通过" },
      },
    ],
    questions: [],
    createdAt: "2026-10-22",
  };
  vi.mocked(listeningFetch).mockImplementation(async (path) => {
    if (path === "/english/filterWordList")
      return {
        list: [{ id: 1, englishWord: "postpone", englishChinese: "推迟" }],
        total: 1,
      };
    if (path === "/ai-learning/history")
      return { sessions: [], reviewWordIds: [] };
    if (path.endsWith("/ready"))
      current = {
        ...current,
        status: "listening",
        words: [],
        questions: [
          {
            id: "q1",
            wordId: 1,
            scene: "改期",
            gap: "We must ______ it.",
            status: "ready",
            played: 0,
            slow: 0,
            revealed: false,
          },
        ] as never[],
      };
    return current;
  });
  render(
    <MemoryRouter initialEntries={["/englishWorld/ai-listening?wordIds=1"]}>
      <AiListeningPage />
    </MemoryRouter>,
  );
  await userEvent.click(
    await screen.findByRole("button", { name: "开始复习" }),
  );
  expect(await screen.findByRole("heading", { name: "看词复习" })).toBeTruthy();
  await userEvent.click(
    screen.getByRole("button", { name: "看完了，生成场景" }),
  );
  await screen.findByText("We must ______ it.");
  expect(screen.queryByText("postpone")).toBeNull();
  expect(
    (screen.getByRole("button", { name: "提交" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(listeningFetch).toHaveBeenCalledWith(
    "/ai-learning/sessions",
    {
      wordIds: [1],
      requestUid: "uid-test",
    },
    expect.any(AbortSignal),
  );
});
it("restores session without creating a paid request", async () => {
  vi.mocked(listeningFetch).mockImplementation(async (path) =>
    path === "/ai-learning/history"
      ? { sessions: [], reviewWordIds: [] }
      : path === "/english/filterWordList"
        ? { list: [], total: 0 }
        : {
            id: "existing",
            status: "listening",
            words: [],
            questions: [],
            createdAt: "2026-10-22",
          },
  );
  render(
    <MemoryRouter initialEntries={["/mobile/ai-listening?sessionId=existing"]}>
      <AiListeningPage />
    </MemoryRouter>,
  );
  await waitFor(() =>
    expect(listeningFetch).toHaveBeenCalledWith(
      "/ai-learning/sessions/existing",
      undefined,
      expect.any(AbortSignal),
    ),
  );
  expect(
    vi
      .mocked(listeningFetch)
      .mock.calls.some(([p, b]) => p === "/ai-learning/sessions" && b),
  ).toBe(false);
});
it("keeps unvalidated words readable but forbids scene creation", async () => {
  vi.mocked(listeningFetch).mockImplementation(async (path) =>
    path === "/ai-learning/history"
      ? { sessions: [], reviewWordIds: [] }
      : path === "/english/filterWordList"
        ? { list: [], total: 0 }
        : {
            id: "pending",
            status: "review",
            words: [{ id: 2, word: "record", meaning: "记录" }],
            questions: [],
            createdAt: "2026-10-22",
          },
  );
  render(
    <MemoryRouter initialEntries={["/mobile/ai-listening?sessionId=pending"]}>
      <AiListeningPage />
    </MemoryRouter>,
  );
  await screen.findByText("record");
  expect(screen.getByText(/尚未校验/)).toBeTruthy();
  expect(
    (
      screen.getByRole("button", {
        name: "看完了，生成场景",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
});
it("shows attempts without replacing first feedback and supports retry input", async () => {
  vi.mocked(listeningFetch).mockImplementation(async (path) =>
    path === "/ai-learning/history"
      ? { sessions: [], reviewWordIds: [] }
      : path === "/english/filterWordList"
        ? { list: [], total: 0 }
        : {
            id: "s",
            status: "completed",
            words: [],
            questions: [
              {
                id: "q",
                wordId: 1,
                scene: "场景",
                gap: "Please ______.",
                status: "submitted",
                played: 1,
                audioMode: "dual",
                feedback: {
                  userAnswer: "recod",
                  answer: "record",
                  correct: false,
                  independent: false,
                  transcript: "Please record.",
                  explanation: "检查拼写",
                  synonyms: "",
                },
                attempts: [
                  {
                    sequence: 2,
                    answer: "record",
                    correct: true,
                    played: 2,
                    slow: 1,
                    revealed: false,
                  },
                ],
              },
            ],
            createdAt: "2026-10-22",
          },
  );
  render(
    <MemoryRouter initialEntries={["/mobile/ai-listening?sessionId=s"]}>
      <AiListeningPage />
    </MemoryRouter>,
  );
  await screen.findByText(/双声对话/);
  expect(screen.getByText(/首次答案/)).toBeTruthy();
  expect(screen.getByText(/第 2 次/)).toBeTruthy();
  await userEvent.click(screen.getByRole("button", { name: "再练本题" }));
  expect(screen.getByRole("textbox", { name: "场景 1 答案" })).toBeTruthy();
});
it("ignores session load that returns after page unmount", async () => {
  let resolve!: (value: unknown) => void;
  vi.mocked(listeningFetch).mockImplementation(async (path) =>
    path.includes("/sessions/")
      ? new Promise((r) => {
          resolve = r;
        })
      : path.includes("history")
        ? { sessions: [], reviewWordIds: [] }
        : { list: [], total: 0 },
  );
  const view = render(
    <MemoryRouter initialEntries={["/mobile/ai-listening?sessionId=old"]}>
      <AiListeningPage />
    </MemoryRouter>,
  );
  view.unmount();
  resolve({ id: "old", status: "review", words: [], questions: [] });
  await Promise.resolve();
  expect(screen.queryByText("看词复习")).toBeNull();
});
it("hides Chinese context until requested and offers an icon play control", async () => {
  vi.mocked(listeningFetch).mockImplementation(async (path) =>
    path === "/ai-learning/history"
      ? { sessions: [], reviewWordIds: [] }
      : path === "/english/filterWordList"
        ? { list: [], total: 0 }
        : {
            id: "hint",
            status: "listening",
            words: [],
            createdAt: "2026-10-22",
            questions: [
              {
                id: "q",
                wordId: 1,
                scene: "水壶里有很多水垢",
                gap: "The ______ of the water.",
                status: "ready",
                played: 0,
              },
            ],
          },
  );
  render(
    <MemoryRouter
      initialEntries={["/englishWorld/ai-listening?sessionId=hint"]}
    >
      <AiListeningPage />
    </MemoryRouter>,
  );
  await screen.findByText("The ______ of the water.");
  expect(screen.queryByText("水壶里有很多水垢")).toBeNull();
  const play = screen.getByRole("button", { name: "播放完整句子" });
  expect(play.textContent).toBe("");
  await userEvent.click(play);
  const options = vi.mocked(playListeningAudio).mock.calls.slice(-1)[0]![1]!;
  expect(screen.getByRole("button", {name:"正在准备音频"}).getAttribute("aria-busy")).toBe("true");
  expect(screen.queryByText("正在准备音频，请稍候…")).toBeNull();
  act(() => options.onStateChange?.("playing"));
  expect(screen.getByRole("button", {name:"正在播放，点击停止"})).toBeTruthy();
  act(() => options.onStateChange?.("idle"));
  expect(screen.getByRole("button", {name:"播放完整句子"})).toBeTruthy();
  await userEvent.click(screen.getByRole("button", { name: "查看中文提示" }));
  expect(screen.getByText("水壶里有很多水垢")).toBeTruthy();
  await userEvent.click(screen.getByRole("button", { name: "隐藏中文提示" }));
  expect(screen.queryByText("水壶里有很多水垢")).toBeNull();
});
it("treats quota failure as unavailable validation, including legacy sessions, without suggesting word edits", async () => {
  const reason = "今日AI用量已达上限，请明天再试";
  vi.mocked(listeningFetch).mockImplementation(async (path) =>
    path.endsWith("/history")
      ? { sessions: [], reviewWordIds: [] }
      : path.includes("filterWordList")
        ? { list: [], total: 0 }
        : {
            id: "quota",
            status: "review",
            error: reason,
            words: [
              {
                id: 1,
                word: "hard",
                meaning: "硬的",
                validation: { status: "uncertain", reason },
              },
            ],
            questions: [],
            createdAt: "2026-10-22",
          },
  );
  render(
    <MemoryRouter
      initialEntries={["/englishWorld/ai-listening?sessionId=quota"]}
    >
      <AiListeningPage />
    </MemoryRouter>,
  );
  await screen.findByText("hard");
  expect(screen.getByText("校验服务暂不可用")).toBeTruthy();
  expect(screen.queryByText("! 词条需要确认")).toBeNull();
  expect(
    screen.queryByRole("link", { name: "前往词库修改，再重新校验" }),
  ).toBeNull();
  expect(
    (
      screen.getByRole("button", {
        name: "看完了，生成场景",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
});
