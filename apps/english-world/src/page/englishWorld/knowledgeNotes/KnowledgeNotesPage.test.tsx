import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KnowledgeNotesPage } from "./KnowledgeNotesPage";
const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }));
vi.mock("@font/api", () => ({ default: requestMock }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: 1 } }),
}));
const note = {
  id: 7,
  title: "形式宾语",
  body: "第一行\n第二行",
  category: "句型",
  examples: "I find it easy to read.",
  source: "第1课",
  words: [],
  version: 1,
  createdAt: "2026-10-10",
  updatedAt: "2026-10-10",
};
let queryClient: QueryClient;
function setup(path = "/englishWorld/knowledge-notes") {
  const router = createMemoryRouter(
    [
      {
        path: "/englishWorld/knowledge-notes/*",
        element: <KnowledgeNotesPage />,
      },
      { path: "/away", element: <p>away</p> },
    ],
    { initialEntries: [path] },
  );
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}
beforeEach(() => {
  requestMock.mockImplementation(async ({ url, method }) => {
    if (url.endsWith("/words")) return [];
    if (method === "GET" && url.endsWith("/7")) return note;
    if (method === "GET")
      return { list: [note], total: 1, page: 1, pageSize: 20 };
    return note;
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
describe("Knowledge notes", () => {
  it("creates without selecting a word and opens the saved detail", async () => {
    setup("/englishWorld/knowledge-notes/new");
    fireEvent.change(await screen.findByLabelText("标题"), {
      target: { value: "形式宾语" },
    });
    fireEvent.change(screen.getByLabelText("正文"), {
      target: { value: "第一行\n第二行" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await screen.findByRole("heading", { name: "形式宾语" });
    const call = requestMock.mock.calls.find(([r]) => r.method === "POST")?.[0];
    expect(call.data).toMatchObject({
      title: "形式宾语",
      body: "第一行\n第二行",
      wordIds: [],
    });
    expect(call.data.requestId).toMatch(/^[a-f0-9-]{36}$/i);
  });
  it("retains input and request identity after a failed save", async () => {
    requestMock
      .mockRejectedValueOnce(new Error("网络中断"))
      .mockResolvedValue(note);
    setup("/englishWorld/knowledge-notes/new");
    fireEvent.change(await screen.findByLabelText("标题"), {
      target: { value: "我的笔记" },
    });
    fireEvent.change(screen.getByLabelText("正文"), {
      target: { value: "内容保留" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await screen.findByRole("alert");
    expect(screen.getByLabelText("正文")).toHaveValue("内容保留");
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await screen.findByRole("heading", { name: "形式宾语" });
    const calls = requestMock.mock.calls.filter(([r]) => r.method === "POST");
    expect(calls[0][0].data.requestId).toBe(calls[1][0].data.requestId);
  });
  it("copies full saved word notes and source without mutating the word", async () => {
    requestMock.mockResolvedValueOnce({
      id: 9,
      englishWord: "find",
      englishNote: "长笔记\n第二行",
      englishReference: "课程",
    });
    setup("/englishWorld/knowledge-notes/new?copyWord=9");
    await waitFor(() =>
      expect(screen.getByLabelText("正文")).toHaveValue("长笔记\n第二行"),
    );
    expect(screen.getByLabelText("来源")).toHaveValue("课程");
    expect(screen.getByLabelText("标题")).toHaveValue("");
    expect(requestMock.mock.calls.every(([r]) => r.method === "GET")).toBe(
      true,
    );
  });
  it("searches with category and resets the page", async () => {
    setup("/englishWorld/knowledge-notes?page=3");
    await screen.findByText("形式宾语");
    fireEvent.change(screen.getByLabelText("搜索知识笔记"), {
      target: { value: "例句" },
    });
    fireEvent.change(screen.getByLabelText("筛选分类"), {
      target: { value: "句型" },
    });
    fireEvent.click(screen.getByRole("button", { name: "搜索" }));
    await waitFor(() =>
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            q: "例句",
            category: "句型",
            page: 1,
          }),
        }),
      ),
    );
  });
  it("uses the original edit version after a background refresh", async () => {
    setup("/englishWorld/knowledge-notes/7/edit");
    fireEvent.change(await screen.findByLabelText("正文"), {
      target: { value: "我的未保存修改" },
    });
    await act(async () => {
      queryClient.setQueryData(["knowledge-notes", 1, "detail", 7], {
        ...note,
        version: 2,
        body: "另一设备修改",
      });
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() =>
      expect(
        requestMock.mock.calls.find(([r]) => r.method === "PUT")?.[0].data,
      ).toMatchObject({ version: 1, body: "我的未保存修改" }),
    );
  });
  it("keeps a dirty editor mounted when a background refresh fails", async () => {
    setup("/englishWorld/knowledge-notes/7/edit");
    fireEvent.change(await screen.findByLabelText("正文"), {
      target: { value: "不能丢失" },
    });
    requestMock.mockRejectedValue(new Error("temporary network error"));
    await act(async () => {
      await queryClient.invalidateQueries({
        queryKey: ["knowledge-notes", 1, "detail", 7],
      });
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(screen.getByLabelText("正文")).toHaveValue("不能丢失");
  });
  it("blocks navigation with unsaved changes and can continue editing", async () => {
    const router = setup("/englishWorld/knowledge-notes/new");
    fireEvent.change(await screen.findByLabelText("正文"), {
      target: { value: "未保存" },
    });
    fireEvent.click(screen.getByRole("link", { name: "返回列表" }));
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getByRole("button", { name: "继续编辑" }));
    expect(screen.getByLabelText("正文")).toHaveValue("未保存");
    expect(router.state.location.pathname).toContain("/new");
  });
});
