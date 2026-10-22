import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { WordBookCreate } from "./WordBookCreate";
import { BookContent } from "./BookContent";
import { booksApi } from "./api";
vi.mock("antd", () => ({
  Modal: ({
    children,
    title,
  }: {
    children: React.ReactNode;
    title: string;
  }) => (
    <div role="dialog" aria-label={title}>
      {children}
    </div>
  ),
}));
vi.mock("./api", () => ({
  bookError: (e: Error) => e.message,
  booksApi: {
    currentJob: vi.fn().mockResolvedValue(null),
    counts: vi.fn(),
    preview: vi.fn(),
    create: vi.fn(),
  },
}));
const words = [
  {
    id: 1,
    englishWord: "abandon",
    englishChinese: "放弃",
    englishNote: "注意宾语。完整原笔记",
    keyPoints: ["注意宾语。"],
  },
  { id: 2, englishWord: "persist", englishChinese: "坚持", keyPoints: [] },
];
const groups = [
  { id: "g1", title: "放弃与坚持", wordIds: [1, 2] },
  { id: "g2", title: "其他词汇", wordIds: [] },
];
beforeEach(() => {
  vi.mocked(booksApi.currentJob).mockResolvedValue(null);
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
describe("复习册制作", () => {
  it("全部范围忽略筛选；保存用户改名和移动后的分组", async () => {
    vi.mocked(booksApi.counts).mockResolvedValue({
      selected: 1,
      filtered: 2,
      all: 8,
    });
    vi.mocked(booksApi.preview).mockResolvedValue({
      previewId: "p",
      wordCount: 2,
      words,
      groups,
      scope: "all",
      mode: "organized",
    });
    vi.mocked(booksApi.create).mockResolvedValue({ id: "saved" } as never);
    const done = vi.fn();
    render(
      <MemoryRouter>
        <WordBookCreate
          ids={[1]}
          filters={{ englishLevel: 0 }}
          onClose={() => {}}
          onCreated={done}
        />
      </MemoryRouter>,
    );
    await screen.findByText("全部单词");
    fireEvent.click(screen.getByLabelText(/全部单词/));
    fireEvent.click(screen.getByRole("button", { name: "整理并预览" }));
    await screen.findByLabelText("小节 1 名称");
    expect(booksApi.preview).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: "all",
        expectedCount: 8,
        mode: "organized",
      }),
      expect.any(AbortSignal),
    );
    fireEvent.change(screen.getByLabelText("小节 1 名称"), {
      target: { value: "我的专题" },
    });
    fireEvent.change(screen.getByLabelText("abandon 的归属"), {
      target: { value: "g2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存并阅读" }));
    await waitFor(() => expect(done).toHaveBeenCalledWith("saved"));
    expect(booksApi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        groups: expect.arrayContaining([
          expect.objectContaining({
            id: "g1",
            title: "我的专题",
            wordIds: [2],
          }),
          expect.objectContaining({ id: "g2", wordIds: [1] }),
        ]),
      }),
    );
  });
  it("整理失败不自动降级，用户可主动选择基础速览", async () => {
    vi.mocked(booksApi.counts).mockResolvedValue({
      selected: 0,
      filtered: 2,
      all: 2,
    });
    vi.mocked(booksApi.preview).mockRejectedValue(
      new Error("整理服务暂不可用"),
    );
    render(
      <MemoryRouter>
        <WordBookCreate onClose={() => {}} onCreated={() => {}} />
      </MemoryRouter>,
    );
    await screen.findByText(/全部单词/);
    await waitFor(() =>
      expect(
        screen
          .getByRole("button", { name: "整理并预览" })
          .hasAttribute("disabled"),
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: "整理并预览" }));
    await screen.findByText("整理服务暂不可用");
    expect(booksApi.preview).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "改用基础速览" })).toBeTruthy();
  });
});
it("讲义完整显示选词及原文追溯，不显示填空练习或执行笔记 HTML", () => {
  render(
    <BookContent
      title="复习册"
      groups={groups.slice(0, 1)}
      words={[
        { ...words[0], englishNote: "<script>alert(1)</script>" },
        words[1],
      ]}
    />,
  );
  expect(screen.getByText("abandon")).toBeTruthy();
  expect(screen.getByText("persist")).toBeTruthy();
  expect(screen.queryByText("快速回顾")).toBeNull();
  expect(screen.getAllByText("查看原笔记与来源")).toHaveLength(1);
  expect(document.querySelector("script")).toBeNull();
});

it("已保存任务恢复直接打开原册，不重复保存", async () => {
  vi.mocked(booksApi.counts).mockResolvedValue({
    selected: 0,
    filtered: 2,
    all: 2,
  });
  vi.mocked(booksApi.currentJob).mockResolvedValue({
    jobId: "job",
    status: "ready",
    savedBookId: "original",
  });
  const done = vi.fn();
  render(<WordBookCreate onClose={() => {}} onCreated={done} />);
  fireEvent.click(await screen.findByRole("button", { name: "查看上次整理" }));
  expect(done).toHaveBeenCalledWith("original");
  expect(booksApi.create).not.toHaveBeenCalled();
});
it("大分组预览按50词分页，保存仍覆盖全部源词条", async () => {
  const many = Array.from({ length: 120 }, (_, i) => ({
    id: i + 1,
    englishWord: `word-${i}`,
    englishChinese: "释义",
    keyPoints: [],
  }));
  vi.mocked(booksApi.counts).mockResolvedValue({
    selected: 0,
    filtered: 120,
    all: 120,
  });
  vi.mocked(booksApi.preview).mockResolvedValue({
    previewId: "p",
    scope: "all",
    mode: "basic",
    wordCount: 120,
    words: many,
    groups: [{ id: "g", title: "速览", wordIds: many.map((w) => w.id) }],
  });
  const view = render(
    <WordBookCreate onClose={() => {}} onCreated={() => {}} />,
  );
  await waitFor(() =>
    expect(
      screen
        .getByRole("button", { name: "整理并预览" })
        .hasAttribute("disabled"),
    ).toBe(false),
  );
  fireEvent.click(screen.getByRole("button", { name: "整理并预览" }));
  await screen.findByLabelText("小节 1 名称");
  expect(view.container.querySelectorAll(".book-move")).toHaveLength(50);
  fireEvent.click(screen.getByRole("button", { name: "下一批词条" }));
  expect(screen.getAllByText("word-50").length).toBeGreaterThan(0);
});
